'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import Lenis from 'lenis'

// Exposes the Lenis instance so components (e.g. Navbar) can drive smooth
// programmatic scrolls through it instead of the native APIs, which would
// otherwise fight Lenis's own scroll animation.
const LenisContext = createContext(null)

export const useLenis = () => useContext(LenisContext)

export default function SmoothScroll({ children }) {
  const [lenis, setLenis] = useState(null)

  useEffect(() => {
    const instance = new Lenis()
    setLenis(instance)

    // Lenis animates the real page scroll each frame; it still fires native
    // scroll events, so the existing scroll listeners keep working.
    let rafId
    const loop = (time) => {
      instance.raf(time)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      instance.destroy()
      setLenis(null)
    }
  }, [])

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
}
