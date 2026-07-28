'use client'

import { useEffect, useRef, useState } from 'react'

const SIZE = 28
// Grown over anything clickable, which is what gives back the affordance the
// native pointer cursor was carrying before it was hidden.
const HOVER_SCALE = 0.5
// Applied on top of that while the button is held, so a press reads the same
// whether it lands on a link or on empty page.
const PRESS_SCALE = 1.3
// Fraction of the remaining distance covered each frame. Low enough to read as
// glass with weight behind it, high enough not to feel disconnected.
const LERP = 0.28
const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, label, summary'

// Replaces the pointer with a small frosted disc. Position is written straight
// to the node inside a rAF loop, never through state: this moves every frame,
// and a re-render per mousemove would be wasted work on the same main thread
// the canvases are competing for.
export default function GlassCursor() {
  const dotRef = useRef(null)
  // Pointing devices only. A touchscreen has no cursor to stand in for, so the
  // disc is never rendered there at all rather than being left invisible.
  // Starts false so the server and the first client render agree; the media
  // query is only readable once mounted.
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: fine)')
    const sync = () => setEnabled(query.matches)
    sync()
    // Hybrids can gain or lose a mouse mid-session.
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const el = dotRef.current
    if (!el) return

    // Drives the cursor:none rule in globals.css. Set from here rather than in
    // the stylesheet so the native pointer only ever disappears once the disc
    // is actually mounted and tracking.
    document.documentElement.classList.add('glass-cursor')

    let x = 0
    let y = 0
    let targetX = 0
    let targetY = 0
    let scale = 1
    let targetScale = 1
    let placed = false
    let hovering = false
    let pressed = false

    // Hover and press stack, so pressing on a link grows it from the already
    // enlarged state rather than fighting it.
    const resize = () => {
      targetScale = (hovering ? HOVER_SCALE : 1) * (pressed ? PRESS_SCALE : 1)
    }

    const onMove = (e) => {
      targetX = e.clientX
      targetY = e.clientY
      hovering = Boolean(e.target?.closest?.(INTERACTIVE))
      resize()
      if (!placed) {
        // Appear at the pointer rather than gliding in from the top-left.
        x = targetX
        y = targetY
        placed = true
        el.style.opacity = '1'
      }
    }

    const onDown = () => {
      pressed = true
      resize()
    }

    // On window, not the element: a drag can easily end outside whatever it
    // started on, and the disc must not be left stuck large.
    const onUp = () => {
      pressed = false
      resize()
    }

    // Off the window entirely: hide, and let the next move place it afresh so
    // it does not streak back across the page on return.
    const onLeave = () => {
      el.style.opacity = '0'
      placed = false
    }

    let raf = requestAnimationFrame(function loop() {
      x += (targetX - x) * LERP
      y += (targetY - y) * LERP
      scale += (targetScale - scale) * LERP
      el.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0) scale(${scale})`
      raf = requestAnimationFrame(loop)
    })

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      document.documentElement.classList.remove('glass-cursor')
    }
  }, [enabled])

  if (!enabled) return null

  return (
    // Above everything the page can raise, including the loading gate (z-100)
    // and the art lightbox (z-60). The mid-tone border reads against both the
    // light sections and the dark artwork; the blur behind it is what sells the
    // glass, and shows up over either. glass-cursor-dot is the hook globals.css
    // uses to keep it out of the loading screen.
    <div
      ref={dotRef}
      aria-hidden="true"
      className="glass-cursor-dot pointer-events-none fixed left-0 top-0 z-[200] rounded-full border border-gray-500/50 bg-white/0 shadow-lg shadow-black/10 backdrop-blur-sm opacity-0 will-change-transform"
      style={{ width: SIZE, height: SIZE }}
    />
  )
}
