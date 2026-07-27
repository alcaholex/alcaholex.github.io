'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLenis } from './SmoothScroll'

// home/about are scroll targets on the home page; projects/art are their own
// routes. Items without scrollTo are highlighted by pathname instead.
const navItems = [
  { href: '/', label: 'home', scrollTo: 'section-1' },
  // Hash so it also works from another route: navigates home, then the
  // pathname effect below scrolls to the about section once it mounts.
  { href: '/#section-2', label: 'about', scrollTo: 'section-2' },
  { href: '/projects', label: 'projects' },
  { href: '/art', label: 'art' },
]

// Box model for the pill's nav links and the row that holds them.
// Tighter on mobile so the bar is thinner; full size from md up.
const ITEM_CLASS = 'px-3 py-2 md:px-4 rounded-full text-sm font-medium'
const ROW_CLASS = 'flex items-center space-x-2 md:space-x-6'

export default function Navbar() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState('section-1')
  const [highlightStyle, setHighlightStyle] = useState({})
  // Past the hero the pill collapses to a small arrow; hovering it reveals the nav.
  const [isHovered, setIsHovered] = useState(false)
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

  // trailingSlash is on, so usePathname() returns e.g. "/projects/"; strip the
  // slash before comparing to the item hrefs ("/projects") or the highlight
  // drops out on the sub-pages.
  const normalizePath = (p) => (p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p)

  const isItemActive = useCallback((item) => (
    (item.scrollTo && activeSection === item.scrollTo && normalizePath(pathname) === '/') ||
    (!item.scrollTo && normalizePath(pathname) === item.href)
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
          // Runs on every route so the sub-page heroes (also id section-1)
          // collapse the pill on scroll just like the home page does.
          if (sectionId && !isNavigating.current) {
            setActiveSection(sectionId)
          }
          break
        }
      }
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

  // After landing on the home page via a hash link (e.g. about from another
  // route), start at the top (section 1) then smooth-scroll down to the target
  // so the hero is briefly visible and the descent is animated, not an instant
  // jump. The about link sets scroll={false} so Next does not pre-jump to it.
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

  // Full nav shows in the hero (section-1) or whenever the collapsed handle is
  // hovered; everywhere else it collapses to the little arrow.
  const isHero = activeSection === 'section-1'
  const showFull = isHero || isHovered

  return (
    <>
      {/* Wrapper sizes to the pill and owns the hover state. It only intercepts
          pointer events while expanded, so the collapsed arrow (a small child
          that stays interactive) is the only thing blocking clicks up top. */}
      <div
        ref={wrapperRef}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 pt-6 font-montserrat ${showFull ? 'pointer-events-auto' : 'pointer-events-none'}`}
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
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                    className={`${ITEM_CLASS} text-gray-700 hover:text-gray-400 transition-colors`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}
