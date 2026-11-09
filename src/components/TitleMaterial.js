'use client'

import { useEffect, useState } from 'react'
import { TextureLoader } from 'three'

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

const aoCache = {}
function getAO(url) {
  if (!aoCache[url]) {
    const t = new TextureLoader().load(url)
    // flipY must be false (glTF UV origin) BEFORE first upload, and AO
    // samples linear — see CLAUDE.md "Title materials".
    t.flipY = false
    aoCache[url] = t
  }
  return aoCache[url]
}

export default function TitleMaterial({ aoUrl }) {
  const dark = useDarkTheme()
  const color = dark ? '#1f2937' : '#c5cad3'
  if (aoUrl) {
    return <meshBasicMaterial color={color} aoMap={getAO(aoUrl)} aoMapIntensity={1.5} toneMapped={false} />
  }
  return <meshBasicMaterial color={color} toneMapped={false} />
}
