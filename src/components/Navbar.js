'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLenis } from './SmoothScroll'

// The stops on the line, in the order you ride them. Everything lives on the
// home page: projects and art swipe in as scroll sections. Hashes let each link
// also work when landing from another route (e.g. the old /projects/ redirect):
// navigate home, then the pathname effect below scrolls to the section once it
// mounts.
const navItems = [
  { href: '/', label: 'home', scrollTo: 'section-1' },
  { href: '/#section-2', label: 'about', scrollTo: 'section-2' },
  { href: '/#section-3', label: 'projects', scrollTo: 'section-3' },
  { href: '/#section-4', label: 'art', scrollTo: 'section-4' },
]

// Height of the dot band the line runs through, and of the whole diagram once
// the names are sitting under it. Stations are spaced by --pitch, set on the
// container so it can widen at md without any of this needing to know.
const DOT_BAND = 12
const DIAGRAM_H = 32

// Masks for the blur band below. Each layer is fully opaque for its first
// stretch and then ramps out, so what fades is the blur itself rather than a
// visible edge.
const FADE_FULL = 'linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)'
const FADE_TOP = 'linear-gradient(to bottom, #000 0%, #000 25%, transparent 100%)'

// The route strip above a carriage door: the line you are riding, every stop on
// it, and a marker for the one you are at. It replaces the floating pill
// entirely — the pill had to be built twice over (a transparent set of hit
// targets inside the glass, and a mix-blend-difference copy of the labels at
// body level) because backdrop-filter and blending cannot share an element.
// Nothing here is glass and nothing needs to invert, so this is one layer, with
// the links themselves carrying the marks.
//
// Stations sit at exact multiples of the pitch rather than being spaced by
// their labels, which is what lets the line be two plain bars — one for the
// whole route, one growing over it — instead of a segment per gap.
export default function Navbar() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState('section-1')
  const isNavigating = useRef(false)
  const scrollTimeoutRef = useRef(null)

  // Kept in a ref so scroll handlers/effects can reach the current Lenis
  // instance without listing it as a dependency (it starts null, then resolves
  // once mounted).
  const lenis = useLenis()
  const lenisRef = useRef(null)
  useEffect(() => {
    lenisRef.current = lenis
  }, [lenis])

  // Smooth-scroll to a target (element or offset) through Lenis, falling back to
  // the native API if Lenis has not mounted yet.
  const smoothScrollTo = useCallback((target, options) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, options)
    } else if (typeof target !== 'number') {
      target.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo(0, target)
    }
  }, [])

  const isItemActive = useCallback(
    (item) => activeSection === item.scrollTo && pathname === '/',
    [activeSection, pathname]
  )

  const handleNavClick = (e, item) => {
    // A mouse click leaves the link focused, and focus-within is what holds the
    // names open — so without this the strip stays expanded long after the
    // pointer has left, until something else happens to take focus. Dropped
    // only for pointer clicks: `detail` is the click count, and it is 0 when
    // the click came from Enter, where focus has to stay where the keyboard
    // left it.
    if (e.detail > 0) e.currentTarget.blur()

    if (!item.scrollTo || pathname !== '/') return
    e.preventDefault()

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)

    // Claim the target immediately so the marker moves with the click rather
    // than trailing the scroll, and lock out the scroll listener until the
    // travel is over.
    isNavigating.current = true
    setActiveSection(item.scrollTo)

    const section = document.getElementById(item.scrollTo)
    if (section) smoothScrollTo(section)
  }

  useEffect(() => {
    // Which stop the page is at. The last section whose top has passed the
    // trigger line wins, rather than the first section that contains it: the
    // gaps between sections belong to no section at all, and "the one you last
    // arrived at" is the right answer while crossing one.
    //
    // Measured straight off the viewport rather than through scrollY, which is
    // also what keeps it honest for a section riding pinned (fixed) mid-swipe:
    // the wrapper stays in flow, so its rect is still the truth.
    const updateActiveSection = () => {
      if (isNavigating.current) return
      const trigger = window.innerHeight * 0.1
      let current = navItems[0].scrollTo
      for (const item of navItems) {
        const el = document.getElementById(item.scrollTo)
        if (el && el.getBoundingClientRect().top <= trigger) current = item.scrollTo
      }
      setActiveSection(current)
    }

    updateActiveSection()

    // Coalesced to one update per frame. Deliberately NOT a time-based
    // throttle: dropping an event outright means that if it was the last one of
    // a gesture, the stop never updates and the marker is simply left behind —
    // which is what made arriving at a section register only some of the time.
    // Every event here schedules a frame, so the final position always lands.
    let queued = false
    const handleScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        updateActiveSection()

        // Release the navigation lock once the travel has settled.
        if (isNavigating.current) {
          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
          scrollTimeoutRef.current = setTimeout(() => {
            isNavigating.current = false
          }, 300)
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [pathname])

  // After landing on the home page via a hash link (e.g. an old /projects/
  // redirect), start at the top then smooth-scroll down to the target so the
  // descent — including the swipe-in transitions — is animated, not an instant
  // jump. Hash links set scroll={false} so Next does not pre-jump to the anchor.
  useEffect(() => {
    if (pathname !== '/') return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    isNavigating.current = true
    setActiveSection(hash)
    smoothScrollTo(0, { immediate: true })
    const el = document.getElementById(hash)
    if (el) smoothScrollTo(el)
  }, [pathname, smoothScrollTo])

  // How far down the line the journey has reached. Clamped because no stop is
  // current when the route is not the home page.
  const activeIndex = Math.max(0, navItems.findIndex(isItemActive))

  return (
    <>
      {/* A band of blur beneath the strip, so whatever scrolls under it softens
          instead of colliding with the diagram. No fill, no edge — the only
          thing here is the defocus, and it ramps out before the band ends.

          Two stacked layers rather than one. A single masked blur leaves
          full-strength blur ghosting at low opacity over the sharp original
          near the bottom, which reads as haze; a light blur across the whole
          band with a heavier one over just the top ramps the strength itself,
          which is what actually reads as a gradient.

          z-45 puts it over the hero canvas and the swipe-in panels (both z-40)
          so it blurs those too, while staying under the strip at z-50. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[45] h-24"
      >
        <div
          className="absolute inset-0 backdrop-blur-[3px]"
          style={{ maskImage: FADE_FULL, WebkitMaskImage: FADE_FULL }}
        />
        <div
          className="absolute inset-x-0 top-0 h-2/3 backdrop-blur-[10px]"
          style={{ maskImage: FADE_TOP, WebkitMaskImage: FADE_TOP }}
        />
      </div>

      <nav
        aria-label="Sections"
        // Named groups because the stops are groups of their own: hovering
        // anywhere on the strip brings up every name, while the dot under the
        // pointer is the only one that reacts.
        className="group/nav fixed left-1/2 top-0 z-50 -translate-x-1/2 pt-5 font-nav"
      >
        <div
          className="relative [--pitch:72px] md:[--pitch:96px]"
          style={{
            width: `calc(var(--pitch) * ${navItems.length - 1})`,
            height: DIAGRAM_H,
          }}
        >
        {/* Track ahead, in the faint grey of a line not yet ridden. It runs
            station to station, so it stops at the terminals instead of trailing
            off past them. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 h-[1.5px] -translate-y-1/2 rounded-full bg-gray-300"
          style={{ top: DOT_BAND / 2 }}
        />
        {/* Track behind: the same line in ink, growing across to the stop you
            are at. Slower than the marker on purpose — the line arriving a beat
            after you do reads as travel rather than as a state change. */}
        <span
          aria-hidden="true"
          className="absolute left-0 h-[1.5px] -translate-y-1/2 rounded-full bg-gray-900 transition-all duration-500 ease-out"
          style={{ top: DOT_BAND / 2, width: `calc(var(--pitch) * ${activeIndex})` }}
        />

        {navItems.map((item, i) => {
          const isActive = isItemActive(item)
          return (
            <Link
              key={item.label}
              href={item.href}
              // Hash links manage their own scroll (top first, then down), so
              // suppress Next's automatic jump to the anchor.
              scroll={item.href.includes('#') ? false : undefined}
              onClick={(e) => handleNavClick(e, item)}
              aria-current={isActive ? 'page' : undefined}
              // Centred on its station, so the padding that makes it a decent
              // touch target grows outwards and never shifts the diagram.
              className="group/stop absolute top-0 flex -translate-x-1/2 flex-col items-center px-2"
              style={{ left: `calc(var(--pitch) * ${i})` }}
            >
              <span
                className="flex items-center justify-center"
                style={{ height: DOT_BAND }}
              >
                {/* The stop you are at is the map's interchange, part for part:
                    a white disc with a thin ink ring, big enough to sit over the
                    line and interrupt it. The rest are ordinary stops, and they
                    darken on hover so the whole column reads as one target. */}
                <span
                  className={`block rounded-full transition-all duration-300 ease-out ${
                    isActive
                      ? 'h-[11px] w-[11px] border-[1.5px] border-gray-900 bg-white'
                      : 'h-[5px] w-[5px] bg-gray-400 group-hover/stop:bg-gray-900'
                  }`}
                />
              </span>
              {/* Names are the diagram's detail, not its substance — the line
                  and the marker already say where you are, so the text only
                  comes up when you go looking for it. Faded rather than
                  removed: it keeps its space, so nothing shifts on reveal, and
                  it stays in the accessibility tree throughout. focus-within
                  brings it back for keyboard users, who get no hover. */}
              <span
                className={`mt-1.5 whitespace-nowrap text-[11px] opacity-0 transition-all duration-300 group-focus-within/nav:opacity-100 group-hover/nav:opacity-100 ${
                  isActive
                    ? 'font-medium text-gray-900'
                    : 'text-gray-500 group-hover/stop:text-gray-900'
                }`}
              >
                {item.label}
              </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
