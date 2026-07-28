'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLenis } from './SmoothScroll'

// ─── edit the map here ───────────────────────────────────────────────────────
// Stations carry no positions — the map lays itself out from the routes
// below (engine ported from metro-map-generator_1.html). A station needs an
// id, a year (shown in the modal a click opens; time on the map itself is
// encoded by each route's station order), a title, and a body for that
// modal (image optional).
//
// How lines become the layout:
// - Trunk lines run as straight 45° tracks, one per line, left to right in
//   listed order. Stations take successive unit steps down the track; a
//   station shared with a crosstown is pinned to the crosstown's row,
//   stretching the trunk's spacing around it.
// - horizontal: true makes a crosstown: its row sits at the depth of the
//   deepest trunk station threaded onto it, its trunk stations sit where
//   their trunk crosses that row, and its own stops hang off the ends.
// - A line whose ONLY shared stop is its first is a branch: it claims no
//   trunk and instead walks its stops 45° down-left out of the fork,
//   rotating away whenever a step would sit on, ride along, or cross
//   another line.
// - A trunk with no stations still draws as a bare ribbon.
// - A repair pass then nudges any non-interchange station that landed on a
//   foreign station or track, so only listed-shared stops read as
//   interchanges.
//
// VARIANCE (0–100) adds seeded "long jogs": whole runs of single-line
// stations shift sideways as one piece with 45°/90° ramps, checked against
// every other line so the wander can never create a crossing or overlap.
// JOG_SEED picks which jogs happen; reroll it until the wander looks right.
//
// shift: { x, y } nudges a station by grid units after layout (the repair
// pass still keeps things clean). labelSide ('ne' default, 'sw', 'se',
// 'nw') and labelNudge: [dx, dy] place the angled names, as before.
const VARIANCE = 50
const JOG_SEED = 'alex-2'

const NODES = [
  { id: 'prog', year: '2015', title: 'learning to code', labelSide: 'sw',
    body: 'where it all started as a kid- my dad taught me the basics of python, and i continued to explore for the sake of competitive programming.' },
  { id: 'lego', year: '2018', title: 'lego robotics',
    body: 'with my dad as our coach, my friends and i were building and programming lego mindstorms sets. as my first taste of robotics, it was a great way to build problem-solving skills.' },
  { id: 'blender', year: '2020', title: 'first steps in 3d', labelSide: 'sw',
    body: 'i learned blender in an attempt to create models for my robots. little did i know that blender would instead lead me down a road of creative expression.' },
  { id: 'unity', year: '2020', title: 'learning game development', labelSide: 'sw',
    body: 'i was a bored fifth grader during the pandemic, so when i stumbled across youtube game devlogs, i decided that unity would have been fun to try...' },
  { id: 'steam', year: '2021', title: 'published on steam', labelSide: 'sw',
    body: 'malfunction was my first ever unity project, and through trials and tribulations, it was the game i managed to publish on steam. truly poetic.' },
  { id: 'wc1', year: '2022', title: 'robotics world championship',
    body: 'my team eventually became consistent champions of ontario in wro, and we so traveled to germany for my first ever international competition' },
  { id: 'vex', year: '2023', title: 'more robotics',
    body: 'in high school, i decided to move on from lego and explore the world of vex robotics.' },
  { id: 'cad', year: '2023', title: 'computer aided design',
    body: 'i picked up cad to design robot parts properly before building them. eventually, cad became one of my most valuable tools.' },
  { id: 'qwerty', year: '2024', title: 'team 3004a', labelSide: 'sw',
    body: 'i decided to found a new robotics team and lead it to success, dragging along several new friends from high school.' },
  { id: 'climb', year: '2024', title: 'climbing vex robot', labelSide: 'sw',
    body: 'in the vex "high stakes" season, i designed and built one of the first climbing robots. not only did it make my team famous within the vex world, but it also motivated me to compete even harder.' },
  { id: 'provs', year: '2026', title: 'winning big', labelSide: 'sw',
    body: 'i took home the big one at provincials as an underdog. it was a testament to the power of perseverance, even when the odds were against me. my team was a fully independent team, pitted against some of the best in the world. and so, we went to the world championship.' },
  // sw, reading in from the lower-left: its ne ray would run back up the
  // fork into the cad interchange.
  { id: 'more', year: '2026', title: 'more engineering projects', labelSide: 'se', shift: { x: 5, y: -1 },
    body: 'more and more engineering projects, always in progress.' },
  { id: 'itch', year: '2021', title: 'itch publishing', labelSide: 'sw',
    body: 'when i discovered itch.io, i was naturally excited to share my creations with the world.' },
  { id: 'blender1', year: '2021', title: 'getting competent in blender', labelSide: 'sw',
    body: 'eventually, following tutorial after tutorial, i became proficient enough to create my own low-poly models.' },
  // se: its sw ray would lie across the blue trunk just below the
  // blender1 interchange.
  { id: 'blender2', year: '2024', title: 'posting art in blender', labelSide: 'se', shift: { x: 1, y: -3 },
    body: 'as i entered high school and i created an instagram account, i started sharing my blender work with my friends. at this point, my blender skills were really beginning to show.' },
]

const LINES = [
  { id: 'code', name: 'code line', color: '#4b6fb0',
    stations: ['prog', 'lego', 'blender1', 'unity', 'itch', 'steam'] },
  { id: 'robotics', name: 'robotics line', color: '#c2504f',
    stations: ['lego', 'wc1', 'vex', 'cad', 'qwerty', 'climb', 'vexsim', 'provs'] },
  // Branch off cad: yellow forks down-left while green runs level through
  // and red continues down-right — a three-way split at one interchange.
  { id: 'engineering', name: 'engineering line', color: '#d0a53e',
    stations: ['cad', 'more'] },
  // Crosstown through cad: the engine pins cad's trunk to this row and
  // stretches red around it, so the fork sits ON the green line.
  { id: 'making', name: 'making line', color: '#3f8f60', horizontal: true,
    stations: ['blender', 'blender1', 'cad', 'blender2'] },
]
// ─────────────────────────────────────────────────────────────────────────────

const NODE_IDS = new Set(NODES.map((n) => n.id))

// For opening the right modal from a pointer id.
const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]))

// Which lines serve each station — station discs, termini and the physics
// coupling all read from this. Unknown ids in a route are dropped so a
// half-finished edit above never crashes the page.
const STATION_LINES = new Map(NODES.map((n) => [n.id, []]))
LINES.forEach((line) => {
  line.stations = line.stations.filter((s) => NODE_IDS.has(s))
  line.stations.forEach((s) => STATION_LINES.get(s).push(line))
})

const homeLineOf = (id) => {
  const lines = STATION_LINES.get(id)
  const verticals = lines.filter((l) => !l.horizontal)
  const through = (arr) =>
    arr.find((l) => {
      const k = l.stations.indexOf(id)
      return k > 0 && k < l.stations.length - 1
    })
  return through(verticals) || verticals[0] || through(lines) || lines[0]
}

// Station grammar, sized against the thick ribbons: an ordinary stop is a
// small white circle punched into the line; an interchange is a bigger
// white disc with a thin ink outline; a terminus the same, ringed in its
// line's colour.
const STATION_META = new Map(
  NODES.map((n) => {
    const lines = STATION_LINES.get(n.id)
    const home = homeLineOf(n.id)
    const interchange = lines.length > 1
    const terminus =
      !interchange &&
      !!home &&
      (home.stations[0] === n.id || home.stations[home.stations.length - 1] === n.id)
    return [
      n.id,
      {
        interchange,
        terminus,
        color: home ? home.color : '#9ca3af',
        size: interchange ? 15 : terminus ? 11 : 5,
        side: n.labelSide || 'ne',
        nudge: n.labelNudge || [0, 0],
      },
    ]
  })
)

// Who tugs on whom: consecutive stations on a route, so a drag ripples along
// the line the way a real map would never dare. Each edge remembers which
// line it belongs to, so a drag's ripple can be confined to the dragged
// station's own routes instead of leaking through interchanges onto every
// connected line.
const NEIGHBORS = new Map(NODES.map((n) => [n.id, []]))
LINES.forEach((line) => {
  for (let i = 1; i < line.stations.length; i++) {
    NEIGHBORS.get(line.stations[i - 1]).push({ id: line.stations[i], line: line.id })
    NEIGHBORS.get(line.stations[i]).push({ id: line.stations[i - 1], line: line.id })
  }
})

// Route steps out of a station, for the modal's back/next buttons: its
// predecessor and successor on every line serving it, so a junction offers
// one button per line and direction. A neighbour reachable along two lines
// appears once, under the first line listed.
const stepsFrom = (id) => {
  const back = []
  const next = []
  const seen = { back: new Set(), next: new Set() }
  STATION_LINES.get(id).forEach((line) => {
    const k = line.stations.indexOf(id)
    const b = k > 0 ? line.stations[k - 1] : null
    const n = k >= 0 && k < line.stations.length - 1 ? line.stations[k + 1] : null
    if (b && !seen.back.has(b)) {
      seen.back.add(b)
      back.push({ id: b, line })
    }
    if (n && !seen.next.has(n)) {
      seen.next.add(n)
      next.push({ id: n, line })
    }
  })
  return { back, next }
}

/* ─── generation, ported from metro-map-generator_1.html ─────────────────────
   Layout tuning is in grid units: one unit is one station step along a
   track. Pixels come later — the finished map is scaled to the column. */
const TRUNK_GAP = 4 // units of horizontal offset between successive trunks
const XT_GAP_LEFT = 2 // crosstown-only stops hung left of the first interchange
const XT_GAP_RIGHT = 1 // ... and right of the last interchange
const BRANCH_STEP = 1 // units per stop walking down-left out of a fork

const EPS = 1e-6
const DIRS8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

// Octilinear decomposition of a segment: 1 or 2 pieces, straight first,
// 45° into the destination. Continuous in its endpoints, which is what
// keeps the grammar intact even while stations are being dragged.
function segPieces(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, adx = Math.abs(dx), ady = Math.abs(dy)
  if (adx < EPS && ady < EPS) return []
  if (adx < EPS || ady < EPS || Math.abs(adx - ady) < EPS) return [[a, b]]
  const m = adx > ady
    ? { x: a.x + Math.sign(dx) * (adx - ady), y: a.y }
    : { x: a.x, y: a.y + Math.sign(dy) * (ady - adx) }
  return [[a, m], [m, b]]
}
function ptSegDist(p, a, b) {
  const ux = b.x - a.x, uy = b.y - a.y, L2 = ux * ux + uy * uy
  if (L2 < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * ux + (p.y - a.y) * uy) / L2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + ux * t), p.y - (a.y + uy * t))
}
function collinearOverlap(a, b, c, d) {
  const ux = b.x - a.x, uy = b.y - a.y, vx = d.x - c.x, vy = d.y - c.y
  if (Math.abs(ux * vy - uy * vx) > 1e-6) return false
  if (Math.abs((c.x - a.x) * uy - (c.y - a.y) * ux) > 1e-6) return false
  const L2 = ux * ux + uy * uy
  if (L2 < 1e-12) return false
  let t1 = ((c.x - a.x) * ux + (c.y - a.y) * uy) / L2
  let t2 = ((d.x - a.x) * ux + (d.y - a.y) * uy) / L2
  if (t1 > t2) { const t = t1; t1 = t2; t2 = t }
  return Math.min(t2, 1) - Math.max(t1, 0) > 1e-4
}
function segCrossPoint(a, b, c, d) {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y
  const rxs = rx * sy - ry * sx
  if (Math.abs(rxs) < 1e-9) return null
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / rxs
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / rxs
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null
  return { x: a.x + rx * t, y: a.y + ry * t }
}
function segSegClear(s, t, margin) {
  if (segCrossPoint(s[0], s[1], t[0], t[1])) return false
  if (collinearOverlap(s[0], s[1], t[0], t[1])) return false
  return Math.min(
    ptSegDist(s[0], t[0], t[1]), ptSegDist(s[1], t[0], t[1]),
    ptSegDist(t[0], s[0], s[1]), ptSegDist(t[1], s[0], s[1])
  ) >= margin
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashSeed(str) {
  str = String(str).trim()
  if (/^\d+$/.test(str)) return parseInt(str, 10) >>> 0
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function layoutMap(nodes, lines) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const pos = new Map() // id -> {x,y} in grid units
  const linesOf = new Map() // id -> [line ids]
  lines.forEach((L) => L.stations.forEach((id) => {
    if (!linesOf.has(id)) linesOf.set(id, [])
    linesOf.get(id).push(L.id)
  }))
  const owner = new Map() // id -> first listed line containing it
  lines.forEach((L) => L.stations.forEach((id) => { if (!owner.has(id)) owner.set(id, L.id) }))

  /* classify */
  const kinds = new Map() // line id -> 'trunk' | 'branch' | 'crosstown'
  lines.forEach((L) => {
    if (L.horizontal) { kinds.set(L.id, 'crosstown'); return }
    const first = L.stations[0]
    const forkFirst = first !== undefined && owner.get(first) !== L.id
    const laterShared = L.stations.slice(1).some((id) => linesOf.get(id).length > 1)
    kinds.set(L.id, forkFirst && !laterShared ? 'branch' : 'trunk')
  })

  /* trunk offsets, in listed order */
  const trunkC = new Map()
  let c = 0
  lines.forEach((L) => { if (kinds.get(L.id) === 'trunk') { trunkC.set(L.id, c); c += TRUNK_GAP } })

  /* pass 1: natural depths along each trunk (foreign lead-in stops keep
     their own depth; the first owned stop starts level with the fork) */
  const natural = new Map()
  lines.forEach((L) => {
    if (kinds.get(L.id) !== 'trunk') return
    let d = 0
    L.stations.forEach((id) => {
      if (owner.get(id) !== L.id) { if (natural.has(id)) d = natural.get(id); return }
      natural.set(id, d); d += 1
    })
  })

  /* crosstown rows: pulled down to the deepest threaded trunk station.
     A crosstown with no trunk stations yet gets its own free row below the
     map, so a freshly added line avoids everything instead of slicing
     through it. */
  let maxNat = 0
  natural.forEach((v) => { maxNat = Math.max(maxNat, v) })
  let freeRows = 0
  const rowY = new Map()
  lines.forEach((L) => {
    if (kinds.get(L.id) !== 'crosstown') return
    if (!L.stations.length) { rowY.set(L.id, 0); return }
    let y = -1
    L.stations.forEach((id) => { if (natural.has(id)) y = Math.max(y, natural.get(id)) })
    if (y < 0) y = maxNat + 1 + freeRows++
    rowY.set(L.id, y)
  })
  const pinY = new Map() // trunk station id -> crosstown row it is pinned to
  lines.forEach((L) => {
    if (kinds.get(L.id) !== 'crosstown') return
    L.stations.forEach((id) => { if (natural.has(id)) pinY.set(id, rowY.get(L.id)) })
  })

  /* pass 2: final trunk depths with pinning, then positions */
  lines.forEach((L) => {
    if (kinds.get(L.id) !== 'trunk') return
    const C = trunkC.get(L.id)
    let d = 0
    L.stations.forEach((id) => {
      if (owner.get(id) !== L.id) { const p = pos.get(id); if (p) d = p.y; return }
      if (pinY.has(id)) d = Math.max(d, pinY.get(id))
      pos.set(id, { x: C + d, y: d })
      d += 1
    })
  })

  /* crosstowns: trunk stations already sit on the row; own stops hang off */
  lines.forEach((L) => {
    if (kinds.get(L.id) !== 'crosstown') return
    const y = rowY.get(L.id)
    const ids = L.stations
    const anchored = ids.map((id) => pos.has(id))
    const firstA = anchored.indexOf(true), lastA = anchored.lastIndexOf(true)
    if (firstA < 0) { ids.forEach((id, i) => pos.set(id, { x: i, y })); return }
    for (let i = firstA - 1; i >= 0; i--)
      pos.set(ids[i], { x: pos.get(ids[i + 1]).x - (i === firstA - 1 ? XT_GAP_LEFT : 1), y })
    for (let i = firstA + 1; i < ids.length; i++) {
      if (anchored[i]) continue
      if (i > lastA) pos.set(ids[i], { x: pos.get(ids[i - 1]).x + (i === lastA + 1 ? XT_GAP_RIGHT : 1), y })
      else { /* own stop between two interchanges: split the gap evenly */
        let j = i
        while (!anchored[j]) j++
        const a = pos.get(ids[i - 1]), b = pos.get(ids[j]), span = j - (i - 1)
        for (let k2 = i; k2 < j; k2++)
          pos.set(ids[k2], { x: a.x + ((b.x - a.x) * (k2 - (i - 1))) / span, y })
        i = j
      }
    }
  })

  /* branches: walk out of the fork one stop at a time, preferring 45°
     down-left (against the drift) but rotating away whenever the next step
     would sit on, ride along, or cross another line — the walk carries its
     direction, so a dodge continues rather than snapping back */
  lines.forEach((L) => {
    if (kinds.get(L.id) !== 'branch') return
    const fork = pos.get(L.stations[0])
    if (!fork) return
    const oSegs = [], oPts = []
    lines.forEach((o) => {
      if (o === L) return
      const ps = o.stations.map((id2) => pos.get(id2)).filter(Boolean)
      for (let i = 1; i < ps.length; i++) segPieces(ps[i - 1], ps[i]).forEach((s) => oSegs.push(s))
      o.stations.forEach((id2) => { const p2 = pos.get(id2); if (p2) oPts.push(p2) })
    })
    const own = [fork]
    let cur = fork, di = 3 // DIRS8[3] = down-left
    L.stations.slice(1).forEach((id) => {
      if (pos.has(id)) { cur = pos.get(id); own.push(cur); return }
      let placed = null
      for (const rot of [0, -1, 1, -2, 2, -3, 3]) {
        const ndi = ((di + rot) % 8 + 8) % 8, d = DIRS8[ndi]
        const q = { x: cur.x + d[0] * BRANCH_STEP, y: cur.y + d[1] * BRANCH_STEP }
        const ptClean =
          !oPts.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < 0.45) &&
          !oSegs.some((s) => ptSegDist(q, s[0], s[1]) < 0.3) &&
          !own.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < 0.45)
        if (!ptClean) continue
        const legClean = segPieces(cur, q).every((s) =>
          !oPts.some((o) =>
            Math.hypot(o.x - cur.x, o.y - cur.y) > EPS &&
            Math.hypot(o.x - q.x, o.y - q.y) > EPS &&
            ptSegDist(o, s[0], s[1]) < 0.3) &&
          !oSegs.some((t) => collinearOverlap(s[0], s[1], t[0], t[1])) &&
          !oSegs.some((t) => {
            const Z = segCrossPoint(s[0], s[1], t[0], t[1])
            return Z && Math.hypot(Z.x - cur.x, Z.y - cur.y) > 1e-4 &&
              Math.hypot(Z.x - q.x, Z.y - q.y) > 1e-4
          }))
        if (!legClean) continue
        placed = { q, di: ndi }
        break
      }
      if (!placed) placed = { q: { x: cur.x + DIRS8[di][0] * BRANCH_STEP, y: cur.y + DIRS8[di][1] * BRANCH_STEP }, di }
      pos.set(id, placed.q); cur = placed.q; di = placed.di; own.push(cur)
    })
  })

  /* author nudges */
  nodes.forEach((n) => {
    if (n.shift && pos.has(n.id)) {
      const p = pos.get(n.id)
      pos.set(n.id, { x: p.x + (n.shift.x || 0), y: p.y + (n.shift.y || 0) })
    }
  })

  /* collision resolution: a station that lands on ANOTHER line's station or
     track is not an interchange (interchanges are only shared ids) — instead
     the offending line reshapes around it. Candidate nudges are searched
     nearest the station's own travel direction, and a candidate is accepted
     only if its point AND its rerouted octilinear legs stay clear of foreign
     stations and never ride collinearly along foreign track. Transversal
     crossings remain allowed, as on any metro map. */
  const CLEAR_PT = 0.45, CLEAR_SEG = 0.3
  const geomOf = (list) => {
    const oSegs = [], oPts = []
    list.forEach((o) => {
      const ps = o.stations.map((id) => pos.get(id)).filter(Boolean)
      for (let i = 1; i < ps.length; i++) segPieces(ps[i - 1], ps[i]).forEach((s) => oSegs.push(s))
      o.stations.forEach((id) => { const p = pos.get(id); if (p) oPts.push({ id, p }) })
    })
    return { oSegs, oPts }
  }
  const repairLine = (L, geo) => {
    const oSegs = geo.oSegs, oPts = geo.oPts
    if (!oSegs.length && !oPts.length) return
    const ids = L.stations
    ids.forEach((id, i) => {
      if ((linesOf.get(id) || []).length > 1) return // real interchanges stay put
      const p = pos.get(id)
      if (!p) return
      const ownOthers = ids.filter((o) => o !== id).map((o) => pos.get(o)).filter(Boolean)
      const clash = (q) =>
        oPts.some((o) => o.id !== id && Math.hypot(o.p.x - q.x, o.p.y - q.y) < CLEAR_PT) ||
        oSegs.some((s) => ptSegDist(q, s[0], s[1]) < CLEAR_SEG) ||
        ownOthers.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < CLEAR_PT)
      const prev = i > 0 ? pos.get(ids[i - 1]) : null
      const next = i < ids.length - 1 ? pos.get(ids[i + 1]) : null
      /* strict mode additionally refuses transversal crossings of earlier
         lines — a crossing is only "willing" when it happens exactly at one
         of this station's route points (i.e., a shared interchange). */
      const legsOK = (q, strict) => {
        const legs = []
        if (prev) segPieces(prev, q).forEach((s) => legs.push(s))
        if (next) segPieces(q, next).forEach((s) => legs.push(s))
        const allowed = [prev, next, q].filter(Boolean)
        return legs.every((s) =>
          !oPts.some((o) => o.id !== id
            /* only a stop at one of THIS station's route points is legal on a
               leg — synthetic bend points do not excuse a pass-through */
            && !allowed.some((a2) => Math.hypot(o.p.x - a2.x, o.p.y - a2.y) <= EPS)
            && ptSegDist(o.p, s[0], s[1]) < CLEAR_SEG) &&
          !oSegs.some((t) => collinearOverlap(s[0], s[1], t[0], t[1])) &&
          (!strict || !oSegs.some((t) => {
            const Z = segCrossPoint(s[0], s[1], t[0], t[1])
            return Z && !allowed.some((pt) => Math.hypot(pt.x - Z.x, pt.y - Z.y) < 1e-4)
          })))
      }
      if (!clash(p) && legsOK(p, true)) return
      const ref = prev ? { x: p.x - prev.x, y: p.y - prev.y } : next ? { x: p.x - next.x, y: p.y - next.y } : { x: 1, y: 0 }
      const ang = Math.atan2(ref.y, ref.x)
      const aDist = (d) => {
        let dd = Math.abs(Math.atan2(d[1], d[0]) - ang)
        return Math.min(dd, Math.PI * 2 - dd)
      }
      const dirs = DIRS8.slice().sort((A, B) => aDist(A) - aDist(B))
      const attempt = (strict) => {
        for (const s of [0.5, 1, 1.5]) {
          for (const d of dirs) {
            const q = { x: p.x + d[0] * s, y: p.y + d[1] * s }
            if (clash(q) || !legsOK(q, strict)) continue
            pos.set(id, q)
            return true
          }
        }
        return false
      }
      if (attempt(true)) return // fully clean spot found
      if (!clash(p) && legsOK(p, false)) return // only a crossing remains and
      //                                           nothing fixes it: stay put
      attempt(false) // best effort without crossings rule
    })
  }
  /* phase A: listed order — each line reshapes around earlier lines */
  lines.forEach((L, li) => repairLine(L, geomOf(lines.slice(0, li))))
  /* phase B: avoidance all the time — every line is swept against every
     other line, later-listed lines moving first so earlier lines keep
     their shape; two passes let moves settle */
  for (let sweep = 0; sweep < 2; sweep++)
    lines.slice().reverse().forEach((L) => repairLine(L, geomOf(lines.filter((o) => o !== L))))

  return { nodeById, pos, linesOf, kinds, trunkC }
}

/* octilinear route through the listed stations, in order */
function routePoints(L, lay) {
  const pts = []
  L.stations.forEach((id) => { const p = lay.pos.get(id); if (p) pts.push(p) })
  if (pts.length < 2) return pts
  const out = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    segPieces(out[out.length - 1], pts[i]).forEach((s) => out.push(s[1]))
  }
  return out
}

/* long jogs: variance across straight CHAINS of stations. A run of
   collinear stops (e.g. a whole trunk stretch) gets its movable middle —
   every consecutive block of single-line stations between interchanges —
   shifted laterally as one piece, stations riding the shifted track, with
   45/90 degree ramps placed in the gaps on either side. Interchanges and
   termini never move. A block only shifts when the shifted track and its
   displaced stations stay clear of every other line and station. */
function longJogs(P, v, li, lay, dispPos, otherSegs, ownIds, gseed) {
  if (!v || v <= 0 || P.length < 3) return P
  const key = (p) => p.x.toFixed(4) + ',' + p.y.toFixed(4)
  const idAt = new Map()
  lay.pos.forEach((p, id) => idAt.set(key(p), id))
  const dirOf = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, adx = Math.abs(dx), ady = Math.abs(dy)
    if (ady < EPS && adx > EPS) return [Math.sign(dx), 0]
    if (adx < EPS && ady > EPS) return [0, Math.sign(dy)]
    if (adx > EPS && Math.abs(adx - ady) < EPS) return [Math.sign(dx), Math.sign(dy)]
    return null
  }
  const alongLen = (a, b, d) => (d[0] ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y))
  const tryBlock = (d, a2, b2) => {
    const qPrev = P[a2 - 1], qNext = P[b2 + 1]
    const gapOut = alongLen(qPrev, P[a2], d), gapBack = alongLen(P[b2], qNext, d)
    const isDiag = !!(d[0] && d[1])
    const minGap = Math.min(gapOut, gapBack)
    const seed = ((li + 1) * 2246822519 ^ (Math.round(P[a2].x * 8) * 3266489917)
      ^ (Math.round(P[a2].y * 8) * 668265263) ^ Math.imul((gseed || 0) + 1, 2654435761)) >>> 0
    const rnd = mulberry32(seed)
    if (rnd() >= Math.min(0.95, (v / 100) * 1.2)) return null
    let m = 0.3 + (v / 100) * 0.25
    m = Math.min(m, minGap - 0.2, isDiag ? 0.55 : 0.5)
    if (m < 0.18) return null
    /* the deviation is anchored at stations: on each side the elbow sits
       either ON the bounding immovable station (qPrev/qNext) or ON the
       nearest displaced station of the block — chosen at random per block.
       All four anchor combos are tried under the same clearance rules
       before a side is given up. */
    const near = (p2, q2) => Math.hypot(p2.x - q2.x, p2.y - q2.y) < 1e-4
    const sideFirst = rnd() < 0.5 ? 1 : -1
    const outAtStn = rnd() < 0.5, backAtStn = rnd() < 0.5
    const combos = [[outAtStn, backAtStn], [!outAtStn, backAtStn],
      [outAtStn, !backAtStn], [!outAtStn, !backAtStn]]
    for (const sgn of [sideFirst, -sideFirst]) {
      let n1, n2, OFF
      if (isDiag) {
        const A = [d[0], 0], B = [0, d[1]]
        n1 = sgn > 0 ? A : B; n2 = sgn > 0 ? B : A
        OFF = { x: n1[0] * m, y: n1[1] * m }
      } else {
        const perp = d[0] ? [0, sgn] : [sgn, 0]
        n1 = [d[0] + perp[0], d[1] + perp[1]]
        n2 = [d[0] - perp[0], d[1] - perp[1]]
        OFF = { x: perp[0] * m, y: perp[1] * m }
      }
      const moved = []
      for (let t = a2; t <= b2; t++)
        moved.push([idAt.get(key(P[t])), { x: P[t].x + OFF.x, y: P[t].y + OFF.y }])
      const firstD = moved[0][1], lastD = moved[moved.length - 1][1]
      for (const combo of combos) {
        const aOut = combo[0], aBack = combo[1]
        let outPt, rampOut, rampOutInc, offStart
        if (!aOut) { // elbow on qPrev
          outPt = { x: qPrev.x + n1[0] * m, y: qPrev.y + n1[1] * m }
          rampOut = [qPrev, outPt]; rampOutInc = qPrev; offStart = outPt
        } else { // elbow on the first displaced stop
          const bf = P[a2]
          outPt = isDiag ? { x: bf.x, y: bf.y } : { x: bf.x - d[0] * m, y: bf.y - d[1] * m }
          rampOut = [outPt, firstD]; rampOutInc = null; offStart = firstD
        }
        let backPt, rampBack, rampBackInc, offEnd
        if (!aBack) { // elbow on qNext
          backPt = { x: qNext.x - n2[0] * m, y: qNext.y - n2[1] * m }
          rampBack = [backPt, qNext]; rampBackInc = qNext; offEnd = backPt
        } else { // elbow on the last displaced stop
          const bl = P[b2]
          backPt = { x: bl.x + d[0] * m, y: bl.y + d[1] * m }
          rampBack = [lastD, backPt]; rampBackInc = null; offEnd = lastD
        }
        const offLen = Math.hypot(offEnd.x - offStart.x, offEnd.y - offStart.y)
        const pieces = [rampOut, rampBack]
        if (offLen > 1e-6) pieces.push([offStart, offEnd])
        let ok = true
        dispPos.forEach((q2, id2) => {
          if (!ok || ownIds.has(id2)) return
          if (pieces.some((s) => ptSegDist(q2, s[0], s[1]) < 0.38)) ok = false
          if (moved.some((mv) => Math.hypot(q2.x - mv[1].x, q2.y - mv[1].y) < 0.45)) ok = false
        })
        if (!ok) continue
        /* ramps touching a station other lines legitimately pass through
           (an interchange) only forbid riding along those segments;
           everything else gets the full crossing/overlap/distance check */
        const rampOK = (ramp, at) => otherSegs.every((t2) => {
          if (at && (near(t2[0], at) || near(t2[1], at)))
            return !collinearOverlap(ramp[0], ramp[1], t2[0], t2[1])
          return segSegClear(ramp, t2, 0.28)
        })
        if (!rampOK(rampOut, rampOutInc) || !rampOK(rampBack, rampBackInc)) continue
        if (offLen > 1e-6 && !otherSegs.every((t2) => segSegClear([offStart, offEnd], t2, 0.28))) continue
        return { pts: [outPt].concat(moved.map((mv) => mv[1]), [backPt]), moved, end: b2 }
      }
    }
    return null
  }
  const out = [P[0]]
  let i = 0
  while (i < P.length - 1) {
    const d = dirOf(P[i], P[i + 1])
    let j = i + 1
    while (d && j < P.length - 1) {
      const d2 = dirOf(P[j], P[j + 1])
      if (!d2 || d2[0] !== d[0] || d2[1] !== d[1]) break
      j++
    }
    if (d && j - i >= 2) {
      const movableAt = (idx) => {
        const id = idAt.get(key(P[idx]))
        return id && (lay.linesOf.get(id) || []).length === 1 ? id : null
      }
      let emitted = i // last base index already emitted
      let a2 = i + 1
      while (a2 <= j - 1) {
        if (!movableAt(a2)) { a2++; continue }
        let b2 = a2
        while (b2 + 1 <= j - 1 && movableAt(b2 + 1)) b2++
        const res = tryBlock(d, a2, b2)
        if (res) {
          for (let t = emitted + 1; t <= a2 - 1; t++) out.push(P[t])
          res.pts.forEach((p2) => out.push(p2))
          res.moved.forEach((mv) => { if (mv[0]) dispPos.set(mv[0], mv[1]) })
          emitted = b2
        }
        a2 = b2 + 1
      }
      for (let t = emitted + 1; t <= j; t++) out.push(P[t])
      i = j
    } else {
      out.push(P[i + 1])
      i++
    }
  }
  return out
}

/* rendered route geometry: earlier lines' final (jogged) paths are
   obstacles for later lines' jogs, later lines' base paths are respected
   too — so variance can never create a crossing or overlap. Returns the
   (possibly displaced) station positions plus each line's polyline. */
function buildRoutes(lay, variance, gseed) {
  const dispPos = new Map()
  lay.pos.forEach((p, id) => dispPos.set(id, { x: p.x, y: p.y }))
  let minY = 1e9, maxY = -1e9
  lay.pos.forEach((p) => { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y) })
  if (minY > maxY) { minY = 0; maxY = 1 }
  const base = LINES.map((L) => {
    if (L.stations.length === 0 && lay.kinds.get(L.id) === 'trunk') {
      const C = lay.trunkC.get(L.id)
      return [{ x: C + minY - 0.5, y: minY - 0.5 }, { x: C + maxY + 0.5, y: maxY + 0.5 }]
    }
    return routePoints(L, lay)
  })
  const segsOf = (P) => { const s = []; for (let i = 1; i < P.length; i++) s.push([P[i - 1], P[i]]); return s }
  const finalSegs = []
  const routes = LINES.map((L, li) => {
    let P = base[li]
    if (P.length >= 2) {
      const otherSegs = finalSegs.concat(base.slice(li + 1).flatMap(segsOf))
      P = longJogs(P, variance, li, lay, dispPos, otherSegs, new Set(L.stations), gseed)
    }
    segsOf(P).forEach((s) => finalSegs.push(s))
    return { line: L, P }
  })
  return { routes, pos: dispPos }
}

// The whole layout, in grid units, computed once at module load: it is
// deterministic for a given data + VARIANCE + JOG_SEED, and the component
// only scales it to the column's width.
const LAY = layoutMap(NODES, LINES)
const BUILT = buildRoutes(LAY, VARIANCE, hashSeed(JOG_SEED))
const POS = BUILT.pos
let UX0 = 1e9, UX1 = -1e9, UY0 = 1e9, UY1 = -1e9
POS.forEach((p) => {
  UX0 = Math.min(UX0, p.x); UX1 = Math.max(UX1, p.x)
  UY0 = Math.min(UY0, p.y); UY1 = Math.max(UY1, p.y)
})
if (UX0 > UX1) { UX0 = 0; UX1 = 1; UY0 = 0; UY1 = 1 }

/* ─── rendering & interaction ──────────────────────────────────────────────── */

// Edge padding in px around the scaled map.
const MARGIN_X = 24
const PAD_Y = 28

// Thick ribbon lines with gently eased bends — the stations read as holes
// punched through them. A bend that happens AT a station stays a true
// vertex instead: any eased curve cuts inside the corner point, sliding
// the ribbon's centreline out from under the disc, and the stroke's round
// join softens the outside of the joint anyway.
const LINE_W = 7
const CORNER_R = 12

// A press that travels less than this many pixels is a click (opens the
// modal); anything further is a drag. Generous enough for a wobbly finger,
// tight enough that no deliberate pull ever pops the dialog.
const CLICK_SLOP = 5

// The discs are tiny targets (5–15px); an invisible pad centred on each
// one grows the pressable square to this size. The station's name joins
// the target too, whenever labels are switched on.
const HIT_SIZE = 26

// Backdrop fade duration — matches the art lightbox's transition, and the
// unmount is delayed by the same amount so the exit fade gets to play.
const FADE_MS = 300

// How far a station can be pulled. The easing approaches this
// asymptotically, so the limit feels like pushing into ever-denser liquid.
const MAX_DRAG = 500
// The dragged station is not pinned to the pointer — it glides after it,
// covering this per-second rate of the remaining distance. That lag is most
// of what reads as fluid; raise for a tighter follow, lower for more syrup.
const FOLLOW = 12
// Spring anchoring every station to its map slot. Soft, and paired with
// damping just past the critical value (2·√K_ANCHOR), so stations ease home
// in one smooth motion with no overshoot.
const K_ANCHOR = 50
const DAMPING = 15
// Positional pull along each route segment: dragging a station tows its
// neighbours a little. Equilibrium tug on a neighbour is
// K_LINK / (K_ANCHOR + K_LINK) of the drag.
const K_LINK = 40
// Viscous coupling: neighbours share velocity as well as position, which is
// what makes a pull ripple outward along a route like a disturbance in
// liquid rather than a chain of springs.
const VISCOSITY = 8
// A hard flick can hand the map a huge starting velocity; cap it so the
// drift never carries a station across the chart.
const MAX_RELEASE_VELOCITY = 600

// Renders a route as a polyline with rounded bends.
function beckPath(pts) {
  const verts = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const a = verts[verts.length - 1]
    const b = pts[i]
    if (Math.hypot(b.x - a.x, b.y - a.y) > 0.5) verts.push(b)
  }

  let d = `M ${verts[0].x} ${verts[0].y}`
  for (let i = 1; i < verts.length - 1; i++) {
    const p = verts[i - 1]
    const c = verts[i]
    const n = verts[i + 1]
    // Bends at stations are not eased — the centreline must pass exactly
    // through the point the disc is centred on, or the circle sits off the
    // line at every turn.
    if (c.s) {
      d += ` L ${c.x} ${c.y}`
      continue
    }
    const inLen = Math.hypot(c.x - p.x, c.y - p.y)
    const outLen = Math.hypot(n.x - c.x, n.y - c.y)
    if (inLen < 0.5 || outLen < 0.5) continue
    const r = Math.min(CORNER_R, inLen / 2, outLen / 2)
    const p1 = { x: c.x - ((c.x - p.x) / inLen) * r, y: c.y - ((c.y - p.y) / inLen) * r }
    const p2 = { x: c.x + ((n.x - c.x) / outLen) * r, y: c.y + ((n.y - c.y) / outLen) * r }
    d += ` L ${p1.x} ${p1.y} Q ${c.x} ${c.y} ${p2.x} ${p2.y}`
  }
  const last = verts[verts.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

// A station's name, set on a ±45° axis through the stop. The transform
// list reads right to left: the name first slides out along its own axis
// (the gap plus any dx nudge), then the whole thing rotates about the end
// anchored at the station, and an optional dy drops it in screen space.
// 'ne'/'se' anchor the name's left end at the stop and run outward;
// 'sw'/'nw' anchor its right end, so the name reads in toward the stop.
const LABEL_GAP = 10
const labelStyle = (side, [dx, dy]) => {
  const base = { top: 'calc(50% - 7px)' }
  switch (side) {
    case 'sw':
      return { ...base, right: '50%', transformOrigin: '100% 50%', transform: `translateY(${dy}px) rotate(-45deg) translateX(${-(LABEL_GAP + dx)}px)` }
    case 'se':
      return { ...base, left: '50%', transformOrigin: '0 50%', transform: `translateY(${dy}px) rotate(45deg) translateX(${LABEL_GAP + dx}px)` }
    case 'nw':
      return { ...base, right: '50%', transformOrigin: '100% 50%', transform: `translateY(${dy}px) rotate(45deg) translateX(${-(LABEL_GAP + dx)}px)` }
    default: // ne
      return { ...base, left: '50%', transformOrigin: '0 50%', transform: `translateY(${dy}px) rotate(-45deg) translateX(${LABEL_GAP + dx}px)` }
  }
}

// The journey as a metro map: thick coloured ribbons through white stops,
// interchanges as larger ink-ringed discs, names as small angled type. The
// layout comes from the ported generator above; this component scales it
// to the column and adds the life — stations can be dragged and the map
// moves like it is suspended in liquid: the grabbed stop glides after the
// pointer, the pull ripples down its own routes only, and everything eases
// home on release. Ribbons re-derive their octilinear pieces from live
// station positions every frame, so the Beck grammar holds even mid-drag.
// All motion is written straight to the nodes rather than through React
// state, since it runs per frame on the same main thread as the canvases.
export default function FlowTimeline() {
  const gridRef = useRef(null)
  const nodeEls = useRef(new Map())
  const pathEls = useRef([])
  const geomRef = useRef(null)
  // Per-station motion state: offset from the map slot, velocity, drag
  // flag. Lives in a ref because none of it should ever cause a render.
  const motion = useRef(new Map())
  const rafRef = useRef(0)
  const runningRef = useRef(false)
  // The lines whose coupling is live: a drag energises only the dragged
  // station's own routes, so its ripple stops at an interchange instead of
  // spreading across the whole network. Rebuilt from the currently-held
  // stations at every grab; cleared once the map settles.
  const activeLines = useRef(new Set())
  // The scaled geometry needs the real width, so it is the one layout
  // input that goes through state.
  const [mapW, setMapW] = useState(0)
  // The station whose modal is open, or null.
  const [active, setActive] = useState(null)
  // Station names on the map, switchable above it. Off by default: the map
  // reads as a graphic first, and the names are there for whoever wants
  // them (every station's title is in the modal a click opens anyway).
  const [labelsOn, setLabelsOn] = useState(false)
  // Drives the backdrop fade, exactly like the art lightbox: false on first
  // paint, flipped the next frame (a transition needs two distinct states),
  // and flipped back before unmounting so closing mirrors opening.
  const [shown, setShown] = useState(false)
  const closeTimer = useRef(0)
  const lenis = useLenis()

  const openModal = (node) => {
    clearTimeout(closeTimer.current)
    setActive(node)
  }

  // Play the exit fade before unmounting.
  const dismiss = () => {
    setShown(false)
    closeTimer.current = setTimeout(() => setActive(null), FADE_MS)
  }

  // Same contract as the art lightbox: Escape closes, and stopping Lenis
  // (html.lenis-stopped → overflow:hidden in globals.css) freezes the page
  // behind the open modal.
  useEffect(() => {
    if (!active) return
    const raf = requestAnimationFrame(() => setShown(true))
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    lenis?.stop()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      lenis?.start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, lenis])

  const getMotion = (id) => {
    let m = motion.current.get(id)
    if (!m) {
      // tx/ty is where the pointer wants a dragged station; x/y is where
      // the station actually is, always trailing it viscously.
      m = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, dragging: false }
      motion.current.set(id, m)
    }
    return m
  }

  // Repaints every ribbon from its stations' CURRENT positions (rest plus
  // physics offset), re-deriving the octilinear pieces every frame.
  // segPieces is continuous in its endpoints and only ever emits straight
  // or 45° segments, so nothing pops and the grammar holds mid-drag; and a
  // line's ribbon depends only on its own stations, so no drag can move a
  // foreign line by a pixel.
  const redraw = () => {
    const g = geomRef.current
    if (!g) return
    g.lines.forEach((L, i) => {
      const path = pathEls.current[i]
      if (!path) return
      if (L.staticD) {
        path.setAttribute('d', L.staticD)
        return
      }
      const pts = []
      L.stations.forEach((st) => {
        const m = motion.current.get(st.id)
        const c = {
          x: st.x + (m ? m.x : 0),
          y: st.y + (m ? m.y : 0),
          // Tagged as a station so a bend here stays a true vertex, keeping
          // the ribbon's centreline exactly under the disc; derived bend
          // points get the full eased radius.
          s: st.id,
        }
        if (pts.length) {
          const pieces = segPieces(pts[pts.length - 1], c)
          if (pieces.length === 2) pts.push({ x: pieces[0][1].x, y: pieces[0][1].y })
        }
        pts.push(c)
      })
      if (pts.length < 2) return
      path.setAttribute('d', beckPath(pts))
    })
  }

  // One shared simulation for the whole map, running only while something
  // is moving. Each free station feels its anchor spring, damping, a
  // positional pull toward each route-neighbour's offset, and a viscous
  // drag toward its velocity; a dragged station glides after the pointer
  // and acts on the others without being acted upon.
  const startLoop = () => {
    if (runningRef.current) return
    runningRef.current = true
    let prev = performance.now()

    const step = (now) => {
      // Clamped so a background tab resuming does not integrate one giant
      // unstable timestep.
      const dt = Math.min(0.032, (now - prev) / 1000)
      prev = now
      let energy = 0
      let anyDrag = false

      NODES.forEach(({ id }) => {
        const m = getMotion(id)
        if (m.dragging) {
          anyDrag = true
          // Viscous follow: cover a rate-based fraction of the distance to
          // the pointer's target each frame. Frame-rate independent, and the
          // velocity it implies is kept so releasing mid-glide hands the
          // map that drift as momentum.
          const f = 1 - Math.exp(-FOLLOW * dt)
          const px = m.x
          const py = m.y
          m.x += (m.tx - m.x) * f
          m.y += (m.ty - m.y) * f
          if (dt > 0) {
            m.vx = (m.x - px) / dt
            m.vy = (m.y - py) / dt
          }
          return
        }
        // A station that also serves a line outside the live set holds
        // still: it takes no tow at all, making it the hard anchor that
        // keeps the drag's effect off every other line it belongs to. (Its
        // own anchor spring still runs, so any residual offset from an
        // earlier gesture decays instead of freezing mid-air.)
        const pinned =
          activeLines.current.size > 0 &&
          STATION_LINES.get(id).some((l) => !activeLines.current.has(l.id))

        let fx = -K_ANCHOR * m.x - DAMPING * m.vx
        let fy = -K_ANCHOR * m.y - DAMPING * m.vy
        if (!pinned) {
          for (const nb of NEIGHBORS.get(id)) {
            // Only the dragged station's own routes transmit the pull.
            if (!activeLines.current.has(nb.line)) continue
            const n = getMotion(nb.id)
            fx += K_LINK * (n.x - m.x) + VISCOSITY * (n.vx - m.vx)
            fy += K_LINK * (n.y - m.y) + VISCOSITY * (n.vy - m.vy)
          }
        }
        m.vx += fx * dt
        m.vy += fy * dt
        m.x += m.vx * dt
        m.y += m.vy * dt
        energy = Math.max(energy, Math.abs(m.x), Math.abs(m.y), Math.abs(m.vx) / 20, Math.abs(m.vy) / 20)
      })

      NODES.forEach(({ id }) => {
        const m = getMotion(id)
        const el = nodeEls.current.get(id)
        if (el) el.style.transform = m.x || m.y ? `translate3d(${m.x}px, ${m.y}px, 0)` : ''
      })
      redraw()

      if (!anyDrag && energy < 0.1) {
        NODES.forEach(({ id }) => {
          const m = getMotion(id)
          m.x = 0
          m.y = 0
          m.vx = 0
          m.vy = 0
          const el = nodeEls.current.get(id)
          if (el) {
            el.style.transform = ''
            el.style.zIndex = ''
          }
        })
        redraw()
        runningRef.current = false
        activeLines.current.clear()
        return
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
  }

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const measure = () => setMapW(grid.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(grid)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
      runningRef.current = false
      clearTimeout(closeTimer.current)
    }
  }, [])

  // Stations have moved to their new width-derived slots by the time this
  // runs, so the ribbons re-measure against the fresh geometry.
  useLayoutEffect(() => {
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapW])

  // Scales a pull so its length approaches MAX_DRAG asymptotically: the
  // further the station is dragged, the less each extra pixel of pointer
  // travel moves it.
  const rubber = (x, y) => {
    const mag = Math.hypot(x, y)
    if (!mag) return { x: 0, y: 0 }
    const eased = (mag * MAX_DRAG) / (mag + MAX_DRAG)
    return { x: (x / mag) * eased, y: (y / mag) * eased }
  }

  const onPointerDown = (id) => (e) => {
    const el = nodeEls.current.get(id)
    if (!el) return
    // No preventDefault here: cancelling pointerdown suppresses all
    // compatibility mouse events until release, which freezes the glass
    // cursor (it tracks mousemove) for the whole drag. Text selection is
    // already covered by select-none on the station.
    el.setPointerCapture(e.pointerId)
    const m = getMotion(id)
    m.dragging = true
    m.moved = 0
    // Rebuild the live set from every station actually held right now (an
    // interchange wakes all of its lines; a second finger on another line
    // composes). Replacing rather than adding drops any not-yet-settled
    // previous gesture's lines — their leftover offsets still ease home on
    // their anchor springs, they just stop transmitting.
    activeLines.current.clear()
    motion.current.forEach((mm, mid) => {
      if (mm.dragging) STATION_LINES.get(mid).forEach((line) => activeLines.current.add(line.id))
    })
    m.startPointer = { x: e.clientX, y: e.clientY }
    m.startOffset = { x: m.x, y: m.y }
    m.tx = m.x
    m.ty = m.y
    // A pulled station may cross a neighbour; make sure it slides over,
    // not under. Reset once the map settles.
    el.style.zIndex = '10'
    startLoop()
  }

  const onPointerMove = (id) => (e) => {
    const m = getMotion(id)
    if (!m.dragging) return

    // Distinguishes a click from a drag at release time. Peak travel, not
    // final position, so an out-and-back drag never counts as a click.
    m.moved = Math.max(
      m.moved,
      Math.hypot(e.clientX - m.startPointer.x, e.clientY - m.startPointer.y)
    )

    // Only the target moves here. The station itself catches up in the
    // shared loop's viscous follow — that deliberate lag is the fluid feel,
    // so nothing is written to the DOM from the pointer event.
    const next = rubber(
      m.startOffset.x + (e.clientX - m.startPointer.x),
      m.startOffset.y + (e.clientY - m.startPointer.y)
    )
    m.tx = next.x
    m.ty = next.y
  }

  const onPointerEnd = (id) => () => {
    const m = getMotion(id)
    if (!m.dragging) return
    m.dragging = false
    const v = Math.hypot(m.vx, m.vy)
    if (v > MAX_RELEASE_VELOCITY) {
      m.vx = (m.vx / v) * MAX_RELEASE_VELOCITY
      m.vy = (m.vy / v) * MAX_RELEASE_VELOCITY
    }
    startLoop()

    // A press that never became a drag is a click.
    if (m.moved < CLICK_SLOP) openModal(NODE_BY_ID.get(id))
  }

  // Scale the unit-grid layout to the column. Same factor on both axes, so
  // every 45° stays exactly 45°; the map's height follows from its width.
  const W = mapW || 452
  const scale = (W - 2 * MARGIN_X) / Math.max(UX1 - UX0, 1e-6)
  const mapH = (UY1 - UY0) * scale + 2 * PAD_Y
  const toPx = (p) => ({
    x: MARGIN_X + (p.x - UX0) * scale,
    y: PAD_Y + (p.y - UY0) * scale,
  })
  const REST = new Map([...POS].map(([id, p]) => [id, toPx(p)]))
  geomRef.current = {
    lines: LINES.map((line, li) => {
      // A bare trunk has no stations; its full-track ribbon comes straight
      // from the generator's route.
      if (line.stations.length === 0 && LAY.kinds.get(line.id) === 'trunk') {
        const P = BUILT.routes[li].P.map(toPx)
        return P.length >= 2
          ? { stations: [], staticD: `M ${P[0].x} ${P[0].y} L ${P[1].x} ${P[1].y}` }
          : { stations: [], staticD: '' }
      }
      return {
        stations: line.stations
          .filter((id) => REST.has(id))
          .map((id) => ({ id, ...REST.get(id) })),
      }
    }),
  }

  // The open station's lines (for the modal's colour bar) and its route
  // neighbours (for the back/next buttons).
  const servedLines = active ? STATION_LINES.get(active.id) : []
  const steps = active ? stepsFrom(active.id) : { back: [], next: [] }

  return (
    <div>
      {/* Deliberately double the mt-10 rhythm of the subtitles above: the
          map is a different kind of content, and the extra air sets it
          apart from the text sections. */}
      <h2 className="mt-20 text-sm font-medium text-gray-900">metro map</h2>

      <p className="mt-4 text-sm leading-relaxed text-gray-500">
        click on a station to view more... or just drag them around for fun :)
      </p>

      {/* Switch for the station names, sitting top-left above the map. */}
      <div className="mt-6 flex items-center">
        <button
          type="button"
          role="switch"
          aria-checked={labelsOn}
          onClick={() => setLabelsOn((v) => !v)}
          className="flex items-center gap-2 text-[11px] text-gray-500 transition-colors hover:text-gray-800"
        >
          labels
          {/* Track and knob sized so the knob's travel is exactly the
              track's free run: 24 − 10 − 2·2 inset = 10px. */}
          <span
            aria-hidden="true"
            className={`relative h-3.5 w-6 rounded-full transition-colors duration-200 ${labelsOn ? 'bg-gray-700' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform duration-200 ${labelsOn ? 'translate-x-2.5' : ''}`}
            />
          </span>
        </button>
      </div>

      <div ref={gridRef} className="relative mt-6" style={{ height: mapH }}>
        {/* Ribbons live behind the stations: the station wrappers are
            positioned, so the white discs paint on top of the colour, the
            way stops sit punched into a metro line. */}
        <svg aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible pointer-events-none">
          {LINES.map((line, i) => (
            <path
              key={line.id}
              ref={(el) => {
                pathEls.current[i] = el
              }}
              fill="none"
              stroke={line.color}
              strokeWidth={LINE_W}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {NODES.filter((n) => REST.has(n.id)).map((node) => {
          const meta = STATION_META.get(node.id)
          const rest = REST.get(node.id)
          return (
            <div
              key={node.id}
              ref={(el) => {
                if (el) nodeEls.current.set(node.id, el)
                else nodeEls.current.delete(node.id)
              }}
              onPointerDown={onPointerDown(node.id)}
              onPointerMove={onPointerMove(node.id)}
              onPointerUp={onPointerEnd(node.id)}
              onPointerCancel={onPointerEnd(node.id)}
              // role="button" also enrols the station in the glass
              // cursor's INTERACTIVE selector, so hovering gives the same
              // cursor affordance as the site's real buttons.
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openModal(node)
                }
              }}
              className="group absolute select-none will-change-transform"
              // The wrapper is placed so the disc's centre lands exactly on
              // its map slot; the physics transform then rides on top
              // without fighting any centring translate. pan-y keeps the
              // page scrollable when a touch starts on a station.
              style={{
                left: rest.x - meta.size / 2,
                top: rest.y - meta.size / 2,
                touchAction: 'pan-y',
              }}
            >
              {/* Invisible pad growing the tap target to HIT_SIZE around
                  the disc; pointer events on it bubble to the wrapper's
                  handlers, so it clicks and drags like the disc itself. */}
              <span
                aria-hidden="true"
                className="absolute"
                style={{ inset: (meta.size - HIT_SIZE) / 2 }}
              />
              {/* An ordinary stop is a bare white circle inside the ribbon;
                  interchanges and termini are larger discs with a thin
                  outline — ink for interchanges, line colour for termini. */}
              <span
                className="block rounded-full bg-white transition-transform duration-100 ease-in-out group-hover:scale-110"
                style={{
                  width: meta.size,
                  height: meta.size,
                  border: meta.interchange
                    ? '1.5px solid #111827'
                    : meta.terminus
                      ? `1.5px solid ${meta.color}`
                      : 'none',
                }}
              />
              {/* One line of angled type, haloed by a soft chip so a name
                  stays legible on the rare occasion a ribbon passes under
                  it — the same trick as a map's white label halos. While
                  shown it is part of the station's hit target (pointer
                  events bubble to the wrapper); hidden, it must not keep
                  catching clicks it no longer advertises. */}
              <span
                className={`absolute whitespace-nowrap rounded-sm bg-gray-50/85 px-1 text-[9px] font-medium leading-tight text-gray-600 transition-opacity duration-300 ${labelsOn ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                style={labelStyle(meta.side, meta.nudge)}
              >
                {node.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Portalled to the body like the art lightbox, and for the same
          reason: a modal left inside the page would have to out-rank the
          navbar and the hero canvas from inside a subtree that scrolls and
          re-stacks around it. From the body it simply sits at z-[60] and is
          done. Backdrop dim, fade and X are the lightbox's exactly.
          Clicking the backdrop closes; clicks inside the panel stay inside. */}
      {active &&
        createPortal(
          <div
            onClick={dismiss}
            className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div
              role="dialog"
              aria-modal="true"
              aria-label={active.title}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-black/15 bg-gray-50/90 p-5 shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-gray-900">{active.title}</h3>
                <span className="text-[10px] uppercase tracking-[0.05em] text-gray-400 shrink-0">{active.year}</span>
              </div>
              {/* Which line(s) this station sits on: one ribbon-coloured
                  bar, split evenly at a junction — halves for two lines,
                  thirds for three. */}
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                {servedLines.map((l) => (
                  <span key={l.id} className="h-full flex-1" style={{ backgroundColor: l.color }} />
                ))}
              </div>
              {active.image && (
                <img
                  src={active.image}
                  alt={active.title}
                  className="mt-3 w-full rounded-lg border border-black/10 object-cover"
                />
              )}
              {active.body && (
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{active.body}</p>
              )}
              {/* Ride the routes from inside the dialog: every previous
                  stop on the left, every next stop on the right, one
                  button per line at a junction, each chip in the colour of
                  the line travelled. Swapping `active` keeps the backdrop
                  up and just replaces the panel's content. */}
              {(steps.back.length > 0 || steps.next.length > 0) && (
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col items-start gap-1.5">
                    {steps.back.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => openModal(NODE_BY_ID.get(s.id))}
                        className="flex max-w-full items-center gap-1.5 text-[11px] text-gray-500 transition-colors hover:text-gray-900"
                      >
                        <span
                          aria-hidden="true"
                          className="h-[5px] w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: s.line.color }}
                        />
                        <span className="truncate">← {NODE_BY_ID.get(s.id).title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex min-w-0 flex-col items-end gap-1.5">
                    {steps.next.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => openModal(NODE_BY_ID.get(s.id))}
                        className="flex max-w-full items-center gap-1.5 text-[11px] text-gray-500 transition-colors hover:text-gray-900"
                      >
                        <span className="truncate">{NODE_BY_ID.get(s.id).title} →</span>
                        <span
                          aria-hidden="true"
                          className="h-[5px] w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: s.line.color }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
