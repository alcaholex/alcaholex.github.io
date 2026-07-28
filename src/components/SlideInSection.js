'use client'

import { useEffect, useRef, useState } from 'react'
import { useLenis } from './SmoothScroll'
import * as sfx from './sound'

// How still scrolling must be before a half-finished swipe resolves itself,
// and how long that resolving scroll takes.
const SNAP_IDLE_MS = 20
const SNAP_DURATION_S = 0.6
// Once the swipe has genuinely begun, it commits: crossing this much
// progress on the way in hands the rest of the sweep to an animated scroll
// IMMEDIATELY, mid-wheel, rather than waiting for the scroll to go quiet.
// The idle snap below uses the same threshold as its fallback decision, for
// the paths that cross while a finger is still down. A few percent rather
// than zero, so merely grazing the boundary and backing off does not hijack
// the page into a full section change.
const SNAP_FORWARD_THRESHOLD = 0.05

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
  // The chord this section's arrival plays: its navbar stop, derived from
  // the site's own id convention ('section-3' → stop index 2).
  const stopIndex = Math.max(0, (parseInt(id?.split('-')[1], 10) || 1) - 1)
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
    // For detecting the moment the swipe crosses the commit threshold on the
    // way IN — only an upward crossing commits, so scrolling back up through
    // a finished swipe cannot re-trigger it.
    let prevProgress = null
    let committing = false
    // Frosted-panel state for the child section's background. The glass is
    // mixed from var(--background) rather than a captured colour: the
    // sections are the page colour by design, and the live variable is what
    // keeps a pinned panel's frost correct through a theme switch — an
    // inline literal would go stale the moment the palette flips. (If a
    // section ever gets its own colour, it needs its own variable here.)
    const glass = { on: false, timer: null }

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

      // Anything still moving gets left alone: a scroll easing out, or a navbar
      // jump passing through on its way somewhere else. Waiting on scroll
      // events alone is not enough — once the idle gap is shorter than a frame
      // the timer fires between them, and snapping mid-flight would hijack a
      // navigation and strand it here. Re-armed rather than dropped so the
      // swipe still settles once everything has come to rest.
      if (lenisRef.current?.isScrolling) {
        idleTimer = setTimeout(snap, SNAP_IDLE_MS)
        return
      }

      const top = wrapper.getBoundingClientRect().top
      const p = (window.innerHeight - top) / window.innerHeight
      // Re-checked here because the swipe may have reached an end between the
      // timer being armed and firing.
      if (p <= 0 || p >= 1) return

      // Progress 1 leaves the wrapper's top at the viewport top; progress 0
      // leaves it a full viewport lower.
      const forward = p >= SNAP_FORWARD_THRESHOLD
      const target = window.scrollY + top - (forward ? 0 : window.innerHeight)

      // A landing that is already there needs no settle and no chord: a
      // navbar jump can come to rest a fraction of a pixel short of p=1,
      // which slips past the p >= 1 check above and would otherwise read
      // as a fresh forward commit — chord and all — for a scroll of half
      // a pixel.
      if (Math.abs(target - window.scrollY) < 2) return

      // Arriving (not retreating) plays this section's chord — this is the
      // commit path for touch drags, which the instant commit skips.
      if (forward) sfx.swipe(stopIndex)

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
          // No transition while swiping — a re-pin mid-fade must snap back to
          // glass instantly rather than animate against the scrub.
          sec.style.transition = 'none'
          sec.style.backgroundColor = `color-mix(in srgb, var(--background) ${GLASS_BG_STRENGTH}, transparent)`
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
          // The live variable again, so an arrival mid-theme-switch fades to
          // the palette the page is actually wearing.
          sec.style.backgroundColor = 'var(--background)'
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

      // The instant commit: the first time progress crosses the threshold on
      // the way in, hand the rest of the sweep to an animated scroll RIGHT
      // NOW — no waiting for the wheel to go quiet. lock swallows stray
      // wheel ticks during the handover so they cannot stutter it, and the
      // flag clears on a timer rather than onComplete so a hijacked commit
      // (say, a navbar jump mid-sweep) cannot wedge it shut forever.
      if (
        !committing &&
        !touching &&
        // A navbar navigation passing through this swipe region on its way
        // somewhere else is not a swipe — grabbing it here would strand the
        // jump (and play the wrong chord). Lenis carries the navbar's
        // userData tag for the whole travel.
        !lenisRef.current?.userData?.nav &&
        prevProgress !== null &&
        prevProgress <= SNAP_FORWARD_THRESHOLD &&
        progress > SNAP_FORWARD_THRESHOLD &&
        progress < 1
      ) {
        committing = true
        clearIdle()
        // The arrival chord rides the commit, swelling with the sweep.
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

      // The idle settle stays as the fallback for every path the instant
      // commit does not cover: touch drags that cross the threshold with the
      // finger still down, and stops mid-zone after an upward escape.
      if (!committing) scheduleSnap(progress)
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
