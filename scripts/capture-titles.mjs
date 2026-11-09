// Regenerate the title snapshots in public/titles/ from the live scenes.
// Usage: node scripts/capture-titles.mjs [port]   (expects a dev server)
// Must be re-run whenever a GLB, AO map, TitleMaterial color, camera, or
// Center scale changes; update the GEOM numbers in TitleSnapshot.js from the
// logged output. See CLAUDE.md "Title snapshots".
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))
const puppeteer = require('puppeteer-core')
const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const executablePath = candidates.find((p) => existsSync(p))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PORT = process.argv[2] || '3000'
const OUT_DIR = join(root, 'public', 'titles')
mkdirSync(OUT_DIR, { recursive: true })

// Capture at 2x — mipmap-averaged 1x pixels hide misalignment (see CLAUDE.md).
const W = 1440, H = 900, DPR = 2

const trimFn = (b64) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height)
    let minX = width, minY = height, maxX = -1, maxY = -1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 10) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < 0) return reject(new Error('no opaque pixels'))
    const w = maxX - minX + 1, h = maxY - minY + 1
    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    out.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, w, h)
    resolve({ webp: out.toDataURL('image/webp', 0.92), x: minX, y: minY, w, h })
  }
  img.onerror = () => reject(new Error('decode failed'))
  img.src = 'data:image/png;base64,' + b64
})

const browser = await puppeteer.launch({ executablePath, headless: true })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: W, height: H, deviceScaleFactor: DPR })
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  // All scenes ready = every snapshot has faded out.
  await page.waitForFunction(() => {
    const snaps = document.querySelectorAll('[data-snapshot]')
    return snaps.length === 3 && [...snaps].every((s) => s.style.opacity === '0')
  }, { timeout: 60000 })
  await sleep(500)

  await page.evaluate(() => {
    // No-op the scroll globals so SlideInSection's snap can't hijack
    // programmatic navigation; keep the original for our own jumps.
    window.__origScroll = { scrollTo: window.scrollTo.bind(window) }
    window.scrollTo = () => {}
    window.scrollBy = () => {}
    Element.prototype.scrollIntoView = () => {}
    const style = document.createElement('style')
    style.textContent = `
      html, body { background: transparent !important }
      * { background-color: transparent !important; background-image: none !important; box-shadow: none !important }
      body * { visibility: hidden !important }
      canvas { visibility: visible !important }
    `
    document.head.appendChild(style)
  })

  const TITLES = [
    ['name', '#section-1'],
    ['projects', '#section-3'],
    ['art', '#section-4'],
  ]

  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => {
      document.documentElement.classList.toggle('dark', t === 'dark')
    }, theme)
    await sleep(400)

    for (const [id, sel] of TITLES) {
      await page.evaluate((s) => {
        const el = document.querySelector(s) || document.getElementById(s.slice(1))
        if (el) window.__origScroll.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
      }, sel)
      await sleep(1000)
      const b64 = await page.screenshot({ omitBackground: true, encoding: 'base64' })
      const { webp, x, y, w, h } = await page.evaluate(trimFn, b64)
      writeFileSync(join(OUT_DIR, `${id}-${theme}.webp`), Buffer.from(webp.split(',')[1], 'base64'))
      const widthVw = ((w / DPR / W) * 100).toFixed(2)
      const cxPct = (((x + w / 2) / DPR / W) * 100).toFixed(2)
      const cyPct = (((y + h / 2) / DPR / H) * 100).toFixed(2)
      console.log(`${id}-${theme}: GEOM { width: '${widthVw}vw', left: '${cxPct}%', top: '${cyPct}%' }`)
    }
  }
  console.log('done — sync any changed GEOM numbers into TitleSnapshot.js')
} finally {
  await browser.close()
}
