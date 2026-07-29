'use client'

import { useEffect, useRef, useState } from 'react'

const SIZE = 28

const HOVER_SCALE = 0.5

const PRESS_SCALE = 1.3

const LERP = 0.28
const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, label, summary'

export default function GlassCursor() {
  const dotRef = useRef(null)

  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: fine)')
    const sync = () => setEnabled(query.matches)
    sync()

    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const el = dotRef.current
    if (!el) return

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

    const resize = () => {
      targetScale = (hovering ? HOVER_SCALE : 1) * (pressed ? PRESS_SCALE : 1)
    }

    const onMove = (e) => {
      targetX = e.clientX
      targetY = e.clientY
      hovering = Boolean(e.target?.closest?.(INTERACTIVE))
      resize()
      if (!placed) {
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

    const onUp = () => {
      pressed = false
      resize()
    }

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
    <div
      ref={dotRef}
      aria-hidden="true"
      className="glass-cursor-dot pointer-events-none fixed left-0 top-0 z-[200] rounded-full border border-gray-500/50 bg-white/0 shadow-lg shadow-black/10 backdrop-blur-sm opacity-0 will-change-transform dark:border-gray-200/70 dark:bg-white/10 dark:shadow-black/40"
      style={{ width: SIZE, height: SIZE }}
    />
  )
}
