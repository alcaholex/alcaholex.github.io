'use client'

import { useEffect, useRef, useState } from 'react'
import { useLenis } from './SmoothScroll'
import * as sfx from './sound'

const SNAP_IDLE_MS = 20
const SNAP_DURATION_S = 0.6

const SNAP_FORWARD_THRESHOLD = 0.05

const GLASS_BG_STRENGTH = '50%'
const GLASS_FILTER = 'blur(4px) saturate(1.4)'

const GLASS_FADE_MS = 400

export default function SlideInSection({ id, from = 'right', children }) {
  const fromLeft = from === 'left'

  const stopIndex = Math.max(0, (parseInt(id?.split('-')[1], 10) || 1) - 1)
  const wrapperRef = useRef(null)
  const innerRef = useRef(null)
  const pinnedRef = useRef(false)

  const [pinned, setPinned] = useState(false)
  const [height, setHeight] = useState(null)

  const lenis = useLenis()
  const lenisRef = useRef(null)
  useEffect(() => {
    lenisRef.current = lenis
  }, [lenis])

  useEffect(() => {
    const inner = innerRef.current
    setHeight(inner.offsetHeight)
    const ro = new ResizeObserver(() => setHeight(inner.offsetHeight))
    ro.observe(inner)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let idleTimer = null
    let touching = false

    let prevProgress = null
    let committing = false

    const glass = { on: false, timer: null }

    const progressOf = () => {
      const wrapper = wrapperRef.current
      if (!wrapper) return 0
      return (window.innerHeight - wrapper.getBoundingClientRect().top) / window.innerHeight
    }

    const clearIdle = () => {
      clearTimeout(idleTimer)
      idleTimer = null
    }

    const snap = () => {
      idleTimer = null
      const wrapper = wrapperRef.current
      if (!wrapper || touching) return

      if (lenisRef.current?.isScrolling) {
        idleTimer = setTimeout(snap, SNAP_IDLE_MS)
        return
      }

      const top = wrapper.getBoundingClientRect().top
      const p = (window.innerHeight - top) / window.innerHeight

      if (p <= 0 || p >= 1) return

      const forward = p >= SNAP_FORWARD_THRESHOLD
      const target = window.scrollY + top - (forward ? 0 : window.innerHeight)

      // A navbar jump can rest a hair short of p=1; a sub-pixel settle must
      // not play a chord or scroll.
      if (Math.abs(target - window.scrollY) < 2) return

      if (forward) sfx.swipe(stopIndex)

      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, { duration: SNAP_DURATION_S })
      } else {
        window.scrollTo({ top: target, behavior: 'smooth' })
      }
    }

    const scheduleSnap = (p = progressOf()) => {
      clearIdle()
      if (touching || p <= 0 || p >= 1) return
      idleTimer = setTimeout(snap, SNAP_IDLE_MS)
    }

    const update = () => {
      const wrapper = wrapperRef.current
      const inner = innerRef.current
      if (!wrapper || !inner) return

      const progress =
        (window.innerHeight - wrapper.getBoundingClientRect().top) / window.innerHeight

      const isPinned = progress < 1
      if (isPinned !== pinnedRef.current) {
        pinnedRef.current = isPinned
        setPinned(isPinned)
      }

      if (isPinned) {
        const p = Math.max(0, progress)
        inner.style.transform = `translateX(${(fromLeft ? -1 : 1) * (1 - p) * 100}%)`

        inner.style.boxShadow = p > 0
          ? `${fromLeft ? '' : '-'}24px 0 48px rgba(0, 0, 0, 0.15)`
          : 'none'

        inner.style.visibility = p > 0 ? 'visible' : 'hidden'

        const sec = inner.firstElementChild
        if (sec && !glass.on) {
          glass.on = true
          clearTimeout(glass.timer)
          glass.timer = null

          sec.style.transition = 'none'
          // Mixed from the live variable, not a captured colour, so pinned
          // frost follows a theme switch.
          sec.style.backgroundColor = `color-mix(in srgb, var(--background) ${GLASS_BG_STRENGTH}, transparent)`
          sec.style.backdropFilter = GLASS_FILTER
          sec.style.setProperty('-webkit-backdrop-filter', GLASS_FILTER)
        }
      } else {
        inner.style.transform = ''
        inner.style.visibility = ''
        inner.style.boxShadow = ''

        const sec = inner.firstElementChild
        if (sec && glass.on) {
          glass.on = false
          sec.style.transition = `background-color ${GLASS_FADE_MS}ms ease, backdrop-filter ${GLASS_FADE_MS}ms ease, -webkit-backdrop-filter ${GLASS_FADE_MS}ms ease`

          sec.style.backgroundColor = 'var(--background)'

          sec.style.backdropFilter = 'blur(0px) saturate(1)'
          sec.style.setProperty('-webkit-backdrop-filter', 'blur(0px) saturate(1)')
          glass.timer = setTimeout(() => {
            glass.timer = null
            sec.style.transition = ''
            sec.style.backgroundColor = ''
            sec.style.backdropFilter = ''
            sec.style.removeProperty('-webkit-backdrop-filter')
          }, GLASS_FADE_MS + 50)
        }
      }

      if (
        !committing &&
        !touching &&
        // A navigation passing through this region is not a swipe to grab.
        !lenisRef.current?.userData?.nav &&
        prevProgress !== null &&
        prevProgress <= SNAP_FORWARD_THRESHOLD &&
        progress > SNAP_FORWARD_THRESHOLD &&
        progress < 1
      ) {
        committing = true
        clearIdle()

        sfx.swipe(stopIndex)
        const target = window.scrollY + wrapper.getBoundingClientRect().top
        if (lenisRef.current) {
          lenisRef.current.scrollTo(target, { duration: SNAP_DURATION_S, lock: true })
        } else {
          window.scrollTo({ top: target, behavior: 'smooth' })
        }
        setTimeout(() => {
          committing = false
        }, SNAP_DURATION_S * 1000 + 250)
      }
      prevProgress = progress

      if (!committing) scheduleSnap(progress)
    }

    const onTouchStart = () => {
      touching = true
      clearIdle()
    }
    const onTouchEnd = () => {
      touching = false
      scheduleSnap()
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      clearIdle()
      clearTimeout(glass.timer)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [fromLeft])

  return (
    <div
      ref={wrapperRef}
      id={id}
      data-navbar-theme="light"
      className="relative"
      style={{ height: height ?? undefined }}
    >

      <div ref={innerRef} className={pinned ? 'fixed inset-x-0 top-0 z-40 will-change-transform' : ''}>
        {children}
      </div>
    </div>
  )
}
