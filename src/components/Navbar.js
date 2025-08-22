'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [isDarkBackground, setIsDarkBackground] = useState(false)
  const [activeSection, setActiveSection] = useState('section-1')
  const [highlightStyle, setHighlightStyle] = useState({})
  const navRef = useRef(null)
  const isNavigating = useRef(false)
  const scrollTimeoutRef = useRef(null)
  
  const navItems = [
    { href: '/', label: 'home', scrollTo: 'section-1' },
    { href: '/about', label: 'about', scrollTo: 'section-2' },
    { href: '/projects', label: 'projects' },
    { href: '/art', label: 'art' },
  ]

  const updateHighlightPosition = useCallback(() => {
    if (!navRef.current) return
    
    const activeItem = navItems.find(item => 
      (item.scrollTo && activeSection === item.scrollTo && pathname === '/') || 
      (!item.scrollTo && pathname === item.href)
    )
    
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
  }, [navItems, activeSection, pathname])

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
    const checkNavbarTheme = () => {
      const navbarPosition = 60 // approximate navbar position from top
      const sections = document.querySelectorAll('[data-navbar-theme]')
      
      for (const section of sections) {
        const rect = section.getBoundingClientRect()
        
        // check if navbar is within this section
        if (rect.top <= navbarPosition && rect.bottom >= navbarPosition) {
          const theme = section.getAttribute('data-navbar-theme')
          const sectionId = section.getAttribute('id')
          
          // Update both theme and active section simultaneously
          setIsDarkBackground(theme === 'dark')
          if (sectionId && pathname === '/' && !isNavigating.current) {
            setActiveSection(sectionId)
          }
          break
        }
      }
    }

    // check on start
    checkNavbarTheme()

    // check on scroll with throttling
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          checkNavbarTheme()
          ticking = false
          
          // Reset navigation flag after scroll stops (debounced)
          if (isNavigating.current) {
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current)
            }
            scrollTimeoutRef.current = setTimeout(() => {
              isNavigating.current = false
            }, 150) // Reset after scroll stops for 150ms
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
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 font-montserrat">
      <div className={`backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl transition-all duration-300 ${
        isDarkBackground 
          ? 'bg-white/8 border border-white/20 shadow-black/20' 
          : 'bg-black/5 border border-black/15 shadow-black/10'
      }`}>
        <div className="flex items-center space-x-6 relative">
          {/* Sliding highlight background */}
          <div 
            className={`absolute top-0 h-full rounded-full transition-all duration-300 ease-out backdrop-blur-sm ${
              isDarkBackground
                ? 'bg-white/1'
                : 'bg-black/1'
            }`}
            style={{
              left: highlightStyle.left,
              width: highlightStyle.width,
              opacity: highlightStyle.opacity,
              transform: 'translateY(0)',
            }}
          />
          
          {/* Navigation items */}
          <div className="flex items-center space-x-6 relative z-10" ref={navRef}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative ${
                  (item.scrollTo && activeSection === item.scrollTo && pathname === '/') || 
                  (!item.scrollTo && pathname === item.href)
                    ? isDarkBackground
                      ? 'text-white'
                      : 'text-gray-900'
                    : isDarkBackground
                      ? 'text-white/90 hover:text-white'
                      : 'text-gray-800 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}