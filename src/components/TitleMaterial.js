'use client'

import { useEffect, useState } from 'react'
import { TextureLoader } from 'three'

// Tracks the navbar's dark class so the flat titles restyle on theme flips.
function useDarkTheme() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setDark(root.classList.contains('dark'))
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return dark
}

// Hand-rolled loader, NOT drei useTexture: flipY must be false BEFORE the
// first GPU upload (glTF UVs are top-left origin), and useTexture
// force-uploads on load ahead of any onLoad mutation — the AO renders
// mirrored with large areas sampling the bake's empty background.
const aoCache = {}
function getAO(url) {
  if (!aoCache[url]) {
    const t = new TextureLoader().load(url)
    t.flipY = false
    // AO is data, not colour: sample linear or the sRGB decode warps the
    // occlusion curve and sharpens seam discontinuities.
    aoCache[url] = t
  }
  return aoCache[url]
}

// One flat unlit color per theme, chosen to sit against that theme's page
// background. toneMapped off or ACES drags the colors off their CSS values.
// aoUrl (optional): a Blender AO bake multiplied over the flat color —
// re-export the model's GLB whenever its UV unwrap changes.
export default function TitleMaterial({ aoUrl }) {
  const dark = useDarkTheme()
  const color = dark ? '#1f2937' : '#c5cad3'
  if (aoUrl) {
    return <meshBasicMaterial color={color} aoMap={getAO(aoUrl)} aoMapIntensity={1.5} toneMapped={false} />
  }
  return <meshBasicMaterial color={color} toneMapped={false} />
}
