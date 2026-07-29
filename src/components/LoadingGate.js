'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLenis } from './SmoothScroll'
import * as sfx from './sound'

const ASSETS = ['name', 'projects', 'art']

// Escape hatch: if a canvas never reports (no WebGL, lost context, 404ing
// model), the site opens anyway.
const TIMEOUT_MS = 15000

// The creep is a single CSS transition, NOT a rAF loop: the main thread the
// loop would tick on is the one loading has jammed, so JS-driven fills
// stutter badly. Transforms animate on the compositor and stay smooth.
// The bar creeps toward 90% on the slow curve, but the moment everything has
// reported (past a short floor so the gate never just flashes) it runs out
// to 100% — a slow climb only ever means loading is genuinely slow.
const CREEP_SCALE = 0.9
const CREEP_MS = 8000
const CREEP_EASE = 'cubic-bezier(0.1, 0.75, 0.25, 1)'
const MIN_SHOW_MS = 900
const FINISH_MS = 600

// Bar and button are one element: the filled bar shrinks in length and grows
// in height until it IS the button, then the label fades in.
const BAR_W = 'min(85vw, 720px)'
const BAR_H = 44
const BTN_W = 'min(80vw, 340px)'
const BTN_H = 120
const MORPH_MS = 500
const LABEL_FADE_MS = 250

// Exit, after the visitor clicks through: a plain fade.
const EXIT_FADE_MS = 600
const EXIT_TOTAL_MS = 700

const LoadingContext = createContext(null)

export function useAssetReady(id) {
  const markReady = useContext(LoadingContext)
  return useCallback(() => markReady?.(id), [markReady, id])
}

export default function LoadingGate({ children }) {
  const readyIds = useRef(null)
  if (readyIds.current === null) readyIds.current = new Set()

  const [readyCount, setReadyCount] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  // Flipped one frame after mount so the creep transition has a 0 to leave.
  const [creeping, setCreeping] = useState(false)
  // The gate has been visible long enough to not just flash.
  const [minShown, setMinShown] = useState(false)

  // 'loading' → creeping to 90; 'finishing' → running to 100; 'ready' →
  // morphed into the button, waiting; 'exit' → fade-out; 'gone' → unmounted.
  const [phase, setPhase] = useState('loading')
  const arrived = phase === 'exit' || phase === 'gone'
  const isReady = phase === 'ready'

  const isDone = timedOut || readyCount >= ASSETS.length

  const markReady = useCallback((id) => {
    if (readyIds.current.has(id)) return
    readyIds.current.add(id)
    setReadyCount(readyIds.current.size)
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setCreeping(true))
    const minHandle = setTimeout(() => setMinShown(true), MIN_SHOW_MS)
    const outHandle = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(minHandle)
      clearTimeout(outHandle)
    }
  }, [])

  useEffect(() => {
    if (phase === 'loading' && minShown && isDone) setPhase('finishing')
  }, [phase, minShown, isDone])

  useEffect(() => {
    if (phase !== 'finishing') return
    const handle = setTimeout(() => setPhase('ready'), FINISH_MS)
    return () => clearTimeout(handle)
  }, [phase])

  // is-loading also locks native scrolling (html.is-loading has overflow:
  // hidden) until the visitor clicks through.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('is-loading', !arrived)
    return () => root.classList.remove('is-loading')
  }, [arrived])

  // overflow: hidden only stops user-initiated scrolling — Lenis moves
  // scrollTop programmatically from wheel events, so it must be stopped too.
  const lenis = useLenis()
  useEffect(() => {
    if (!lenis) return
    if (arrived) {
      lenis.start()
      return
    }
    lenis.stop()
    return () => lenis.start()
  }, [lenis, arrived])

  useEffect(() => {
    if (phase !== 'exit') return
    const handle = setTimeout(() => setPhase('gone'), EXIT_TOTAL_MS)
    return () => clearTimeout(handle)
  }, [phase])

  // The gate doesn't open itself: the visitor walks through it. That click is
  // the site's first guaranteed user gesture, so it unlocks audio for
  // everything downstream.
  const proceed = () => {
    sfx.unlock()
    setPhase('exit')
  }

  return (
    <LoadingContext.Provider value={markReady}>
      {phase !== 'gone' && (
        <div
          aria-hidden={arrived}
          className={`fixed inset-0 z-[100] grid select-none place-items-center overflow-hidden bg-gray-50 dark:bg-gray-950 ${
            arrived ? 'pointer-events-none' : ''
          }`}
          style={{
            opacity: arrived ? 0 : 1,
            transition: `opacity ${EXIT_FADE_MS}ms ease`,
          }}
        >
          <span role="status" className="sr-only">
            {isReady || arrived ? 'Loaded' : 'Loading'}
          </span>

          {/* The progress bar is the button-to-be; disabled (not just inert)
              until the morph so it cannot be clicked or tabbed to early. */}
          <button
            type="button"
            onClick={proceed}
            disabled={!isReady}
            className={`relative flex items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-900 ${
              isReady ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
            }`}
            style={{
              width: isReady ? BTN_W : BAR_W,
              height: isReady ? `${BTN_H}px` : `${BAR_H}px`,
              transition: `width ${MORPH_MS}ms cubic-bezier(0.65, 0, 0.35, 1), height ${MORPH_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
            }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-left rounded-full bg-gray-300 dark:bg-gray-700"
              style={{
                transform:
                  phase === 'loading'
                    ? creeping
                      ? `scaleX(${CREEP_SCALE})`
                      : 'scaleX(0)'
                    : 'scaleX(1)',
                transitionProperty: 'transform',
                transitionDuration: phase === 'loading' ? `${CREEP_MS}ms` : `${FINISH_MS}ms`,
                transitionTimingFunction: phase === 'loading' ? CREEP_EASE : 'ease-out',
              }}
            />
            <span
              className="relative text-[2.5rem] text-gray-500 dark:text-gray-400"
              style={{
                fontFamily: 'var(--font-fascinate)',
                opacity: isReady ? 1 : 0,
                transition: `opacity ${LABEL_FADE_MS}ms ease ${isReady ? Math.round(MORPH_MS * 0.6) : 0}ms`,
              }}
            >
              CONTINUE
            </span>
          </button>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  )
}
