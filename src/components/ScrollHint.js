'use client'

import { useEffect, useRef, useState } from 'react'
import { useLenis } from './SmoothScroll'
import * as sfx from './sound'

export default function ScrollHint({ enabled = true }) {
  const wrapperRef = useRef(null)
  const lenis = useLenis()

  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    const update = () => {
      const wrapper = wrapperRef.current
      if (!wrapper) return
      const top = wrapper.getBoundingClientRect().top

      setAtTop(top < 50 && top > -0.3 * window.innerHeight)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const visible = enabled && atTop

  // Stop short of the title screen's exact bottom: the navbar strip is fixed
  // over the top ~52px of the viewport, and the projects/art columns start
  // with no top padding — landing flush would tuck their first line under it.
  const LANDING_CLEARANCE = 80

  const scrollOn = () => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    sfx.chord('descend')
    // Absolute target — the bottom of this title screen — not "one viewport
    // from wherever the page is": the hint stays clickable well into the
    // scroll, and a relative jump overshoots by however far you've come.
    const rect = wrapper.getBoundingClientRect()
    const target = window.scrollY + rect.top + rect.height - LANDING_CLEARANCE
    if (lenis) {
      lenis.scrollTo(target)
    } else {
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`absolute inset-x-0 top-0 h-[100dvh] z-40 pointer-events-none flex items-end justify-center pb-6 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >

      <button
        type="button"
        onClick={scrollOn}
        aria-label="Scroll to the next section"
        className={`flex items-center justify-center p-2.5 text-gray-400 transition-colors duration-300 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-100 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}
