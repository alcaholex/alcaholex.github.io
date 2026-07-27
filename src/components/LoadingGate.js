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

// Must match the duration-500 on the overlay below.
const FADE_MS = 500

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
  // Kept mounted through the fade, then dropped so the canvases below get their
  // pointer events and the overlay stops costing a composited layer.
  const [isMounted, setIsMounted] = useState(true)

  const markReady = useCallback((id) => {
    if (readyIds.current.has(id)) return
    readyIds.current.add(id)
    setReadyCount(readyIds.current.size)
  }, [])

  const isDone = timedOut || readyCount >= ASSETS.length

  useEffect(() => {
    const handle = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => clearTimeout(handle)
  }, [])

  useEffect(() => {
    if (!isDone) return
    const handle = setTimeout(() => setIsMounted(false), FADE_MS)
    return () => clearTimeout(handle)
  }, [isDone])

  return (
    <LoadingContext.Provider value={markReady}>
      {isMounted && (
        // Above the navbar (z-50) as well as the sections, so it really does
        // cover everything. Both are in the root stacking context, so this wins
        // wherever the gate itself sits in the tree.
        <div
          aria-hidden={isDone}
          className={`fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center transition-opacity duration-500 ${
            isDone ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="text-center" role="status">
            <div className="w-12 h-12 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium mb-4">loading...</p>
            <div className="w-40 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(readyCount / ASSETS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  )
}
