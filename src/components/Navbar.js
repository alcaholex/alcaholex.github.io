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

// Box model for the pill's nav links and the row that holds them.
const ITEM_CLASS = 'px-4 py-2 rounded-full text-sm font-medium'
const ROW_CLASS = 'flex items-center space-x-6'

export default function Navbar() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState('section-1')
  const [highlightStyle, setHighlightStyle] = useState({})
  // Past the hero the pill collapses to a small arrow; hovering it reveals the nav.
  const [isHovered, setIsHovered] = useState(false)
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
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 pt-6 font-montserrat ${showFull ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        {/* Collapsed handle: a little downward arrow tab hanging from the top edge. */}
        <button
          type="button"
          aria-label="Show navigation"
          onMouseEnter={() => setIsHovered(true)}
          className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl px-5 pt-1 pb-1.5 backdrop-blur-xl shadow-lg shadow-black/10 border border-t-0 border-black/15 bg-black/5 transition-all duration-300 ${
            showFull ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 pointer-events-auto'
          }`}
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* The pill: layout, click targets, and visible labels. */}
        <nav
          onMouseEnter={() => setIsHovered(true)}
          className={`transition-all duration-300 ${showFull ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
        >
          {/* Glass in the hero; solid white once revealed past it, where it sits
              over content that would otherwise show through. */}
          <div className={`rounded-full px-6 py-3 shadow-2xl shadow-black/10 border border-black/15 ${isHero ? 'backdrop-blur-xl bg-black/5' : 'bg-white'}`}>
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
