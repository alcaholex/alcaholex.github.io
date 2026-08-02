// Regenerates public/baked/{name,projects,art}-{light,dark}.png — the full
// glass material rendered onto each title model, which the degraded fallback
// wears as a flat unlit texture (see applyBakeUVs in GlassMaterial.js).
// Re-run after changing the glass recipe, env colours, page backgrounds, or
// any model GLB:
//   node scripts/bake-surface.mjs
// Needs hardware WebGL (the bake renders real transmission), so run it on a
// machine with a GPU, not in a software-rendering environment.
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import process from 'node:process'
import puppeteer from 'puppeteer-core'

const root = resolve(import.meta.dirname, '..')
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary',
}
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const file = resolve(join(root, path))
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise((r) => server.listen(4180, r))

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

const browser = await puppeteer.launch({ executablePath, headless: true })
try {
  const page = await browser.newPage()
  page.on('pageerror', (err) => {
    console.error('bake page error:', err.message)
  })
  await page.goto('http://localhost:4180/scripts/bake-surface.html')
  await page.waitForFunction(() => window.__result, { timeout: 60000 })
  const bakes = JSON.parse(await page.evaluate(() => window.__result))

  const outDir = join(root, 'public', 'baked')
  mkdirSync(outDir, { recursive: true })
  for (const [key, dataUrl] of Object.entries(bakes)) {
    const png = Buffer.from(dataUrl.split(',')[1], 'base64')
    writeFileSync(join(outDir, `${key}.png`), png)
    console.log(`public/baked/${key}.png (${Math.round(png.length / 1024)}KB)`)
  }
} finally {
  await browser.close()
  server.close()
}
