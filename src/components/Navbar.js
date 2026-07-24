'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'

const navItems = [
  { href: '/', label: 'home', scrollTo: 'section-1' },
  { href: '/about', label: 'about', scrollTo: 'section-2' },
  { href: '/projects', label: 'projects', scrollTo: 'section-3' },
  { href: '/art', label: 'art', scrollTo: 'section-4' },
]

// Shared box model so the transparent hit-target links (inside the pill) and the
// visible blend overlay (at body level) line up exactly. Keep these identical.
const ITEM_CLASS = 'px-4 py-2 rounded-full text-sm font-medium'
const ROW_CLASS = 'flex items-center space-x-6'

export default function Navbar() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState('section-1')
  const [highlightStyle, setHighlightStyle] = useState({})
  const navRef = useRef(null)
  const isNavigating = useRef(false)
  const scrollTimeoutRef = useRef(null)

  const isItemActive = useCallback((item) => (
    (item.scrollTo && activeSection === item.scrollTo && pathname === '/') ||
    (!item.scrollTo && pathname === item.href)
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
        section.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  useEffect(() => {
    // Tracks which section is in view so the active item / highlight follow the
    // scroll. Text colour is handled by mix-blend-difference, not here.
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
          if (sectionId && pathname === '/' && !isNavigating.current) {
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

  return (
    <>
      {/* The pill: glass, layout, click targets. Its link text is transparent —
          the visible labels come from the blend overlay below. */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 font-montserrat">
        <div className="backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl shadow-black/10 border border-black/15 bg-black/5">
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
                  key={item.href}
                  href={item.href}
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

      {/* Visible labels — built to match the proven test exactly: a single fixed
          element (blend group = page root) with mix-blend-difference and text
          directly on it, and plain padded span children. No nested wrapper, no
          per-span opacity — an opacity < 1 child makes its own group and breaks
          the blend, which is what left the text stuck white. Positioned over the
          pill; the transparent border matches the pill's border for alignment,
          and pointer-events pass through to the real links beneath. */}
      <div
        className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[60] font-montserrat px-6 py-3 border border-transparent pointer-events-none text-white mix-blend-difference text-sm font-medium ${ROW_CLASS}`}
        aria-hidden="true"
      >
        {navItems.map((item) => (
          <span key={item.href} className="px-4 py-2 rounded-full">
            {item.label}
          </span>
        ))}
      </div>
    </>
  )
}
