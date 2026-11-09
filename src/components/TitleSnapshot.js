'use client'

import { useAllAssetsLoaded } from './LoadingGate'

// Geometry measured from the live scenes at 1440x900; vw/percent units track
// every viewport because the titles render at a fixed fraction of viewport
// width, centered in the window — see CLAUDE.md "Title snapshots".
const GEOM = {
  name: { width: '69.48vw', left: '49.91%', top: '50.17%' },
  projects: { width: '90.52vw', left: '48.91%', top: '50.19%' },
  art: { width: '34.76vw', left: '49.53%', top: '50.19%' },
}

export default function TitleSnapshot({ id }) {
  // All three fade together — a lone early scene popping in reads as glitch.
  const loaded = useAllAssetsLoaded()
  const g = GEOM[id]
  const imgStyle = {
    position: 'absolute',
    left: g.left,
    top: g.top,
    width: g.width,
    maxWidth: 'none',
    transform: 'translate(-50%, -50%)',
  }
  return (
    <div
      aria-hidden="true"
      data-snapshot={id}
      className="pointer-events-none absolute inset-x-0 top-0 z-50 h-screen"
      style={{ opacity: loaded ? 0 : 1, transition: 'opacity 400ms ease' }}
    >
      <img src={`/titles/${id}-light.webp`} alt="" className="dark:hidden" style={imgStyle} />
      <img src={`/titles/${id}-dark.webp`} alt="" className="hidden dark:block" style={imgStyle} />
    </div>
  )
}
