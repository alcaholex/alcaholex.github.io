'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Every 3D element on the page. The gate holds until each one has loaded its
// model AND drawn its first frame, so the whole site is warm before anyone sees
// it — no mid-scroll hitch when a section swipes in. A new canvas means a new id
// here and a matching useAssetReady() call in the component.
const ASSETS = ['name', 'projects', 'art']

// Nobody gets trapped behind the loader: if a canvas never reports — no WebGL,
// a lost context, a model that 404s — the site opens anyway.
const TIMEOUT_MS = 15000

// The bar cannot usefully be driven by real progress: there are only three
// checkpoints, and repainting them needs the main thread that loading has
// jammed, so it would sit at zero and then jump. It eases toward an asymptote on
// a timer instead and is completed the instant loading actually finishes —
// approaching CREEP_TARGET without reaching it, so it never looks finished
// early. One transform transition, composited, no JS after it starts.
const CREEP_TARGET = 0.9
const CREEP_MS = 8000
const CREEP_EASE = 'cubic-bezier(0.1, 0.75, 0.25, 1)'
const FINISH_MS = 400
// Must match the duration-700 on the overlay below.
const SWIPE_MS = 700

const LoadingContext = createContext(null)

// Returns a stable callback for a 3D element to announce it is ready to draw.
export function useAssetReady(id) {
  const markReady = useContext(LoadingContext)
  return useCallback(() => markReady?.(id), [markReady, id])
}

export default function LoadingGate({ children }) {
  // Ids live in a ref so a component reporting twice (StrictMode's double
  // effects, a remount) cannot count itself twice; the state is just the size.
  const readyIds = useRef(null)
  if (readyIds.current === null) readyIds.current = new Set()
  const [readyCount, setReadyCount] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  // Kept mounted through the swipe, then dropped so the canvases below get their
  // pointer events and the overlay stops costing a composited layer.
  const [isMounted, setIsMounted] = useState(true)
  // True once the bar has finished filling, which is what releases the screen —
  // not the last asset landing.
  const [arrived, setArrived] = useState(false)

  const markReady = useCallback((id) => {
    if (readyIds.current.has(id)) return
    readyIds.current.add(id)
    setReadyCount(readyIds.current.size)
  }, [])

  const isDone = timedOut || readyCount >= ASSETS.length

  // Kicks the creep off one frame after mount: a transition needs a starting
  // value to move away from, so the bar has to paint at zero first.
  const [creeping, setCreeping] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setCreeping(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => clearTimeout(handle)
  }, [])

  // Let the last stretch of the bar actually play before the screen goes:
  // cutting away the instant the final asset lands would leave it visibly short.
  useEffect(() => {
    if (!isDone) return
    const handle = setTimeout(() => setArrived(true), FINISH_MS)
    return () => clearTimeout(handle)
  }, [isDone])

  // Keeps the glass cursor out of the loading screen without either component
  // having to know about the other: globals.css keys off this class. Released
  // as the gate starts swiping, so the handover is hidden by that motion rather
  // than happening in plain sight afterwards.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('is-loading', !arrived)
    return () => root.classList.remove('is-loading')
  }, [arrived])

  // Full — swipe away, then unmount once the transition is over.
  useEffect(() => {
    if (!arrived) return
    const handle = setTimeout(() => setIsMounted(false), SWIPE_MS)
    return () => clearTimeout(handle)
  }, [arrived])

  return (
    <LoadingContext.Provider value={markReady}>
      {isMounted && (
        // Above the navbar (z-50) as well as the sections, so it really does
        // cover everything. Both are in the root stacking context, so this wins
        // wherever the gate itself sits in the tree.
        <div
          aria-hidden={isDone}
          className={`fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center transition-transform duration-700 ease-in-out will-change-transform ${
            arrived ? '-translate-y-full pointer-events-none' : 'translate-y-0'
          }`}
        >
          <div role="status" aria-live="polite">
            <span className="sr-only">{isDone ? 'Loaded' : 'Loading'}</span>

            {/* scaleX rather than width: width is laid out on the main thread,
                which is precisely what is jammed during load, whereas a
                transform is composited and stays smooth. A transition rather
                than a keyframe animation so finishing early interrupts cleanly,
                picking up from wherever the creep had reached instead of
                snapping. */}
            <div
              aria-hidden="true"
              className="h-2 w-[min(80vw,360px)] overflow-hidden rounded-full bg-gray-200"
            >
              <div
                className="h-full w-full origin-left rounded-full bg-gray-400"
                style={{
                  transform: `scaleX(${isDone ? 1 : creeping ? CREEP_TARGET : 0})`,
                  transitionProperty: 'transform',
                  transitionDuration: isDone ? `${FINISH_MS}ms` : `${CREEP_MS}ms`,
                  transitionTimingFunction: isDone ? 'ease-out' : CREEP_EASE,
                }}
              />
            </div>
          </div>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  )
}
