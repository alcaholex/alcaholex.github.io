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

const FINAL = 'alex li'
// Symbol soup, so an unresolved slot never looks like a letter it is not.
// Grow it freely — no letter renders more than CYCLE of it, so length costs
// nothing. Each glyph must fit the fixed 0.7em cell below, which clips
// whatever overflows it: in Helvetica/Arial metrics that rules out @ (0.98em)
// and % and & (0.89/0.72em), which used to lose ink off both sides.
const POOL = 'abcdefghijklmnopqrstuvwxyz'
// How many candidates one letter cycles through, and the crux of this
// screen's performance budget. A letter's column is CYCLE glyphs tall and is
// promoted to its own compositing layer, so raster area and layer memory
// scale with THIS, not with the pool: at 8 that is a 576px column, where
// running the whole 26-glyph pool would be 1872px per letter and — past
// roughly 28 glyphs at DPR 2 — over the max texture size, dropping the
// animation off the compositor and onto the main thread. Which is the one
// thing this screen cannot afford: it is on screen precisely while that
// thread is jammed parsing models and compiling shaders.
const CYCLE_MAX = 8
const CYCLE = Math.min(CYCLE_MAX, POOL.length)
// Row pitch of the glyph columns, in em, and the height of the window that
// shows one row of one. It has to clear the font's whole content area —
// ascent plus descent, 1.117em in Arial/Arimo and 1.165em in Helvetica Neue —
// not just 1em. At line-height 1 the ink overflows its own row by ~0.06em top
// and bottom, so a descender (g, j, p, q, y) shows through the top of the
// window, under the glyph above it. Symbols mostly have no descender, which
// is why a letter pool exposes this and a symbol pool did not.
const GLYPH_BOX = 1.25
// Roughly how long a single glyph is held before flipping. The cycle time is
// derived from this rather than fixed, so the flicker stays legible whatever
// CYCLE is set to.
const GLYPH_MS = 45
// The bar cannot usefully be driven by real progress: there are only three
// checkpoints, and repainting them needs the main thread that loading has
// jammed, so it sits at zero and then jumps. It eases toward an asymptote on a
// timer instead and is completed the instant loading actually finishes —
// approaching CREEP_TARGET without reaching it, so it never looks finished
// early. One transform transition, composited, no JS after it starts.
const CREEP_TARGET = 0.9
const CREEP_MS = 8000
const CREEP_EASE = 'cubic-bezier(0.1, 0.75, 0.25, 1)'
const FINISH_MS = 400
// Gap between letters locking in, left to right, once loading finishes.
const SETTLE_STAGGER_MS = 100
// Must match the duration-700 on the overlay below.
const SWIPE_MS = 700

// Per-letter animation settings, spread so the columns never march in lockstep
// — that is what makes a fixed cycle read as random scrambling. The negative
// delays start each letter part way through its cycle, so they are already
// staggered on the very first frame. Deterministic, since this is
// server-rendered: Math.random() here would differ between server and client
// and trip hydration.
const CELLS = FINAL.split('').map((char, i) => ({
  char,
  // Each letter draws its own window into the pool, neighbours starting a
  // full window apart so they run on disjoint stretches of it rather than
  // near-identical ones. Every symbol still turns up across the wordmark;
  // no single column has to be tall enough to hold them all.
  glyphs: Array.from({ length: CYCLE }, (_, j) => POOL[(i * CYCLE + j) % POOL.length]),
  duration: (CYCLE * (GLYPH_MS + ((i * 7) % 5) * 6)) / 1000,
  delay: -((i * 13) % 11) * 0.09,
}))

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
  // How many letters, from the left, have locked to their final character.
  const [settled, setSettled] = useState(0)

  const markReady = useCallback((id) => {
    if (readyIds.current.has(id)) return
    readyIds.current.add(id)
    setReadyCount(readyIds.current.size)
  }, [])

  const isDone = timedOut || readyCount >= ASSETS.length
  const isSettled = settled >= FINAL.length
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

  // Loading finished: lock the letters in one at a time, left to right. The
  // letters still waiting keep spinning on their own — their animation is CSS,
  // so it needs nothing from here.
  useEffect(() => {
    if (!isDone) return
    let landed = 0
    const handle = setInterval(() => {
      landed += 1
      setSettled(landed)
      if (landed >= FINAL.length) clearInterval(handle)
    }, SETTLE_STAGGER_MS)
    return () => clearInterval(handle)
  }, [isDone])

  // Keeps the glass cursor out of the loading screen without either component
  // having to know about the other: globals.css keys off this class. Released
  // as the gate starts swiping, so the handover is hidden by that motion rather
  // than happening in plain sight afterwards.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('is-loading', !isSettled)
    return () => root.classList.remove('is-loading')
  }, [isSettled])

  // The name is whole — swipe away, then unmount once the transition is over.
  useEffect(() => {
    if (!isSettled) return
    const handle = setTimeout(() => setIsMounted(false), SWIPE_MS)
    return () => clearTimeout(handle)
  }, [isSettled])

  return (
    <LoadingContext.Provider value={markReady}>
      {isMounted && (
        // Above the navbar (z-50) as well as the sections, so it really does
        // cover everything. Both are in the root stacking context, so this wins
        // wherever the gate itself sits in the tree.
        <div
          aria-hidden={isDone}
          className={`fixed inset-0 z-[100] bg-gray-50 flex items-center justify-center transition-transform duration-700 ease-in-out will-change-transform ${
            isSettled ? '-translate-y-full pointer-events-none' : 'translate-y-0'
          }`}
        >
          <div role="status" aria-live="polite">
            <span className="sr-only">{isDone ? 'Loaded' : 'Loading'}</span>
            {/* Each letter is a one-glyph window onto a column of candidates,
                stepped by the CSS animation in globals.css. Fixed-width cells
                because the pool's glyphs differ in width, and letting them size
                themselves would jitter the whole name sideways as they change.
                Every box here is GLYPH_BOX tall — the window, each row, and a
                settled letter alike — and the line-height matches, which is
                what keeps a row's ink inside its own row and lets the column
                step cleanly. The cell also clips horizontally,
                so POOL is restricted to glyphs narrower than 0.7em — see the
                note there before adding to it. Hidden from screen readers —
                the live region above is what announces state. */}
            <div
              aria-hidden="true"
              className="flex font-display text-5xl md:text-7xl font-semibold text-gray-900 select-none"
              style={{ lineHeight: GLYPH_BOX }}
            >
              {CELLS.map((cell, i) => (
                <span
                  key={i}
                  className="inline-block w-[0.7em] overflow-hidden text-center"
                  style={{ height: `${GLYPH_BOX}em` }}
                >
                  {/* The gap in "alex li" flickers like every other slot, and
                      only resolves to nothing once it settles. */}
                  {i < settled ? (
                    <span className="block" style={{ height: `${GLYPH_BOX}em` }}>{cell.char === ' ' ? ' ' : cell.char}</span>
                  ) : (
                    <span
                      className="block text-gray-800 will-change-transform"
                      style={{
                        animation: `scramble ${cell.duration}s steps(${CYCLE}) ${cell.delay}s infinite`,
                      }}
                    >
                      {cell.glyphs.map((glyph, j) => (
                        <span key={j} className="block" style={{ height: `${GLYPH_BOX}em` }}>
                          {glyph}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              ))}
            </div>

            {/* Sized off the wordmark above it, since this wrapper shrinks to
                that. scaleX rather than width for the same reason the letters
                are a CSS animation: width is laid out on the main thread, which
                is precisely what is jammed during load, whereas a transform is
                composited and stays smooth. A transition rather than a keyframe
                animation so finishing early interrupts cleanly, picking up from
                wherever the creep had reached instead of snapping. */}
            {/* mt-4, not the mt-6 this had while the glyph boxes were 1em:
                GLYPH_BOX leaves ~0.13em of descender space under the letters,
                so the smaller margin keeps the gap looking the same. */}
            <div className="mt-4 h-1 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full w-full origin-left rounded-full bg-gray-900"
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
