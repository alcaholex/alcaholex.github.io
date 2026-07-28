// The site's sound design, synthesized at call time — no audio files, and
// no noise beds. Three voices, one instrument: soft dots up the pentatonic
// ladder while a metro station's elastic is stretched, a mallet pluck on the
// same ladder when it is let go, and a low tonal hum in the same key that
// swells while a 3D title is turning.
//
// The AudioContext is created and resumed ONLY inside gesture-triggered calls
// (snap, unlock): browsers refuse audio before a user gesture, and creating
// the context early just logs warnings. spin() never unlocks audio itself —
// it stays silent until the first grab anywhere, which is inevitably the
// same gesture that starts the motion it sonifies.

const MASTER = 0.5

let ctx = null
let master = null
let noiseBuf = null

// iOS mutes plain Web Audio with the ringer switch — an AudioContext counts
// as "ambient" sound, unlike media playback. A PLAYING media element flips
// the page's whole audio session into the playback category, ringer switch
// and all — so a silent, looping <audio> element started inside the same
// first gesture is what lets the synth be heard on a phone set to silent.
// The clip is 50ms of zeroed PCM generated right here; nothing is downloaded
// and nothing is audible from the element itself.
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
  // iOS pauses the element whenever the page is backgrounded, which drops the
  // session back to ambient — so every gesture re-arms it if needed.
  if (keeper.paused) keeper.play().catch(() => {})
}

function ensure(fromGesture) {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (fromGesture) keepAlive()
  if (!ctx && fromGesture) {
    ctx = new AC()
    // A gentle compressor on the bus, so overlapping plucks sum politely
    // instead of clipping.
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -24
    comp.knee.value = 24
    comp.ratio.value = 6
    master = ctx.createGain()
    master.gain.value = MASTER
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

// Bring the audio context up from inside a gesture without playing anything —
// for interactions that should be silent themselves (grabbing a 3D title) but
// precede sounds that cannot unlock audio on their own (the spin whoosh).
export function unlock() {
  ensure(true)
}

// A small synthesized room, built once: the impulse response is just a second
// of noise with a steep exponential decay, which convolves into a perfectly
// serviceable little reverb. Sounds opt in by connecting to the node this
// returns; the wet level is set here so every send shares the same room.
let reverbV = null
function reverbIn() {
  if (!reverbV) {
    const rate = ctx.sampleRate
    // A touch longer and softer-tailed than a plain room: the notes should
    // hang the unhurried way a Mini Metro blip does.
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

// One second of shared white noise; every noisy sound is a filtered slice of
// this same buffer.
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

// The pluck's instrument, tuned the Mini Metro way: releases are clamped to
// a MAJOR PENTATONIC ladder — the wind-chime scale, in which no two notes
// can clash, so a flurry of releases rippling down a line lands as a chord,
// never a dissonance. ROOT moves the whole instrument (220 = A3, the soft
// mallet register); OCTAVES sets its reach.
const PLUCK_ROOT = 220
const PLUCK_OCTAVES = 2
const SCALE = [0, 2, 4, 7, 9]
const PLUCK_NOTES = []
for (let oct = 0; oct < PLUCK_OCTAVES; oct++) {
  for (const st of SCALE) PLUCK_NOTES.push(PLUCK_ROOT * Math.pow(2, oct + st / 12))
}
PLUCK_NOTES.push(PLUCK_ROOT * Math.pow(2, PLUCK_OCTAVES))

// Letting a station go, voiced like a Mini Metro interaction: a soft mallet
// note rather than a twang. A pure sine fundamental with the quiet
// fourth-harmonic knock of a marimba bar, a felt-soft attack, and no pitch
// theatrics — the note is stable, and only a few cents of jitter keep
// repeats from ringing identically. Strength 0–1 picks the note: the
// further from home the station was released, the higher up the ladder. A
// send into the shared room lets each note hang for a beat, which is most
// of the game-like calm.
export function snap(strength = 0.5) {
  if (!ensure(true)) return
  const t = ctx.currentTime
  const k = Math.max(0, Math.min(1, strength))
  // Straight map: stretch walks the ladder evenly from bottom to top. The
  // jitter is a few CENTS of humanization, so repeats do not ring
  // identically but every pluck still lands squarely on its note.
  const note = PLUCK_NOTES[Math.round(k * (PLUCK_NOTES.length - 1))]
  const freq = note * (1 + (Math.random() - 0.5) * 0.008)

  // Everything sums through this filter; a gentle close rounds the tail off.
  // A slice of the sum goes to the room.
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

  // Mallet voicing: a pure fundamental, plus the quiet fourth-harmonic "bar
  // mode" that gives a marimba its knock, dying an order of magnitude
  // faster. The 5ms ramp on the way in is the felt of the mallet — an
  // instantaneous start reads as a click, not a tap.
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

  // A pluck ends the gesture, so the next stretch starts a fresh preview.
  stretchIdx = -1
  stretchAt = 0

  // The contact: a woody tap of low bandpassed noise — mallet on bar, not
  // pick on string — gone in fifteen milliseconds.
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

// Stretching the elastic previews the instrument, the way drawing a line in
// Mini Metro steps through notes: each rung of the pentatonic ladder crossed
// plays one small soft dot — up as the band is pulled, back down as it is
// let in — and because the release pluck picks its note from the same
// distance, the last dot heard is the note the pluck will land on. Dots are
// quieter and shorter than a pluck so the release stays the event. Call
// every frame of a drag with the normalized stretch (0–1); a gap in the
// calls starts a fresh preview, silently.
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
  // A new gesture adopts its starting rung without sounding it; a fast drag
  // that crosses several rungs in one frame plays only the one it lands on.
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

// A title in motion HUMS: a soft major-triad drone on the same A the mallet
// is tuned to, swelling from silence with rotation speed — the register of
// Mini Metro's own ambient pads, where a running train is a sustained tone,
// not a noise or a click track. The pitch never moves; speed speaks only
// through volume and assembly. The chord builds with speed: a slow turn is
// a bare low hum, the fifth opens above it as the word gets going, the
// major third fills the triad at a proper spin, and the octave crowns the
// chord only at a genuinely hard one — so the harmony itself is the
// speedometer, four notes deep. Just-intonation intervals (3/2, 5/4, 2/1),
// which pure sines reward: the chord locks with zero beating. No
// noise, no ticking, no melody. The voice is persistent and a watchdog
// fades it once the calls stop — a paused canvas just goes quiet.
const DRONE_ROOT = 220
let droneV = null
let droneCallAt = 0

export function spin(delta) {
  if (!ctx || ctx.state !== 'running' || !master) return
  // Speed from the spacing of the calls themselves, so it is frame-rate
  // independent: travel per frame over time per frame.
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
    // A little of the shared room softens the hum's edges.
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
  // The third joins next — quieter than the fifth, and only once the word
  // is properly spinning.
  droneV.third.g.gain.setTargetAtTime(
    level < 0.002 ? 0 : level * 0.4 * Math.min(1, Math.max(0, (s - 1.2) / 2.2)),
    t,
    0.09
  )
  // And the octave crowns it, arriving only at a genuinely hard spin — the
  // fourth voice that turns the triad into a full close-out.
  droneV.octave.g.gain.setTargetAtTime(
    level < 0.002 ? 0 : level * 0.35 * Math.min(1, Math.max(0, (s - 2.5) / 2.5)),
    t,
    0.09
  )
  // No speed-glide: the chord sits fixed on its root, and speed speaks only
  // through volume and how much of the chord has assembled.
}

