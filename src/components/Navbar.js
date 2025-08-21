'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [isDarkBackground, setIsDarkBackground] = useState(false)
  const [activeSection, setActiveSection] = useState('section-1')
  
  const navItems = [
    { href: '/', label: 'home', scrollTo: 'section-1' },
    { href: '/about', label: 'about', scrollTo: 'section-2' },
    { href: '/projects', label: 'projects' },
    { href: '/art', label: 'art' },
  ]

  const handleNavClick = (e, item) => {
    if (item.scrollTo && pathname === '/') {
      e.preventDefault()
      const section = document.getElementById(item.scrollTo)
      if (section) {
        setActiveSection(item.scrollTo)
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
          if (sectionId && pathname === '/') {
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
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [pathname])

  return (
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 font-montserrat">
      <div className={`backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl transition-all duration-300 ${
        isDarkBackground 
          ? 'bg-white/15 border border-white/30 shadow-black/20' 
          : 'bg-black/10 border border-black/20 shadow-black/10'
      }`}>
        <div className="flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                (item.scrollTo && activeSection === item.scrollTo && pathname === '/') || 
                (!item.scrollTo && pathname === item.href)
                  ? isDarkBackground
                    ? 'bg-white/25 text-white hover:bg-white/35 backdrop-blur-sm'
                    : 'bg-black/20 text-gray-900 hover:bg-black/30 backdrop-blur-sm'
                  : isDarkBackground
                    ? 'text-white/90 hover:text-white hover:bg-white/15'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-black/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}