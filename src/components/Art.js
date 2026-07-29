'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ArtTitle from './ArtTitle'
import { InstagramIcon } from './Icons'
import * as sfx from './sound'
import { useLenis } from './SmoothScroll'

const artworks = [
  {
    title: "Agamemnon's Helmet",
    image: '/art/agamemnon.png',
    alt: "Agamemnon's Helmet",
    description: (
      <>Renders of ancient Greek king Agamemnon&apos;s helmet. A love letter to Christopher Nolan&apos;s <i>Odyssey</i>.</>
    ),
    href: 'https://www.instagram.com/p/DbH1_5Qlq1d/',
  },
  {
    title: 'Space Megastructure',
    image: '/art/megastructure.png',
    alt: 'Space Megastructure',
    description: 'An arbitrarily large space structure',
    href: 'https://www.instagram.com/p/Da39u8YoKcb/',
  },
  {
    title: 'Robot Renders',
    image: '/art/2053x.png',
    alt: 'Robot Renders',
    description: 'A collection of VEX robot renders. Includes a climbing animation',
    href: 'https://www.instagram.com/p/DYdmqFslvsi/',
  },
  {
    title: 'Water Shader',
    image: '/art/ships.png',
    alt: 'Water Shader',
    description: 'A semi-stylized demonstration of a water shader, rendered alongside ships',
    href: 'https://www.instagram.com/p/DQ3AFVfDYtu/',
    imageClassName: 'object-[center_100%]',
  },
  {
    title: 'LEGO Water',
    image: '/art/legowater.png',
    alt: 'LEGO Water',
    description: 'A fun LEGO-like fluid simulation',
    href: 'https://www.instagram.com/p/DNmvmOXAffC/',
  },
  {
    title: 'Portal',
    image: '/art/portal.png',
    alt: 'Portal',
    description: 'A VFX shot of a portal in a dark environment, inspired by Doctor Strange',
    href: 'https://www.instagram.com/p/DLfQNJfAJ7Q/',
  },
  {
    title: 'Cyberpunk City',
    image: '/art/cyberpunk.png',
    alt: 'Cyberpunk City',
    description: 'A gloomy cyberpunk-inspired scene densely packed with dark alleys and neon lights',
    href: 'https://www.instagram.com/p/DJqQghhgFq3/',
  },
  {
    title: 'Planets',
    image: '/art/earth_render.png',
    alt: 'Planets',
    description: 'A series of planet renders from our very own solar system',
    href: 'https://www.instagram.com/p/C5kCDTDA8-W/',
  },
  {
    title: 'Mountainous Landscape',
    image: '/art/mountains.png',
    alt: 'Mountainous Landscape',
    description: 'A snowy, semi-realistic mountainous landscape created in Gaea and Blender',
    href: 'https://www.instagram.com/p/C2782vvA2rb/',
  },
]

const MIN_ZOOM = 1
const MAX_ZOOM = 5

const SLIDE_MS = 350

const touchDistance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

function Lightbox({ art, onClose }) {
  const lenis = useLenis()

  const [shown, setShown] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const viewRef = useRef(null)

  const view = useRef({ scale: 1, x: 0, y: 0 })

  // Every close path — X, backdrop, Escape — converges here.
  const dismiss = useCallback(() => {
    sfx.chord('dismiss')
    setShown(false)
    setTimeout(onClose, SLIDE_MS)
  }, [onClose])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)

    lenis?.stop()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      lenis?.start()
    }
  }, [lenis, dismiss])

  useEffect(() => {
    const el = viewRef.current
    if (!el) return

    const apply = () => {
      const { scale, x, y } = view.current
      el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
    }

    const clamp = () => {
      const { scale } = view.current
      const maxX = Math.max(0, (el.offsetWidth * scale - window.innerWidth) / 2)
      const maxY = Math.max(0, (el.offsetHeight * scale - window.innerHeight) / 2)
      view.current.x = Math.min(maxX, Math.max(-maxX, view.current.x))
      view.current.y = Math.min(maxY, Math.max(-maxY, view.current.y))
    }

    const zoomAt = (clientX, clientY, next) => {
      const from = view.current.scale
      const to = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
      if (to === from) return

      const rect = el.getBoundingClientRect()

      const dx = clientX - (rect.left + rect.width / 2 - view.current.x)
      const dy = clientY - (rect.top + rect.height / 2 - view.current.y)
      view.current.x = dx - (dx - view.current.x) * (to / from)
      view.current.y = dy - (dy - view.current.y) * (to / from)
      view.current.scale = to

      if (to === MIN_ZOOM) {
        view.current.x = 0
        view.current.y = 0
      }
      clamp()
      apply()
      setZoomed(to > MIN_ZOOM)
    }

    const onWheel = (e) => {
      e.preventDefault()
      zoomAt(e.clientX, e.clientY, view.current.scale * Math.exp(-e.deltaY * 0.0015))
    }

    let pinchFrom = 0
    let pinchScale = 1
    let last = null

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchFrom = touchDistance(e.touches[0], e.touches[1])
        pinchScale = view.current.scale
        last = null
      } else if (e.touches.length === 1) {
        last = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchFrom > 0) {
        e.preventDefault()
        const [a, b] = [e.touches[0], e.touches[1]]
        zoomAt(
          (a.clientX + b.clientX) / 2,
          (a.clientY + b.clientY) / 2,
          pinchScale * (touchDistance(a, b) / pinchFrom)
        )
      } else if (e.touches.length === 1 && last && view.current.scale > MIN_ZOOM) {
        e.preventDefault()
        const t = e.touches[0]
        view.current.x += t.clientX - last.x
        view.current.y += t.clientY - last.y
        last = { x: t.clientX, y: t.clientY }
        clamp()
        apply()
      }
    }

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinchFrom = 0
      last = e.touches.length === 1
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : null
    }

    let dragging = null
    const onMouseDown = (e) => {
      if (view.current.scale <= MIN_ZOOM) return
      e.preventDefault()
      dragging = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e) => {
      if (!dragging) return
      view.current.x += e.clientX - dragging.x
      view.current.y += e.clientY - dragging.y
      dragging = { x: e.clientX, y: e.clientY }
      clamp()
      apply()
    }
    const onMouseUp = () => {
      dragging = null
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return createPortal(
    <div
      onClick={dismiss}
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={art.title}
        onClick={(e) => e.stopPropagation()}
        className={`relative transition-transform ease-out ${shown ? 'translate-y-0' : '-translate-y-[110vh]'}`}
        style={{ transitionDuration: `${SLIDE_MS}ms` }}
      >

        <div
          ref={viewRef}
          className={`relative overflow-hidden rounded-xl shadow-2xl touch-none will-change-transform ${zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        >
          <img
            src={art.image}
            alt={art.alt}
            draggable={false}
            className="block max-h-[90vh] max-w-[92vw] w-auto object-contain"
          />

          <div className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-6 pt-16 pb-5 transition-opacity duration-200 ${zoomed ? 'opacity-0' : 'opacity-100'}`}>
            <h3 className="text-white text-xl font-medium mb-1 drop-shadow-lg">{art.title}</h3>
            <p className="text-white/80 text-sm drop-shadow-lg">{art.description}</p>
          </div>
          <a
            href={art.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => sfx.chord('artLink')}
            className={`absolute top-4 right-4 bg-black/30 backdrop-blur-sm rounded-full p-2 hover:bg-black/40 transition-all duration-200 ${zoomed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <InstagramIcon className="w-5 h-5 text-white" />
          </a>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function Art() {
  const [openArt, setOpenArt] = useState(null)
  const close = useCallback(() => setOpenArt(null), [])

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-start relative z-30">

      <h1 className="sr-only">art</h1>
      <ArtTitle />

      <div className="mx-auto w-full max-w-[560px] px-6">
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          blender files always open with a &quot;default cube&quot;.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          reminder that everything below derives from that cube:
        </p>
      </div>

      <div className="container mx-auto mt-12 px-4 pb-16 max-w-6xl">

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-50">
          {artworks.map((art) => (
            <div key={art.title} className="min-h-[400px] flex items-center">
              <div className="group relative w-full">

                <div className="bg-transparent rounded-xl overflow-hidden shadow-sm group-hover:shadow-lg group-hover:scale-[1.02] transition-all duration-300">
                  <div className="relative aspect-[9/16] bg-gray-100 dark:bg-gray-900">
                    <img
                      src={art.image}
                      alt={art.alt}
                      className={`absolute inset-0 w-full h-full object-cover${art.imageClassName ? ` ${art.imageClassName}` : ''}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white text-lg font-medium mb-1 drop-shadow-lg">{art.title}</h3>
                      <p className="text-white/80 text-sm drop-shadow-lg">{art.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        sfx.chord('artOpen')
                        setOpenArt(art)
                      }}
                      aria-label={`View ${art.title} full size`}
                      className="absolute inset-0 z-10 cursor-pointer"
                    />

                    <a href={art.href} target="_blank" rel="noopener noreferrer" onClick={() => sfx.chord('artLink')} className="absolute top-4 right-4 z-20 bg-black/30 backdrop-blur-sm rounded-full p-2 hover:bg-black/40 transition-all duration-200">
                      <InstagramIcon className="w-5 h-5 text-white" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {openArt && <Lightbox art={openArt} onClose={close} />}
    </section>
  )
}
