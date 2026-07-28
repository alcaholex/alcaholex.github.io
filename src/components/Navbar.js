'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLenis } from './SmoothScroll'

// Everything lives on the home page again: projects and art swipe in as
// scroll sections. Hashes let each link also work when landing from another
// route (e.g. the old /projects/ redirect): navigate home, then the pathname
// effect below scrolls to the section once it mounts.
const navItems = [
  { href: '/', label: 'home', scrollTo: 'section-1' },
  { href: '/#section-2', label: 'about', scrollTo: 'section-2' },
  { href: '/#section-3', label: 'projects', scrollTo: 'section-3' },
  { href: '/#section-4', label: 'art', scrollTo: 'section-4' },
]

// Shared box model so the transparent hit-target links (inside the pill) and
// the visible blend overlay (at body level) line up exactly. Keep these
// identical. Tighter on mobile so the bar is thinner; full size from md up.
const ITEM_CLASS = 'px-3 py-2 md:px-4 rounded-full text-sm font-medium'
const ROW_CLASS = 'flex items-center space-x-2 md:space-x-6'

export default function Navbar() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState('section-1')
  const [highlightStyle, setHighlightStyle] = useState({})
  // Past the hero the pill collapses to a small arrow; hovering it reveals the nav.
  const [isHovered, setIsHovered] = useState(false)
  // True while one of the 3D title screens is the one in view, which expands the
  // nav the same way the hero does.
  const [onTitleScreen, setOnTitleScreen] = useState(false)
  const navRef = useRef(null)
  const wrapperRef = useRef(null)
  const isNavigating = useRef(false)
  const scrollTimeoutRef = useRef(null)

  // Kept in a ref so scroll handlers/effects can reach the current Lenis instance
  // without listing it as a dependency (it starts null, then resolves once mounted).
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

  const isItemActive = useCallback((item) => (
    activeSection === item.scrollTo && pathname === '/'
  ), [activeSection, pathname])

  const updateHighlightPosition = useCallback(() => {
    if (!navRef.current) return

    const activeItem = navItems.find(isItemActive)

    if (activeItem) {
      const activeIndex = navItems.indexOf(activeItem)
      const activeElement = navRef.current.children[activeIndex]

      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement
        setHighlightStyle({
          left: offsetLeft,
          width: offsetWidth,
          opacity: 1
        })
      }
    } else {
      setHighlightStyle({ opacity: 0 })
    }
  }, [isItemActive])

  const handleNavClick = (e, item) => {
    // Collapse the pill after a tap so touch users get the arrow back.
    setIsHovered(false)

    if (item.scrollTo && pathname === '/') {
      e.preventDefault()

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Immediately update UI and prevent scroll listener interference
      isNavigating.current = true
      setActiveSection(item.scrollTo)

      const section = document.getElementById(item.scrollTo)
      if (section) {
        smoothScrollTo(section)
      }
    }
  }

  useEffect(() => {
    // Tracks which section is in view so the active item / highlight follow the scroll.
    const updateActiveSection = () => {
      const scrollY = window.scrollY
      const viewportHeight = window.innerHeight
      const sections = document.querySelectorAll('[data-navbar-theme]')

      for (const section of sections) {
        const rect = section.getBoundingClientRect()
        const sectionTop = scrollY + rect.top
        const sectionBottom = sectionTop + rect.height

        // More responsive detection - trigger when section is 10% visible from top
        const triggerPoint = scrollY + viewportHeight * 0.1

        if (triggerPoint >= sectionTop && triggerPoint <= sectionBottom) {
          const sectionId = section.getAttribute('id')
          if (sectionId && !isNavigating.current) {
            setActiveSection(sectionId)
          }
          break
        }
      }

      // Same 10% line, but measured straight off the viewport. scrollY cancels
      // out of the comparison above, so this is that rule rewritten the only way
      // that survives a title riding inside a pinned (fixed) section mid-swipe,
      // where scrollY + rect.top is no longer a document coordinate.
      //
      // The horizontal test is not redundant: a section waiting to swipe in is
      // already pinned at top 0 and merely held offscreen sideways, so on the
      // vertical line alone every queued title reads as "on screen" and the nav
      // would stay open through the section before it.
      const triggerLine = viewportHeight * 0.1
      let onTitle = false
      for (const title of document.querySelectorAll('[data-navbar-full]')) {
        const rect = title.getBoundingClientRect()
        const crossesLine = rect.top <= triggerLine && rect.bottom >= triggerLine
        const onScreen = rect.left < window.innerWidth && rect.right > 0
        if (crossesLine && onScreen) {
          onTitle = true
          break
        }
      }
      setOnTitleScreen(onTitle)
    }

    updateActiveSection()

    let ticking = false
    let lastScrollTime = 0
    const handleScroll = () => {
      const now = Date.now()
      if (!ticking && now - lastScrollTime > 16) { // Limit to ~60fps
        requestAnimationFrame(() => {
          updateActiveSection()
          ticking = false
          lastScrollTime = now

          // Reset navigation flag after scroll stops (debounced)
          if (isNavigating.current) {
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current)
            }
            scrollTimeoutRef.current = setTimeout(() => {
              isNavigating.current = false
            }, 300) // Increased timeout to 300ms for better stability
          }
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [pathname])

  // After landing on the home page via a hash link (e.g. an old /projects/
  // redirect), start at the top (section 1) then smooth-scroll down to the
  // target so the descent — including the swipe-in transitions — is animated,
  // not an instant jump. Hash links set scroll={false} so Next does not
  // pre-jump to the anchor.
  useEffect(() => {
    if (pathname !== '/') return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    // Highlight the target section right away and lock it so the descent past
    // section 1 doesn't flash the "home" highlight on the way down.
    isNavigating.current = true
    setActiveSection(hash)
    // Jump to the top instantly, then glide down so the descent is visible.
    smoothScrollTo(0, { immediate: true })
    const el = document.getElementById(hash)
    if (el) smoothScrollTo(el)
  }, [pathname, smoothScrollTo])

  // Update highlight position when active section or pathname changes
  useEffect(() => {
    updateHighlightPosition()
  }, [activeSection, pathname, updateHighlightPosition])

  // Update highlight position on window resize
  useEffect(() => {
    const handleResize = () => updateHighlightPosition()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateHighlightPosition])

  // Touch has no mouseleave, so a tap outside the pill collapses it back to the arrow.
  useEffect(() => {
    if (!isHovered) return
    const handlePointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsHovered(false)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [isHovered])

  // Full nav shows on any of the three 3D title screens — the hero (section-1)
  // and the projects/art words — or whenever the collapsed handle is hovered;
  // everywhere else it collapses to the little arrow.
  const isHero = activeSection === 'section-1'
  const showFull = isHero || onTitleScreen || isHovered

  return (
    <>
      {/* Wrapper sizes to the pill and owns the hover state. It only intercepts
          pointer events while expanded, so the collapsed arrow (a small child
          that stays interactive) is the only thing blocking clicks up top. */}
      <div
        ref={wrapperRef}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 pt-6 font-nav ${showFull ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        {/* Collapsed handle: a little downward arrow tab hanging from the top edge. */}
        <button
          type="button"
          aria-label="Show navigation"
          onMouseEnter={() => setIsHovered(true)}
          onClick={() => setIsHovered(true)}
          className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl px-5 pt-1 pb-1.5 backdrop-blur-xl shadow-lg shadow-black/10 border border-t-0 border-black/15 bg-black/5 transform-gpu transition-all duration-300 ${
            showFull ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 pointer-events-auto'
          }`}
        >
          {/* Stroke is transparent — the visible chevron is the blend overlay
              below, which needs to blend against the page, not this button's
              backdrop-filter group. */}
          <svg className="w-4 h-4 text-transparent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* The pill: layout, click targets, and visible labels. The nav only
            slides; the opacity fade lives on the glass pill below. */}
        <nav
          onMouseEnter={() => setIsHovered(true)}
          className={`transition-transform duration-300 ${showFull ? 'translate-y-0' : '-translate-y-3'}`}
        >
          {/* Always the same frosted glass as the collapsed chevron handle. The
              opacity fade is applied HERE, on the backdrop-filter element itself,
              rather than on an ancestor — an ancestor's fractional opacity
              flattens the backdrop-filter into a group and drops it behind the
              page. transform-gpu keeps it on its own compositing layer. */}
          <div className={`rounded-full px-4 py-3 md:px-6 shadow-2xl shadow-black/10 border border-black/15 backdrop-blur-xl bg-black/5 transform-gpu transition-opacity duration-300 ${showFull ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative">
              {/* Sliding highlight background */}
              <div
                className="absolute top-0 h-full rounded-full bg-black/10 transition-all duration-300 ease-out"
                style={{
                  left: highlightStyle.left,
                  width: highlightStyle.width,
                  opacity: highlightStyle.opacity,
                }}
              />

              <div className={`${ROW_CLASS} relative z-10`} ref={navRef}>
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    // Hash links manage their own scroll (top first, then down),
                    // so suppress Next's automatic jump to the anchor.
                    scroll={item.href.includes('#') ? false : undefined}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`${ITEM_CLASS} text-transparent`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Visible labels — built to match the proven test exactly: a single fixed
          element (blend group = page root) with mix-blend-difference and text
          directly on it, and plain padded span children. No nested wrapper, no
          per-span opacity — an opacity < 1 child makes its own group and breaks
          the blend, which is what left the text stuck white. Positioned over the
          pill; the transparent border matches the pill's border for alignment,
          and pointer-events pass through to the real links beneath. Mirrors the
          pill's slide and fade so the two never separate. */}
      <div
        aria-hidden="true"
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-[60] pt-6 font-nav pointer-events-none text-white mix-blend-difference transition-all duration-300 ${showFull ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}
      >
        <div className={`px-4 py-3 md:px-6 border border-transparent ${ROW_CLASS}`}>
          {navItems.map((item) => (
            <span key={item.label} className={ITEM_CLASS}>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* The collapsed handle's chevron, same treatment: geometry mirrors the
          handle button exactly, visible whenever the handle is. */}
      <div
        aria-hidden="true"
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-[60] px-5 pt-1 pb-1.5 border border-t-0 border-transparent pointer-events-none text-white mix-blend-difference transition-all duration-300 ${showFull ? 'opacity-0 -translate-y-full' : 'opacity-100'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </>
  )
}
