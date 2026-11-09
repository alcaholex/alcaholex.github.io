'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { navScroll } from './navScroll'
import * as sfx from './sound'

const navItems = [
  { href: '/', label: 'home', scrollTo: 'section-1' },
  { href: '/#section-2', label: 'about', scrollTo: 'section-2' },
  { href: '/#section-3', label: 'projects', scrollTo: 'section-3' },
  { href: '/#section-4', label: 'art', scrollTo: 'section-4' },
]

const DOT_BAND = 12
const DIAGRAM_H = 32

const FADE_FULL = 'linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)'
const FADE_TOP = 'linear-gradient(to bottom, #000 0%, #000 25%, transparent 100%)'

export default function Navbar() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState('section-1')
  const isNavigating = useRef(false)
  const scrollTimeoutRef = useRef(null)

  const [muted, setMuted] = useState(false)
  const [dark, setDark] = useState(false)
  const themeFadeTimer = useRef(0)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])
  const toggleMute = () => {
    setMuted((m) => {
      sfx.setMuted(!m)
      if (m) sfx.chord('unmute')
      return !m
    })
  }
  const toggleTheme = () => {
    setDark((d) => {
      sfx.chord(d ? 'themeLight' : 'themeDark')
      const root = document.documentElement

      root.classList.add('theme-fading')
      clearTimeout(themeFadeTimer.current)
      themeFadeTimer.current = setTimeout(() => root.classList.remove('theme-fading'), 420)
      root.classList.toggle('dark', !d)
      try {
        localStorage.setItem('theme', !d ? 'dark' : 'light')
      } catch {
      }
      return !d
    })
  }

  const smoothScrollTo = useCallback((target, options) => {
    navScroll.mark()
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: options?.immediate ? 'auto' : 'smooth' })
    } else {
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const isItemActive = useCallback(
    (item) => activeSection === item.scrollTo && pathname === '/',
    [activeSection, pathname]
  )

  const handleNavClick = (e, item) => {
    // e.detail is 0 for keyboard activation; mouse clicks must blur or
    // focus-within holds the labels open.
    if (e.detail > 0) e.currentTarget.blur()

    if (!item.scrollTo || pathname !== '/') return
    e.preventDefault()

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)

    isNavigating.current = true
    setActiveSection(item.scrollTo)

    sfx.navTo(navItems.indexOf(item), true)

    const section = document.getElementById(item.scrollTo)
    if (section) smoothScrollTo(section)
  }

  useEffect(() => {
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

    let queued = false
    const handleScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        updateActiveSection()

        if (isNavigating.current) {
          navScroll.mark()
          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
          scrollTimeoutRef.current = setTimeout(() => {
            isNavigating.current = false
            navScroll.clear()
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

  const activeIndex = Math.max(0, navItems.findIndex(isItemActive))

  return (
    <>

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

        className="group/nav fixed left-1/2 top-0 z-50 -translate-x-1/2 pt-5 font-nav"
      >
        <div
          className="relative [--pitch:72px] md:[--pitch:96px]"
          style={{
            width: `calc(var(--pitch) * ${navItems.length - 1})`,
            height: DIAGRAM_H,
          }}
        >

        <button
          type="button"
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          aria-pressed={muted}
          onClick={toggleMute}
          className="absolute -left-12 -translate-y-1/2 p-2 text-gray-400 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-100"
          style={{ top: DOT_BAND / 2 }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6.5 8.5H3v7h3.5L11 19V5Z" />
            {muted ? (
              <path strokeLinecap="round" d="M15 9.5l5 5M20 9.5l-5 5" />
            ) : (
              <path strokeLinecap="round" d="M15 9a4.2 4.2 0 0 1 0 6M17.5 6.8a7.6 7.6 0 0 1 0 10.4" />
            )}
          </svg>
        </button>

        <button
          type="button"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={dark}
          onClick={toggleTheme}
          className="absolute -right-12 -translate-y-1/2 p-2 text-gray-400 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-100"
          style={{ top: DOT_BAND / 2 }}
        >
          {dark ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
              <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
            </svg>
          )}
        </button>

        <span
          aria-hidden="true"
          className="absolute inset-x-0 h-[1.5px] -translate-y-1/2 rounded-full bg-gray-300 dark:bg-gray-700"
          style={{ top: DOT_BAND / 2 }}
        />

        <span
          aria-hidden="true"
          className="absolute left-0 h-[1.5px] -translate-y-1/2 rounded-full bg-gray-900 transition-all duration-500 ease-out dark:bg-gray-100"
          style={{ top: DOT_BAND / 2, width: `calc(var(--pitch) * ${activeIndex})` }}
        />

        {navItems.map((item, i) => {
          const isActive = isItemActive(item)
          return (
            <Link
              key={item.label}
              href={item.href}

              scroll={item.href.includes('#') ? false : undefined}
              onClick={(e) => handleNavClick(e, item)}
              aria-current={isActive ? 'page' : undefined}

              className="group/stop absolute top-0 flex -translate-x-1/2 flex-col items-center px-2"
              style={{ left: `calc(var(--pitch) * ${i})` }}
            >
              <span
                className="flex items-center justify-center"
                style={{ height: DOT_BAND }}
              >

                <span
                  className={`block rounded-full transition-all duration-300 ease-out ${
                    isActive
                      ? 'h-[11px] w-[11px] border-[1.5px] border-gray-900 bg-white dark:border-gray-100 dark:bg-gray-900'
                      : 'h-[5px] w-[5px] bg-gray-400 group-hover/stop:bg-gray-900 dark:bg-gray-600 dark:group-hover/stop:bg-gray-100'
                  }`}
                />
              </span>

              <span
                className={`mt-1.5 whitespace-nowrap text-[11px] opacity-0 transition-all duration-300 group-focus-within/nav:opacity-100 group-hover/nav:opacity-100 ${
                  isActive
                    ? 'font-medium text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 group-hover/stop:text-gray-900 dark:text-gray-400 dark:group-hover/stop:text-gray-100'
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
