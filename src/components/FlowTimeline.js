'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLenis } from './SmoothScroll'
import * as sfx from './sound'

// ─── edit the map here ──────────────────────────────────────────────────────
// Stations: id, year, title, body, optional labelSide ('ne' default /
// 'sw' / 'se' / 'nw'), labelNudge [dx, dy] px, shift { x, y } in grid units.
// Lines: ordered station ids; horizontal: true = crosstown row. Layout is
// generated — VARIANCE (0–100) adds seeded track jogs, reroll JOG_SEED.
const VARIANCE = 50
const JOG_SEED = 'alex-2'

const NODES = [
  { id: 'prog', year: '2015', title: 'learning to code', labelSide: 'sw',
    body: 'where it all started. my dad taught me the basics of python when i was a kid, and competitive programming gave me a reason to keep going long after the lessons stopped.' },
  { id: 'lego', year: '2018', title: 'lego robotics',
    body: 'with my dad as our coach, my friends and i built and programmed mindstorms sets. it was my first taste of robotics, and my first lesson in how much of engineering is just working out why the thing refuses to work.' },
  { id: 'blender', year: '2020', title: 'first steps in 3d', labelSide: 'sw',
    body: 'i learned blender to make models for my robots. it never really helped with that, but it did open a door i had no idea i was walking through at the time.' },
  { id: 'unity', year: '2020', title: 'learning game development', labelSide: 'sw',
    body: 'a bored fifth grader in the middle of the pandemic, i fell down a youtube rabbit hole of game devlogs and decided unity looked like fun. it was, mostly.' },
  { id: 'steam', year: '2021', title: 'published on steam', labelSide: 'sw',
    body: 'malfunction was my first ever unity project, and somehow also the one i saw all the way through to a steam release. the first thing i ever built was the first thing i ever shipped. poetic, i think.' },
  { id: 'wc1', year: '2022', title: 'robotics world championship',
    body: 'my team became consistent ontario champions in wro, and that took us to germany for my first international competition. seeing what the rest of the world was building reset my sense of what good looked like.' },
  { id: 'vex', year: '2023', title: 'more robotics',
    body: 'high school meant outgrowing lego. vex was heavier, fiddlier and far less forgiving, which is exactly why i moved.' },
  { id: 'cad', year: '2023', title: 'computer aided design',
    body: 'i picked it up to design robot parts properly instead of building them twice. it quickly became the tool i reach for first, for robots and for everything since.' },
  { id: 'qwerty', year: '2024', title: 'team 3004a', labelSide: 'sw',
    body: 'i founded a new team and talked several friends from high school into joining me. running it taught me at least as much about people as it did about robots.' },
  { id: 'climb', year: '2024', title: 'climbing vex robot', labelSide: 'sw',
    body: 'in the vex "high stakes" season, i designed and built one of the first robots that could climb. it got my team noticed across the vex world, and it made me want to keep proving the point.' },
  { id: 'provs', year: '2026', title: 'winning big', labelSide: 'sw',
    body: 'we took provincials as underdogs. no school and no organization behind us, just an independent team up against some of the best in the world. it sent us to the world championship, and it is still the result i am proudest of.' },

  { id: 'more', year: '2026', title: 'more engineering projects', labelSide: 'ne', shift: { x: 5, y: -1 },
    body: 'there is always something half-built on my desk. this stop is deliberately open-ended.' },
  { id: 'itch', year: '2021', title: 'itch publishing', labelSide: 'sw',
    body: 'itch.io meant i could put things in front of real people without waiting for permission from anyone. i have been posting there ever since.' },
  { id: 'blender1', year: '2021', title: 'getting competent in blender', labelSide: 'sw',
    body: 'tutorial after tutorial, until one day i was making my own low-poly models instead of copying someone else. that is the moment a hobby stops being a hobby.' },

  { id: 'blender2', year: '2024', title: 'posting art in blender', labelSide: 'ne', shift: { x: 1, y: -3 },
    body: 'starting high school, i made an instagram account and began putting my work where my friends could see it. having an audience, even a small one, made me improve much faster.' },
]

const LINES = [
  { id: 'code', name: 'code line', color: '#4b6fb0',
    stations: ['prog', 'lego', 'blender1', 'unity', 'itch', 'steam'] },
  { id: 'robotics', name: 'robotics line', color: '#c2504f',
    stations: ['lego', 'wc1', 'vex', 'cad', 'qwerty', 'climb', 'vexsim', 'provs'] },

  { id: 'engineering', name: 'engineering line', color: '#d0a53e',
    stations: ['cad', 'more'] },

  { id: 'making', name: 'making line', color: '#3f8f60', horizontal: true,
    stations: ['blender', 'blender1', 'cad', 'blender2'] },
]

const NODE_IDS = new Set(NODES.map((n) => n.id))

const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]))

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
        size: interchange ? 19 : terminus ? 15 : 13,
        side: n.labelSide || 'ne',
        nudge: n.labelNudge || [0, 0],
      },
    ]
  })
)

const NEIGHBORS = new Map(NODES.map((n) => [n.id, []]))
LINES.forEach((line) => {
  for (let i = 1; i < line.stations.length; i++) {
    NEIGHBORS.get(line.stations[i - 1]).push({ id: line.stations[i], line: line.id })
    NEIGHBORS.get(line.stations[i]).push({ id: line.stations[i - 1], line: line.id })
  }
})

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

const TRUNK_GAP = 4
const XT_GAP_LEFT = 2
const XT_GAP_RIGHT = 1
const BRANCH_STEP = 1

const EPS = 1e-6
const DIRS8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]

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
  const pos = new Map()
  const linesOf = new Map()
  lines.forEach((L) => L.stations.forEach((id) => {
    if (!linesOf.has(id)) linesOf.set(id, [])
    linesOf.get(id).push(L.id)
  }))
  const owner = new Map()
  lines.forEach((L) => L.stations.forEach((id) => { if (!owner.has(id)) owner.set(id, L.id) }))

  const kinds = new Map()
  lines.forEach((L) => {
    if (L.horizontal) { kinds.set(L.id, 'crosstown'); return }
    const first = L.stations[0]
    const forkFirst = first !== undefined && owner.get(first) !== L.id
    const laterShared = L.stations.slice(1).some((id) => linesOf.get(id).length > 1)
    kinds.set(L.id, forkFirst && !laterShared ? 'branch' : 'trunk')
  })

  const trunkC = new Map()
  let c = 0
  lines.forEach((L) => { if (kinds.get(L.id) === 'trunk') { trunkC.set(L.id, c); c += TRUNK_GAP } })

  const natural = new Map()
  lines.forEach((L) => {
    if (kinds.get(L.id) !== 'trunk') return
    let d = 0
    L.stations.forEach((id) => {
      if (owner.get(id) !== L.id) { if (natural.has(id)) d = natural.get(id); return }
      natural.set(id, d); d += 1
    })
  })

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
  const pinY = new Map()
  lines.forEach((L) => {
    if (kinds.get(L.id) !== 'crosstown') return
    L.stations.forEach((id) => { if (natural.has(id)) pinY.set(id, rowY.get(L.id)) })
  })

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
      else {
        let j = i
        while (!anchored[j]) j++
        const a = pos.get(ids[i - 1]), b = pos.get(ids[j]), span = j - (i - 1)
        for (let k2 = i; k2 < j; k2++)
          pos.set(ids[k2], { x: a.x + ((b.x - a.x) * (k2 - (i - 1))) / span, y })
        i = j
      }
    }
  })

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
    let cur = fork, di = 3
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

  nodes.forEach((n) => {
    if (n.shift && pos.has(n.id)) {
      const p = pos.get(n.id)
      pos.set(n.id, { x: p.x + (n.shift.x || 0), y: p.y + (n.shift.y || 0) })
    }
  })

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
      if ((linesOf.get(id) || []).length > 1) return
      const p = pos.get(id)
      if (!p) return
      const ownOthers = ids.filter((o) => o !== id).map((o) => pos.get(o)).filter(Boolean)
      const clash = (q) =>
        oPts.some((o) => o.id !== id && Math.hypot(o.p.x - q.x, o.p.y - q.y) < CLEAR_PT) ||
        oSegs.some((s) => ptSegDist(q, s[0], s[1]) < CLEAR_SEG) ||
        ownOthers.some((o) => Math.hypot(o.x - q.x, o.y - q.y) < CLEAR_PT)
      const prev = i > 0 ? pos.get(ids[i - 1]) : null
      const next = i < ids.length - 1 ? pos.get(ids[i + 1]) : null

      const legsOK = (q, strict) => {
        const legs = []
        if (prev) segPieces(prev, q).forEach((s) => legs.push(s))
        if (next) segPieces(q, next).forEach((s) => legs.push(s))
        const allowed = [prev, next, q].filter(Boolean)
        return legs.every((s) =>
          !oPts.some((o) => o.id !== id

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
      if (attempt(true)) return
      if (!clash(p) && legsOK(p, false)) return

      attempt(false)
    })
  }

  lines.forEach((L, li) => repairLine(L, geomOf(lines.slice(0, li))))

  for (let sweep = 0; sweep < 2; sweep++)
    lines.slice().reverse().forEach((L) => repairLine(L, geomOf(lines.filter((o) => o !== L))))

  return { nodeById, pos, linesOf, kinds, trunkC }
}

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
        if (!aOut) {
          outPt = { x: qPrev.x + n1[0] * m, y: qPrev.y + n1[1] * m }
          rampOut = [qPrev, outPt]; rampOutInc = qPrev; offStart = outPt
        } else {
          const bf = P[a2]
          outPt = isDiag ? { x: bf.x, y: bf.y } : { x: bf.x - d[0] * m, y: bf.y - d[1] * m }
          rampOut = [outPt, firstD]; rampOutInc = null; offStart = firstD
        }
        let backPt, rampBack, rampBackInc, offEnd
        if (!aBack) {
          backPt = { x: qNext.x - n2[0] * m, y: qNext.y - n2[1] * m }
          rampBack = [backPt, qNext]; rampBackInc = qNext; offEnd = backPt
        } else {
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
      let emitted = i
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

const LAY = layoutMap(NODES, LINES)
const BUILT = buildRoutes(LAY, VARIANCE, hashSeed(JOG_SEED))
const POS = BUILT.pos
let UX0 = 1e9, UX1 = -1e9, UY0 = 1e9, UY1 = -1e9
POS.forEach((p) => {
  UX0 = Math.min(UX0, p.x); UX1 = Math.max(UX1, p.x)
  UY0 = Math.min(UY0, p.y); UY1 = Math.max(UY1, p.y)
})
if (UX0 > UX1) { UX0 = 0; UX1 = 1; UY0 = 0; UY1 = 1 }

const MARGIN_X = 24
const PAD_Y = 28

const LINE_W = 7
const CORNER_R = 12

const CLICK_SLOP = 5

const HIT_SIZE = 38

const FADE_MS = 300

const MAX_DRAG = 500

const FOLLOW = 12

const K_ANCHOR = 50
const DAMPING = 15

const K_LINK = 40

const VISCOSITY = 8

const MAX_RELEASE_VELOCITY = 600

const stretchFull = () =>
  Math.min(320, (typeof window === 'undefined' ? 800 : window.innerHeight) * 0.4)

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

    // Bends AT stations stay true vertices: any eased corner cuts inside
    // the point the disc is centred on, sliding the line out from under it.
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
    default:
      return { ...base, left: '50%', transformOrigin: '0 50%', transform: `translateY(${dy}px) rotate(-45deg) translateX(${LABEL_GAP + dx}px)` }
  }
}

export default function FlowTimeline() {
  const gridRef = useRef(null)
  const nodeEls = useRef(new Map())
  const pathEls = useRef([])
  const geomRef = useRef(null)

  const motion = useRef(new Map())
  const rafRef = useRef(0)
  const runningRef = useRef(false)

  const activeLines = useRef(new Set())

  const [mapW, setMapW] = useState(0)

  const [active, setActive] = useState(null)

  const [labelsOn, setLabelsOn] = useState(false)

  const [shown, setShown] = useState(false)
  const closeTimer = useRef(0)
  const lenis = useLenis()

  const openModal = (node) => {
    clearTimeout(closeTimer.current)
    setActive(node)
  }

  // Every close path — X, backdrop, Escape — converges here.
  const dismiss = () => {
    sfx.chord('dismiss')
    setShown(false)
    closeTimer.current = setTimeout(() => setActive(null), FADE_MS)
  }

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
  }, [active, lenis])

  const getMotion = (id) => {
    let m = motion.current.get(id)
    if (!m) {
      m = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, dragging: false }
      motion.current.set(id, m)
    }
    return m
  }

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

  const startLoop = () => {
    if (runningRef.current) return
    runningRef.current = true
    let prev = performance.now()

    const step = (now) => {
      const dt = Math.min(0.032, (now - prev) / 1000)
      prev = now
      let energy = 0
      let anyDrag = false

      NODES.forEach(({ id }) => {
        const m = getMotion(id)
        if (m.dragging) {
          anyDrag = true

          const f = 1 - Math.exp(-FOLLOW * dt)
          const px = m.x
          const py = m.y
          m.x += (m.tx - m.x) * f
          m.y += (m.ty - m.y) * f
          if (dt > 0) {
            m.vx = (m.x - px) / dt
            m.vy = (m.y - py) / dt
          }

          sfx.stretchTo(Math.hypot(m.x, m.y) / stretchFull())
          return
        }

        const pinned =
          activeLines.current.size > 0 &&
          STATION_LINES.get(id).some((l) => !activeLines.current.has(l.id))

        let fx = -K_ANCHOR * m.x - DAMPING * m.vx
        let fy = -K_ANCHOR * m.y - DAMPING * m.vy
        if (!pinned) {
          for (const nb of NEIGHBORS.get(id)) {
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

  useLayoutEffect(() => {
    redraw()
  }, [mapW])

  const rubber = (x, y) => {
    const mag = Math.hypot(x, y)
    if (!mag) return { x: 0, y: 0 }
    const eased = (mag * MAX_DRAG) / (mag + MAX_DRAG)
    return { x: (x / mag) * eased, y: (y / mag) * eased }
  }

  const onPointerDown = (id) => (e) => {
    const el = nodeEls.current.get(id)
    if (!el) return

    // No preventDefault here: it suppresses compatibility mouse events and
    // freezes the glass cursor for the whole drag.
    el.setPointerCapture(e.pointerId)
    const m = getMotion(id)
    m.dragging = true
    m.moved = 0

    activeLines.current.clear()
    motion.current.forEach((mm, mid) => {
      if (mm.dragging) STATION_LINES.get(mid).forEach((line) => activeLines.current.add(line.id))
    })
    m.startPointer = { x: e.clientX, y: e.clientY }
    m.startOffset = { x: m.x, y: m.y }
    m.tx = m.x
    m.ty = m.y

    sfx.unlock()

    el.style.zIndex = '10'
    startLoop()
  }

  const onPointerMove = (id) => (e) => {
    const m = getMotion(id)
    if (!m.dragging) return

    m.moved = Math.max(
      m.moved,
      Math.hypot(e.clientX - m.startPointer.x, e.clientY - m.startPointer.y)
    )

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

    if (m.moved < CLICK_SLOP) {
      sfx.snap(0)

      sfx.pluckReset()
      openModal(NODE_BY_ID.get(id))
    } else {
      sfx.snap(Math.min(1, (Math.hypot(m.x, m.y) + 0.06 * Math.hypot(m.vx, m.vy)) / stretchFull()))
    }
  }

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

  const servedLines = active ? STATION_LINES.get(active.id) : []
  const steps = active ? stepsFrom(active.id) : { back: [], next: [] }

  return (
    <div>

      <h2 className="mt-20 text-sm font-medium text-gray-900 dark:text-gray-100">metro map</h2>

      <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        click on a station to view more... or just drag them around for fun :)
      </p>

      <div className="mt-6 flex items-center">
        <button
          type="button"
          role="switch"
          aria-checked={labelsOn}
          onClick={() =>
            setLabelsOn((v) => {
              sfx.chord(v ? 'labelsOff' : 'labelsOn')
              return !v
            })
          }
          className="flex items-center gap-2 text-[11px] text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          labels

          <span
            aria-hidden="true"
            className={`relative h-3.5 w-6 rounded-full transition-colors duration-200 ${labelsOn ? 'bg-gray-700 dark:bg-gray-300' : 'bg-gray-300 dark:bg-gray-700'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-2.5 w-2.5 rounded-full bg-white transition-transform duration-200 dark:bg-gray-950 ${labelsOn ? 'translate-x-2.5' : ''}`}
            />
          </span>
        </button>
      </div>

      <div ref={gridRef} className="relative mt-6" style={{ height: mapH }}>

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

              style={{
                left: rest.x - meta.size / 2,
                top: rest.y - meta.size / 2,
                // The page must not scroll out from under a station drag.
                touchAction: 'none',
              }}
            >

              <span
                aria-hidden="true"
                className="absolute"
                style={{ inset: (meta.size - HIT_SIZE) / 2 }}
              />

              <svg
                aria-hidden="true"
                width={meta.size}
                height={meta.size}
                viewBox="0 0 24 24"
                className="block transition-transform duration-100 ease-in-out group-hover:scale-110"
              >
                <circle cx="12" cy="12" r="8.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3.4" />
              </svg>

              <span
                className={`absolute whitespace-nowrap rounded-sm bg-gray-50/85 px-0.5 text-[7px] font-medium leading-tight text-gray-600 transition-opacity duration-300 dark:bg-gray-950/85 dark:text-gray-300 sm:px-1 sm:text-[9px] ${labelsOn ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                style={labelStyle(meta.side, meta.nudge)}
              >
                {node.title}
              </span>
            </div>
          )
        })}
      </div>

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
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
            >

              <div className="flex items-center gap-3">
                <svg
                  aria-hidden="true"
                  width={STATION_META.get(active.id).interchange ? 24 : 20}
                  height={STATION_META.get(active.id).interchange ? 24 : 20}
                  viewBox="0 0 24 24"
                  className="shrink-0"
                >
                  <circle cx="12" cy="12" r="8.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3.4" />
                </svg>
                <h3 className="min-w-0 truncate text-base font-semibold text-gray-900 dark:text-gray-100">{active.title}</h3>
                <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-gray-400 dark:text-gray-500">{active.year}</span>
              </div>

              <div className="mt-4 flex gap-1.5" aria-hidden="true">
                {servedLines.map((l) => (
                  <span key={l.id} className="h-[7px] flex-1 rounded-full" style={{ backgroundColor: l.color }} />
                ))}
              </div>
              {active.image && (
                <img
                  src={active.image}
                  alt={active.title}
                  className="mt-4 w-full rounded-xl object-cover"
                />
              )}
              {active.body && (
                <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{active.body}</p>
              )}

              {(steps.back.length > 0 || steps.next.length > 0) && (
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col items-start gap-2">
                    {steps.back.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          sfx.pluckStep(-1)
                          openModal(NODE_BY_ID.get(s.id))
                        }}
                        className="flex max-w-full items-center gap-2 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        <span
                          aria-hidden="true"
                          className="h-[7px] w-4 shrink-0 rounded-full"
                          style={{ backgroundColor: s.line.color }}
                        />
                        <span className="truncate">← {NODE_BY_ID.get(s.id).title}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex min-w-0 flex-col items-end gap-2">
                    {steps.next.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          sfx.pluckStep(1)
                          openModal(NODE_BY_ID.get(s.id))
                        }}
                        className="flex max-w-full items-center gap-2 text-[11px] font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        <span className="truncate">{NODE_BY_ID.get(s.id).title} →</span>
                        <span
                          aria-hidden="true"
                          className="h-[7px] w-4 shrink-0 rounded-full"
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
