// The site's sound design, synthesized at call time — no audio files. Two
// voices, both quiet: a plucked snap when a metro station's elastic is let
// go, and a low airy whoosh that follows a 3D title's angular speed, however
// the motion was caused.
//
// The AudioContext is created and resumed ONLY inside gesture-triggered calls
// (snap, unlock): browsers refuse audio before a user gesture, and creating
// the context early just logs warnings. The continuous spin() voice never
// unlocks audio itself — it stays silent until the first grab anywhere,
// which is inevitably the same gesture that starts the motion it would be
// sonifying.

const MASTER = 0.5

let ctx = null
let master = null
let noiseBuf = null
let spinV = null

function ensure(fromGesture) {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
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
    const len = Math.floor(rate * 1.1)
    const buf = ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8)
      }
    }
    const conv = ctx.createConvolver()
    conv.buffer = buf
    const wet = ctx.createGain()
    wet.gain.value = 0.5
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

// Letting the elastic go: still a simple imitation — oscillators and
// envelopes, no feedback anywhere — but with the three tells that make a
// pluck read as a pluck and a band read as rubber. The attack carries a tiny
// pick tick of noise; the filter opens bright and darkens fast, the way a
// real string sheds its high partials first; and the pitch is alive — it
// starts a touch sharp, settles as the band relaxes, and wobbles on a damped
// vibrato that dies within a third of a second. Strength 0–1 sets the pitch:
// the further from home the station was released, the higher the pluck, with
// a whisper of random detune so repeated releases do not ring identically.
// The whole thing takes a send into the shared room, so the twang hangs in
// the air for a moment instead of stopping dead.
export function snap(strength = 0.5) {
  if (!ensure(true)) return
  const t = ctx.currentTime
  const k = Math.max(0, Math.min(1, strength))
  const freq = (10 + 500 * k) * (1 + (Math.random() - 0.5) * 0.06)

  // Everything sums through this filter, whose closing sweep is the spectral
  // decay; a slice of the sum goes to the room.
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(2400 + 1400 * k, t)
  lp.frequency.exponentialRampToValueAtTime(700, t + 0.28)
  lp.Q.value = 0.7
  lp.connect(master)
  const send = ctx.createGain()
  send.gain.value = 0.4
  lp.connect(send)
  send.connect(reverbIn())

  // The rubber wobble: a damped vibrato shared by both partials.
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 13
  const lfoDepth = ctx.createGain()
  lfoDepth.gain.setValueAtTime(freq * 0.07, t)
  lfoDepth.gain.exponentialRampToValueAtTime(0.01, t + 0.3)
  lfo.connect(lfoDepth)
  lfo.start(t)
  lfo.stop(t + 0.45)

  // Fundamental, and a quieter octave that dies faster — the bright edge of
  // the pluck without any lasting buzz. Each starts ~16% sharp and settles:
  // the band snapping back to its resting tension.
  for (const [mult, peak, decay] of [[1, 0.08 + 0.07 * k, 0.38], [2, 0.03, 0.14]]) {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(freq * mult * 1.16, t)
    o.frequency.exponentialRampToValueAtTime(freq * mult, t + 0.07)
    lfoDepth.connect(o.frequency)
    const g = ctx.createGain()
    g.gain.setValueAtTime(peak, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    o.connect(g)
    g.connect(lp)
    o.start(t)
    o.stop(t + decay + 0.05)
  }

  // The pick: a bandpassed tick of noise, gone in twenty milliseconds.
  const n = noiseSource()
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2300
  bp.Q.value = 1.5
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.02 + 0.02 * k, t)
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.02)
  n.connect(bp)
  bp.connect(ng)
  ng.connect(lp)
  n.start(t)
  n.stop(t + 0.04)
}

// A title in motion: a low, airy push of band-limited noise — more moving air
// than hiss, sitting well under the page. Call with angular speed (rad/s)
// every frame there IS motion; loudness and (gently) brightness follow the
// speed, and silence is handled by the watchdog rather than by callers — a
// paused canvas just stops calling, and the voice fades itself out. One
// shared voice on purpose: only one title is ever meaningfully moving, and
// idle canvases never call in (the components threshold at ~0.02 rad/s).
export function spin(speed) {
  if (!ctx || ctx.state !== 'running' || !master) return
  if (!spinV) {
    const src = noiseSource()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.9
    bp.frequency.value = 200
    const g = ctx.createGain()
    g.gain.value = 0
    src.connect(bp)
    bp.connect(g)
    g.connect(master)
    src.start()
    spinV = { bp, g, last: 0 }
    setInterval(() => {
      if (spinV && performance.now() - spinV.last > 200) {
        spinV.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1)
      }
    }, 120)
  }
  spinV.last = performance.now()
  const s = Math.abs(speed)
  const level = Math.min(0.1, s * 0.014)
  spinV.g.gain.setTargetAtTime(level < 0.002 ? 0 : level, ctx.currentTime, 0.07)
  spinV.bp.frequency.setTargetAtTime(50 + Math.min(100, s * 30), ctx.currentTime, 0.09)
}
