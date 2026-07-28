'use client'

import { useEffect, useRef, useState } from 'react'
import { useLenis } from './SmoothScroll'

// The nudge to keep scrolling: a bare chevron, no frame behind it. Sits at the
// bottom of whichever title
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
      const top = wrapper.getBoundingClientRect().top
      // Visible from the moment this title screen is the one on top until
      // the content below it has scrolled 30% of a viewport into view — the
      // nudge should survive the start of the scroll it asked for, not
      // vanish at the first pixel. (It rides its own screen out of view, so
      // by -30% it is already low on the page; the fade finishes the job.)
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
    // the canvas behind it draggable. dvh rather than vh, because 100vh is the
    // viewport at its tallest and would drop the button behind a phone's
    // address bar — and at pb-6 there is no clearance to absorb that.
    <div
      ref={wrapperRef}
      className={`absolute inset-x-0 top-0 h-[100dvh] z-40 pointer-events-none flex items-end justify-center pb-6 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Just the mark, no chrome — the padding is only there to keep the tap
          target honest now that nothing is drawn around it. */}
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
