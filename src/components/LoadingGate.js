'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ASSETS = ['name', 'projects', 'art']

const LoadingContext = createContext(null)

export function useAssetReady(id) {
  const markReady = useContext(LoadingContext)?.markReady
  return useCallback(() => markReady?.(id), [markReady, id])
}

export function useAssetLoaded(id) {
  return !!useContext(LoadingContext)?.ready[id]
}

export function useAllAssetsLoaded() {
  const ready = useContext(LoadingContext)?.ready
  return !!ready && ASSETS.every((id) => ready[id])
}

export default function LoadingGate({ children }) {
  const [ready, setReady] = useState({})

  const markReady = useCallback((id) => {
    setReady((r) => (r[id] ? r : { ...r, [id]: true }))
  }, [])

  const value = useMemo(() => ({ markReady, ready }), [markReady, ready])

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
}
