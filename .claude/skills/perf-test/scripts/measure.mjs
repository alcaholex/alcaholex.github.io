// Serves the static export in out/ and drives a throttled browser through the
// real visitor flow: load the page, wait for the LoadingGate to arm, click
// CONTINUE, then sample rAF frame times on the hero and during a scroll-through.
// Prints ONE JSON object to stdout; all narration goes to stderr.
//
//   node .claude/skills/perf-test/scripts/measure.mjs \
//     --label mid --cpu 4 --latency 150 --down 1600 --up 750 [--port 4173] [--headed]
//
// --cpu is a CDP CPUThrottlingRate multiplier (1 = none). --down/--up are kbps,
// --latency ms; omit (or 0) for an unthrottled network. Browser resolution:
// PERF_BROWSER env var, else the standard Chrome/Edge install paths.
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import process from 'node:process'
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const label = opt('label', 'baseline')
const cpu = Number(opt('cpu', 1))
const latencyMs = Number(opt('latency', 0))
const downKbps = Number(opt('down', 0))
const upKbps = Number(opt('up', 0))
const port = Number(opt('port', 4173))
const headed = args.includes('--headed')
// Inspect mode: open the throttled browser for a human to explore — no
// measurements, no auto-click; the script exits when the window is closed.
const inspect = args.includes('--inspect')
// Pre-arm the site's sticky degrade flag: shows/measures the weak-real-GPU
// fallback tier on hardware that wouldn't trigger it naturally.
const forceDegraded = args.includes('--force-degraded')
// No CDP API throttles the GPU; forcing ANGLE onto SwiftShader (software
// rasterization) is the worst-case-GPU stand-in.
const softwareGpu = args.includes('--software-gpu')
const FPS_WINDOW_MS = Number(opt('fps-window', 5000))

// The gate's own escape hatch opens the site at 15s no matter what, so a
// gateReadyMs at/above this means assets never actually reported in.
const GATE_TIMEOUT_MS = 15000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (msg) => process.stderr.write(`[perf-test:${label}] ${msg}\n`)

// ---------- static server for out/ (mirrors GitHub Pages + trailingSlash) ----
const root = resolve('out')
if (!existsSync(join(root, 'index.html'))) {
  console.error('out/index.html not found — run `npm run build` first')
  process.exit(1)
}
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
  '.ico': 'image/x-icon', '.txt': 'text/plain',
}
// GitHub Pages gzips text responses; matching it keeps the throttled loading
// numbers honest (raw JS is ~3x its over-the-wire size).
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt'])
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path.endsWith('/')) path += 'index.html'
  let file = resolve(join(root, path))
  if (!file.startsWith(root)) { res.writeHead(403).end(); return }
  if (!existsSync(file) && existsSync(join(file, 'index.html'))) file = join(file, 'index.html')
  if (!existsSync(file)) { res.writeHead(404).end('not found'); return }
  const ext = extname(file)
  let body = readFileSync(file)
  const headers = { 'content-type': MIME[ext] ?? 'application/octet-stream' }
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
    body = gzipSync(body)
    headers['content-encoding'] = 'gzip'
  }
  res.writeHead(200, headers)
  res.end(body)
})
await new Promise((r) => server.listen(port, r))
log(`serving out/ on :${port}`)

// ---------- browser --------------------------------------------------------
const candidates = [
  process.env.PERF_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const executablePath = candidates.find((p) => existsSync(p))
if (!executablePath) {
  console.error('No Chrome/Edge found. Set PERF_BROWSER to a chromium executable path.')
  process.exit(1)
}
log(`browser: ${executablePath}${headed ? ' (headed)' : ''}`)

const browser = await puppeteer.launch({
  executablePath,
  headless: !(headed || inspect),
  args: [
    '--window-size=1400,940',
    '--disable-extensions',
    // A visible window can't present through ANGLE-on-SwiftShader (the display
    // compositor goes black); the --disable-gpu path keeps it working, while
    // headless sticks with the ANGLE forcing the measured profiles validated.
    ...(softwareGpu
      ? headed || inspect
        ? ['--disable-gpu', '--enable-unsafe-swiftshader']
        : ['--use-angle=swiftshader']
      : []),
  ],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 850 })
  await page.setCacheEnabled(false)
  if (cpu > 1) await page.emulateCPUThrottling(cpu)
  if (downKbps > 0 || latencyMs > 0) {
    await page.emulateNetworkConditions({
      download: downKbps > 0 ? (downKbps * 1000) / 8 : -1,
      upload: upKbps > 0 ? (upKbps * 1000) / 8 : -1,
      latency: latencyMs,
    })
  }

  if (forceDegraded) {
    await page.evaluateOnNewDocument(() => {
      try {
        sessionStorage.setItem('glass-degraded', '1')
      } catch {}
    })
  }

  const t0 = Date.now()
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 })

  if (inspect) {
    log('inspect mode: browse freely — close the browser window to finish')
    await new Promise((r) => browser.on('disconnected', r))
    server.close()
    process.exit(0)
  }

  // The gate arms by removing `disabled` from the CONTINUE button.
  log('waiting for LoadingGate to arm...')
  await page.waitForFunction(
    () => [...document.querySelectorAll('button')]
      .some((b) => b.textContent.includes('CONTINUE') && !b.disabled),
    { timeout: 120000, polling: 100 },
  )
  const gateReadyMs = Date.now() - t0

  const nav = await page.evaluate(() => {
    const [n] = performance.getEntriesByType('navigation')
    const paints = Object.fromEntries(
      performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]),
    )
    const res = performance.getEntriesByType('resource')
    return {
      domContentLoadedMs: Math.round(n.domContentLoadedEventEnd),
      firstContentfulPaintMs: paints['first-contentful-paint'] ?? null,
      requests: res.length,
      transferredKB: Math.round(res.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024),
    }
  })

  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent.includes('CONTINUE'))?.click()
  })
  await sleep(1200) // gate exit fade is 700ms; settle before sampling

  const measureFPS = (ms) => page.evaluate((windowMs) => new Promise((done) => {
    const deltas = []
    const start = performance.now()
    let last = start
    const tick = (now) => {
      deltas.push(now - last)
      last = now
      if (now - start < windowMs) requestAnimationFrame(tick)
      else {
        deltas.shift()
        const total = deltas.reduce((a, b) => a + b, 0)
        const sorted = [...deltas].sort((a, b) => a - b)
        done({
          fps: +(1000 * deltas.length / total).toFixed(1),
          p95FrameMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
          worstFrameMs: +sorted[sorted.length - 1].toFixed(1),
          // >26ms means at least one missed frame at 60Hz
          longFrames: deltas.filter((d) => d > 26).length,
        })
      }
    }
    requestAnimationFrame(tick)
  }), ms)

  log('sampling hero FPS...')
  const heroFPS = await measureFPS(FPS_WINDOW_MS)

  // Real wheel events so Lenis (which owns scrolling) is what gets exercised.
  log('sampling scroll FPS...')
  await page.mouse.move(683, 425)
  const wheeling = (async () => {
    for (let i = 0; i < Math.round(FPS_WINDOW_MS / 200); i++) {
      await page.mouse.wheel({ deltaY: 600 })
      await sleep(200)
    }
  })()
  const scrollFPS = await measureFPS(FPS_WINDOW_MS)
  await wheeling

  // Set by the site's adaptive quality guard when sustained low FPS made it
  // swap to fallback visuals mid-run.
  const adaptiveDegraded = await page.evaluate(() => {
    try {
      return sessionStorage.getItem('glass-degraded') === '1'
    } catch {
      return null
    }
  })

  console.log(JSON.stringify({
    label,
    settings: { cpu, latencyMs, downKbps, upKbps, headed, softwareGpu },
    ...nav,
    gateReadyMs,
    gateTimedOut: gateReadyMs >= GATE_TIMEOUT_MS,
    heroFPS,
    scrollFPS,
    adaptiveDegraded,
  }, null, 2))
} finally {
  await browser.close()
  server.close()
}
