// All sounds are synthesized here at call time; no audio files. The context
// is created/resumed ONLY from gesture-bound calls (unlock, snap, navTo) —
// browsers refuse audio before a user gesture, and the continuous voices
// (spin, stretchTo) stay silent until something has unlocked it.
const MASTER = 0.5

let ctx = null
let master = null
let noiseBuf = null

let mutedFlag = false
export function setMuted(m) {
  mutedFlag = m
  if (ctx && master) {
    master.gain.setTargetAtTime(m ? 0 : MASTER, ctx.currentTime, 0.02)
  }
}
export function isMuted() {
  return mutedFlag
}

// iOS mutes plain Web Audio with the ringer switch; a PLAYING media element
// flips the session to the playback category, switch and all. The keeper is
// 50ms of silent PCM generated in memory, looping; re-armed per gesture
// because backgrounding pauses it.
let keeper = null
function keepAlive() {
  if (typeof document === 'undefined') return
  if (!keeper) {
    const rate = 8000
    const samples = 400
    const buf = new ArrayBuffer(44 + samples * 2)
    const v = new DataView(buf)
    const tag = (off, s) => {
      for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i))
    }
    tag(0, 'RIFF')
    v.setUint32(4, 36 + samples * 2, true)
    tag(8, 'WAVE')
    tag(12, 'fmt ')
    v.setUint32(16, 16, true)
    v.setUint16(20, 1, true)
    v.setUint16(22, 1, true)
    v.setUint32(24, rate, true)
    v.setUint32(28, rate * 2, true)
    v.setUint16(32, 2, true)
    v.setUint16(34, 16, true)
    tag(36, 'data')
    v.setUint32(40, samples * 2, true)
    keeper = document.createElement('audio')
    keeper.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
    keeper.loop = true
    keeper.setAttribute('playsinline', '')
  }

  if (keeper.paused) keeper.play().catch(() => {})
}

function ensure(fromGesture) {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (fromGesture) keepAlive()
  if (!ctx && fromGesture) {
    ctx = new AC()

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -24
    comp.knee.value = 24
    comp.ratio.value = 6
    master = ctx.createGain()
    master.gain.value = mutedFlag ? 0 : MASTER
    master.connect(comp)
    comp.connect(ctx.destination)
  }
  if (!ctx) return null
  if (ctx.state === 'suspended') {
    if (!fromGesture) return null
    ctx.resume()
  }
  return ctx
}

export function unlock() {
  ensure(true)
}

let reverbV = null
function reverbIn() {
  if (!reverbV) {
    const rate = ctx.sampleRate

    const len = Math.floor(rate * 1.4)
    const buf = ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
      }
    }
    const conv = ctx.createConvolver()
    conv.buffer = buf
    const wet = ctx.createGain()
    wet.gain.value = 0.45
    conv.connect(wet)
    wet.connect(master)
    reverbV = conv
  }
  return reverbV
}

function noiseSource() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  return src
}

const PLUCK_ROOT = 220
const PLUCK_OCTAVES = 3
const SCALE = [0, 2, 4, 7, 9]
const PLUCK_NOTES = []
for (let oct = 0; oct < PLUCK_OCTAVES; oct++) {
  for (const st of SCALE) PLUCK_NOTES.push(PLUCK_ROOT * Math.pow(2, oct + st / 12))
}
PLUCK_NOTES.push(PLUCK_ROOT * Math.pow(2, PLUCK_OCTAVES))

export function snap(strength = 0.5) {
  if (!ensure(true)) return
  const t = ctx.currentTime
  const k = Math.max(0, Math.min(1, strength))

  const note = PLUCK_NOTES[Math.round(k * (PLUCK_NOTES.length - 1))]
  const freq = note * (1 + (Math.random() - 0.5) * 0.008)

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(1900 + 900 * k, t)
  lp.frequency.exponentialRampToValueAtTime(900, t + 0.3)
  lp.Q.value = 0.5
  lp.connect(master)
  const send = ctx.createGain()
  send.gain.value = 0.4
  lp.connect(send)
  send.connect(reverbIn())

  for (const [mult, peak, decay] of [[1, 0.28 + 0.12 * k, 0.5], [4, 0.06, 0.09]]) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq * mult
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    o.connect(g)
    g.connect(lp)
    o.start(t)
    o.stop(t + decay + 0.05)
  }

  stretchIdx = -1
  stretchAt = 0

  const n = noiseSource()
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 850
  bp.Q.value = 1
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.05 + 0.03 * k, t)
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.015)
  n.connect(bp)
  bp.connect(ng)
  ng.connect(lp)
  n.start(t)
  n.stop(t + 0.03)
}

let stepIdx = 0
export function pluckReset() {
  stepIdx = 0
}
export function pluckStep(dir) {
  const n = PLUCK_NOTES.length
  stepIdx = (stepIdx + (dir > 0 ? 1 : -1) + n) % n
  snap(stepIdx / (n - 1))
}

const STRETCH_GAP_MS = 300
const STRETCH_MIN_MS = 40
let stretchIdx = -1
let stretchAt = 0
let stretchBlipAt = 0

export function stretchTo(amount) {
  if (!ctx || ctx.state !== 'running' || !master) return
  const now = performance.now()
  const fresh = now - stretchAt > STRETCH_GAP_MS
  stretchAt = now
  const idx = Math.round(
    Math.max(0, Math.min(1, amount)) * (PLUCK_NOTES.length - 1)
  )

  if (fresh || idx === stretchIdx) {
    stretchIdx = idx
    return
  }
  stretchIdx = idx
  if (now - stretchBlipAt < STRETCH_MIN_MS) return
  stretchBlipAt = now

  const t = ctx.currentTime
  const freq = PLUCK_NOTES[idx] * (1 + (Math.random() - 0.5) * 0.008)
  const send = ctx.createGain()
  send.gain.value = 0.3
  send.connect(reverbIn())
  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.05, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
  o.connect(g)
  g.connect(master)
  g.connect(send)
  o.start(t)
  o.stop(t + 0.16)
}

const NAV_CHORDS = [
  [1, 1.25, 1.5],
  [4 / 3, 5 / 3, 2],
  [1.5, 1.875, 2.25],
  [2, 2.5, 3],
]
export function navTo(stop, emphatic = false) {
  if (emphatic) {
    if (!ensure(true)) return
  } else if (!ctx || ctx.state !== 'running' || !master) {
    return
  }
  const t = ctx.currentTime
  const chord = NAV_CHORDS[Math.max(0, Math.min(NAV_CHORDS.length - 1, stop))]
  const jitter = 1 + (Math.random() - 0.5) * 0.008
  const send = ctx.createGain()
  send.gain.value = 0.35
  send.connect(reverbIn())

  const peaks = emphatic ? [0.09, 0.055, 0.045] : [0.055, 0.034, 0.028]
  const swell = 0.08
  const hold = emphatic ? 0.1 : 0.06
  const release = 0.25
  chord.forEach((ratio, i) => {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = PLUCK_ROOT * ratio * jitter
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peaks[i], t + swell)
    g.gain.setValueAtTime(peaks[i], t + swell + hold)
    g.gain.setTargetAtTime(0, t + swell + hold, release / 4)
    o.connect(g)
    g.connect(master)
    g.connect(send)
    o.start(t)
    o.stop(t + swell + hold + release + 0.2)
  })
}

export function swipe(stop) {
  if (!ctx || ctx.state !== 'running' || !master) return
  const t = ctx.currentTime
  const chord = NAV_CHORDS[Math.max(0, Math.min(NAV_CHORDS.length - 1, stop))]
  const jitter = 1 + (Math.random() - 0.5) * 0.008
  const send = ctx.createGain()
  send.gain.value = 0.35
  send.connect(reverbIn())
  const peaks = [0.05, 0.031, 0.026]
  chord.forEach((ratio, i) => {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = PLUCK_ROOT * ratio * jitter
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peaks[i], t + 0.3)
    g.gain.setValueAtTime(peaks[i], t + 0.42)
    g.gain.setTargetAtTime(0, t + 0.42, 0.09)
    o.connect(g)
    g.connect(master)
    g.connect(send)
    o.start(t)
    o.stop(t + 1.1)
  })
}

const DRONE_ROOT = 220
let droneV = null
let droneCallAt = 0

export function spin(delta) {
  if (!ctx || ctx.state !== 'running' || !master) return

  const now = performance.now()
  const dt = Math.min(0.1, Math.max(0.008, (now - droneCallAt) / 1000))
  droneCallAt = now
  const s = Math.min(6, Math.abs(delta) / dt)

  if (!droneV) {
    const make = (freq) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      const g = ctx.createGain()
      g.gain.value = 0
      o.connect(g)
      g.connect(master)
      o.start()
      return { o, g }
    }
    const root = make(DRONE_ROOT)
    const third = make(DRONE_ROOT * 1.25)
    const fifth = make(DRONE_ROOT * 1.5)
    const octave = make(DRONE_ROOT * 2)

    const send = ctx.createGain()
    send.gain.value = 0.25
    root.g.connect(send)
    third.g.connect(send)
    fifth.g.connect(send)
    octave.g.connect(send)
    send.connect(reverbIn())
    droneV = { root, third, fifth, octave, last: 0 }
    setInterval(() => {
      if (droneV && performance.now() - droneV.last > 160) {
        droneV.root.g.gain.setTargetAtTime(0, ctx.currentTime, 0.12)
        droneV.third.g.gain.setTargetAtTime(0, ctx.currentTime, 0.12)
        droneV.fifth.g.gain.setTargetAtTime(0, ctx.currentTime, 0.12)
        droneV.octave.g.gain.setTargetAtTime(0, ctx.currentTime, 0.12)
      }
    }, 100)
  }
  droneV.last = now

  const t = ctx.currentTime
  const level = Math.min(0.11, s * 0.04)
  droneV.root.g.gain.setTargetAtTime(level < 0.002 ? 0 : level, t, 0.09)
  droneV.fifth.g.gain.setTargetAtTime(
    level < 0.002 ? 0 : level * 0.55 * Math.min(1, s / 2.5),
    t,
    0.09
  )

  droneV.third.g.gain.setTargetAtTime(
    level < 0.002 ? 0 : level * 0.4 * Math.min(1, Math.max(0, (s - 1.2) / 2.2)),
    t,
    0.09
  )

  droneV.octave.g.gain.setTargetAtTime(
    level < 0.002 ? 0 : level * 0.35 * Math.min(1, Math.max(0, (s - 2.5) / 2.5)),
    t,
    0.09
  )
}

