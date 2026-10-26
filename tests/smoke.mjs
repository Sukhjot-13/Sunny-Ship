/**
 * Headless smoke test: loads the site in Chrome with WebGL, waits for the
 * ship, checks for console/page errors, and takes screenshots.
 *
 * Run: node tests/smoke.mjs
 */
import puppeteer from 'puppeteer'
import fs from 'node:fs'

const OUT = 'tests/screenshots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--use-gl=angle',
    '--use-angle=metal',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--window-size=1440,900',
  ],
})

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

const errors = []
const logs = []
page.on('console', (m) => {
  const t = m.text()
  logs.push(`[${m.type()}] ${t}`)
  if (m.type() === 'error') errors.push(t)
})
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('requestfailed', (r) =>
  errors.push(`REQFAIL: ${r.url()} ${r.failure()?.errorText}`)
)

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 120000 })

// wait for the canvas + a few frames
await page.waitForSelector('canvas', { timeout: 60000 })
await new Promise((r) => setTimeout(r, 9000))

const diag = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const gl = c?.getContext('webgl2') || c?.getContext('webgl')
  return {
    hasCanvas: !!c,
    canvasSize: c ? [c.width, c.height] : null,
    webgl: !!gl,
    renderer: gl
      ? (() => {
          const ext = gl.getExtension('WEBGL_debug_renderer_info')
          return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'n/a'
        })()
      : null,
    titleText: document.body.innerText.slice(0, 400),
  }
})

console.log('--- DIAGNOSTICS ---')
console.log(JSON.stringify(diag, null, 2))

await page.screenshot({ path: `${OUT}/01-title.png` })

// enter explore mode
await page.mouse.click(720, 450)
await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: `${OUT}/02-after-click.png` })

// pointer lock is not available headless reliably; drive the store directly
await page.evaluate(() => {
  // switch to explore
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' }))
})
await new Promise((r) => setTimeout(r, 1500))
await page.screenshot({ path: `${OUT}/03-explore.png` })

// simulate movement via key events for a while
await page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
})
await new Promise((r) => setTimeout(r, 2500))
await page.screenshot({ path: `${OUT}/04-walk.png` })
await page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))
})

// fly mode + third person
await page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }))
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC' }))
})
await new Promise((r) => setTimeout(r, 2000))
await page.screenshot({ path: `${OUT}/05-fly-third.png` })

console.log('\n--- CONSOLE (last 40) ---')
console.log(logs.slice(-40).join('\n'))

console.log('\n--- ERRORS ---')
console.log(errors.length ? errors.join('\n') : 'none')

await browser.close()
process.exit(errors.length ? 1 : 0)