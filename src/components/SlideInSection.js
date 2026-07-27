'use client'

import { useEffect, useRef, useState } from 'react'
import { useLenis } from './SmoothScroll'

// How still scrolling must be before a half-finished swipe resolves itself,
// and how long that resolving scroll takes.
const SNAP_IDLE_MS = 20
const SNAP_DURATION_S = 0.6
// Past this much of the swipe an idle pause carries it the rest of the way in;
// before it, the section retreats back offscreen.
const SNAP_FORWARD_THRESHOLD = 0.5

// Mid-swipe the panel is frosted glass: its background drops to this strength
// over a backdrop blur (24px matches the navbar's backdrop-blur-xl), letting
// the section underneath read through it until the swipe completes.
const GLASS_BG_STRENGTH = '50%'
const GLASS_FILTER = 'blur(4px) saturate(1.4)'
// How long the arrival fade back to the section's own opaque colour takes.
const GLASS_FADE_MS = 400

// Swipes its child section in horizontally, from the right (default) or the
// left, driven by scroll.
// The wrapper div stays in normal flow and reserves the section's height — it
// also carries the section id, so navbar tracking, anchors and smooth-scroll
// targets keep working. While the wrapper's top (= the previous section's
// bottom) travels from the bottom to the top of the viewport, the content is
// pinned to the screen (fixed) and translated from 100% to 0. At progress 1
// the content's natural flow position is exactly the viewport top, so it
// hands off seamlessly to native scrolling through the rest of the section.
//
// If scrolling stops part way through the swipe, it settles to whichever end
// is nearer so the section is never left stranded mid-sweep.
//
// While mid-swipe the panel's background is frosted glass — semi-transparent
// over a backdrop blur — and fades back to its own opaque colour on arrival.
export default function SlideInSection({ id, from = 'right', children }) {
  const fromLeft = from === 'left'
  const wrapperRef = useRef(null)
  const innerRef = useRef(null)
  const pinnedRef = useRef(false)
  // Server markup renders unpinned (plain flow) so the page is complete
  // without JS; the first update pins sections that are still below.
  const [pinned, setPinned] = useState(false)
  const [height, setHeight] = useState(null)

  // Snapping goes through Lenis so it eases like every other scroll on the
  // page instead of fighting it. Kept in a ref because the scroll effect must
  // not re-run when the instance resolves from null after mount.
  const lenis = useLenis()
  const lenisRef = useRef(null)
  useEffect(() => {
    lenisRef.current = lenis
  }, [lenis])

  // The wrapper must keep holding the section's space while the content is
  // fixed, and follow content size changes (image loads, viewport resizes).
  // The initial synchronous measure lands in the same render as the first
  // pin, so the wrapper never collapses and shifts the page's scroll height.
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
    // Frosted-panel state for the child section's background. `base` is its
    // real colour, captured before the first inline override so the glass tint
    // and the arrival fade always land back on the class's own colour.
    const glass = { on: false, base: null, timer: null }

    // 0 while the wrapper's top sits at the viewport bottom, 1 once it
    // reaches the viewport top.
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

      const top = wrapper.getBoundingClientRect().top
      const p = (window.innerHeight - top) / window.innerHeight
      // Re-checked here because the swipe may have reached an end between the
      // timer being armed and firing.
      if (p <= 0 || p >= 1) return

      // Progress 1 leaves the wrapper's top at the viewport top; progress 0
      // leaves it a full viewport lower.
      const target =
        window.scrollY + top - (p < SNAP_FORWARD_THRESHOLD ? window.innerHeight : 0)

      // This scroll keeps firing scroll events, which re-arm the idle timer
      // every frame, so no snap can fire mid-animation. Once it settles the
      // section is at an end and the next snap returns above — and if the user
      // scrolls out of it, their own events take over the timer instead.
      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, { duration: SNAP_DURATION_S })
      } else {
        window.scrollTo({ top: target, behavior: 'smooth' })
      }
    }

    // Only a swipe genuinely part way through needs resolving; at either end
    // there is nothing to settle.
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

      // Frame-level styles are written imperatively so scrolling does not
      // trigger a React render per frame. Lenis fires native scroll events
      // every animation frame, so no extra rAF loop is needed.
      if (isPinned) {
        const p = Math.max(0, progress)
        inner.style.transform = `translateX(${(fromLeft ? -1 : 1) * (1 - p) * 100}%)`
        // Cast off the leading edge, so it falls on the section being covered:
        // that is the panel's right edge coming from the left, its left edge
        // coming from the right.
        inner.style.boxShadow = p > 0
          ? `${fromLeft ? '' : '-'}24px 0 48px rgba(0, 0, 0, 0.15)`
          : 'none'
        // Hidden until actually reached, so the edge shadow cannot bleed in
        // from offscreen while the section waits there.
        inner.style.visibility = p > 0 ? 'visible' : 'hidden'

        // Frost the panel for the whole sweep: the section's own background
        // drops to half strength over a backdrop blur, so the content it is
        // sweeping across shows through the glass. Set once per pin (guarded
        // by glass.on), not rewritten every frame.
        const sec = inner.firstElementChild
        if (sec && !glass.on) {
          glass.on = true
          clearTimeout(glass.timer)
          glass.timer = null
          if (!glass.base) glass.base = getComputedStyle(sec).backgroundColor
          // No transition while swiping — a re-pin mid-fade must snap back to
          // glass instantly rather than animate against the scrub.
          sec.style.transition = 'none'
          sec.style.backgroundColor = `color-mix(in srgb, ${glass.base} ${GLASS_BG_STRENGTH}, transparent)`
          sec.style.backdropFilter = GLASS_FILTER
          sec.style.setProperty('-webkit-backdrop-filter', GLASS_FILTER)
        }
      } else {
        inner.style.transform = ''
        inner.style.visibility = ''
        inner.style.boxShadow = ''

        // Arrival: fade from glass back to the section's own opaque colour,
        // then drop every override so the class styles own the element again.
        const sec = inner.firstElementChild
        if (sec && glass.on) {
          glass.on = false
          sec.style.transition = `background-color ${GLASS_FADE_MS}ms ease, backdrop-filter ${GLASS_FADE_MS}ms ease, -webkit-backdrop-filter ${GLASS_FADE_MS}ms ease`
          sec.style.backgroundColor = glass.base
          // Fade the blur out too rather than cutting it: once the colour is
          // opaque the filter is invisible anyway, so this only softens the
          // first frames of the fade.
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

      scheduleSnap(progress)
    }

    // A finger resting mid-drag is still holding the swipe, so snapping waits
    // for the touch to end rather than pulling against it. Lifting re-arms it
    // directly: a release with no momentum produces no further scroll events.
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
      {/* z-40 while pinned: above the sections (z-30) so it sweeps over the
          previous one, below the navbar (z-50). */}
      <div ref={innerRef} className={pinned ? 'fixed inset-x-0 top-0 z-40 will-change-transform' : ''}>
        {children}
      </div>
    </div>
  )
}
