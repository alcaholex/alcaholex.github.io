'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ASSETS = ['name', 'projects', 'art']

// Escape hatch: if a canvas never reports (no WebGL, lost context, 404ing
// model), the site opens anyway.
const TIMEOUT_MS = 15000

// The bar creeps toward (never reaching) this on a timer — there are only
// three real checkpoints, and the main thread they would repaint on is the
// one loading has jammed. scaleX not width for the same reason: transforms
// stay composited.
const CREEP_TARGET = 0.9
const CREEP_MS = 8000
const CREEP_EASE = 'cubic-bezier(0.1, 0.75, 0.25, 1)'
const FINISH_MS = 400

const SWIPE_MS = 700

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

  const [isMounted, setIsMounted] = useState(true)

  const [arrived, setArrived] = useState(false)

  const markReady = useCallback((id) => {
    if (readyIds.current.has(id)) return
    readyIds.current.add(id)
    setReadyCount(readyIds.current.size)
  }, [])

  const isDone = timedOut || readyCount >= ASSETS.length

  const [creeping, setCreeping] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setCreeping(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => clearTimeout(handle)
  }, [])

  useEffect(() => {
    if (!isDone) return
    const handle = setTimeout(() => setArrived(true), FINISH_MS)
    return () => clearTimeout(handle)
  }, [isDone])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('is-loading', !arrived)
    return () => root.classList.remove('is-loading')
  }, [arrived])

  useEffect(() => {
    if (!arrived) return
    const handle = setTimeout(() => setIsMounted(false), SWIPE_MS)
    return () => clearTimeout(handle)
  }, [arrived])

  return (
    <LoadingContext.Provider value={markReady}>
      {isMounted && (
        <div
          aria-hidden={isDone}
          className={`fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-950 flex items-center justify-center transition-transform duration-700 ease-in-out will-change-transform ${
            arrived ? '-translate-y-full pointer-events-none' : 'translate-y-0'
          }`}
        >
          <div role="status" aria-live="polite">
            <span className="sr-only">{isDone ? 'Loaded' : 'Loading'}</span>

            <div
              aria-hidden="true"
              className="h-2 w-[min(80vw,360px)] overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
            >
              <div
                className="h-full w-full origin-left rounded-full bg-gray-400 dark:bg-gray-600"
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
