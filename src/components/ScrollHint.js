'use client'

import { useEffect, useRef, useState } from 'react'
import { useLenis } from './SmoothScroll'

// The nudge to keep scrolling, wearing the navbar's frosted glass so the two
// read as the same set of controls. Sits at the bottom of whichever title
// screen renders it — the hero, projects or art — and on click scrolls exactly
// one screen down: each of those reserves a screen, so that lands on the
// content beneath it.
export default function ScrollHint({ enabled = true }) {
  const wrapperRef = useRef(null)
  const lenis = useLenis()
  // Shown only while the screen this belongs to is the one being looked at.
  // Measured off the wrapper rather than scrollY so the same test works for all
  // three, including the titles that ride inside a pinned section mid-swipe.
  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    const update = () => {
      const wrapper = wrapperRef.current
      if (!wrapper) return
      setAtTop(Math.abs(wrapper.getBoundingClientRect().top) < 50)
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

  // Through Lenis, so the descent eases like every other scroll on the page
  // rather than fighting its animation.
  const scrollOn = () => {
    const target = window.scrollY + window.innerHeight
    if (lenis) {
      lenis.scrollTo(target)
    } else {
      window.scrollTo({ top: target, behavior: 'smooth' })
    }
  }

  return (
    // Full screen so the button lands at the bottom of this title's own screen,
    // but click-through: only the button itself takes pointer events, leaving
    // the canvas behind it draggable.
    <div
      ref={wrapperRef}
      className={`absolute inset-x-0 top-0 h-screen z-40 pointer-events-none flex items-end justify-center pb-6 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Same glass as the navbar pill: the opacity fade is on the ancestor
          here rather than this element, so keep transform-gpu to hold it on its
          own compositing layer and stop the backdrop-filter flattening. */}
      <button
        type="button"
        onClick={scrollOn}
        aria-label="Scroll to the next section"
        className={`flex items-center justify-center rounded-full p-2.5 text-gray-500 hover:text-gray-700 border border-black/15 bg-black/5 hover:bg-black/8 backdrop-blur-xl shadow-lg shadow-black/10 transform-gpu transition-colors duration-300 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  )
}
