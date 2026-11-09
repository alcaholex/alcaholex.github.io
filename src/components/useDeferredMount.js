'use client'

import { useEffect, useState } from 'react'

// Mounting a Canvas creates a WebGL context and kicks GLB parse + shader
// compile; deferred so that work lands in its own task after hydration,
// staggered per scene so the three never stack — see CLAUDE.md.
export default function useDeferredMount(delay = 0) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    let raf, inner
    // rAF then timeout: forces a paint between hydration and the mount task.
    const h = setTimeout(() => {
      raf = requestAnimationFrame(() => {
        inner = setTimeout(() => setMounted(true), 0)
      })
    }, delay)
    return () => {
      clearTimeout(h)
      clearTimeout(inner)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [delay])
  return mounted
}
