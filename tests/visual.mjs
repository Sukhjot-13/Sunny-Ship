/**
 * Visual QA: captures the views that matter so the look can be reviewed.
 * Run: node tests/visual.mjs
 */
import puppeteer from 'puppeteer'
import fs from 'node:fs'

const OUT = 'tests/screenshots'
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=metal', '--enable-unsafe-swiftshader',
         '--ignore-gpu-blocklist', '--window-size=1440,900'],
})
try {
const page = await browser.newPage()
const press = (code) =>
  page.evaluate((c) => window.dispatchEvent(new KeyboardEvent('keydown', { code: c })), code)
const release = (code) =>
  page.evaluate((c) => window.dispatchEvent(new KeyboardEvent('keyup', { code: c })), code)
await page.setViewport({ width: 1440, height: 900 })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForSelector('canvas', { timeout: 60000 })
await page.waitForFunction(()=>window.__ship && !document.body.innerText.includes('Loading the ship'),{timeout:120000})
await sleep(3000)
await page.mouse.click(720, 450)
await sleep(600)
await page.screenshot({ path: `${OUT}/v0-title.png` })

// ---- the app boots into INSPECT; capture orbit angles first ----------
await sleep(1500)

const orbit = async (dx, dy, file) => {
  await page.mouse.move(720, 450)
  await page.mouse.down()
  await page.mouse.move(720 + dx, 450 + dy, { steps: 20 })
  await page.mouse.up()
  await sleep(1200)
  await page.screenshot({ path: `${OUT}/${file}` })
}
await orbit(0, 0, 'v1-inspect-a.png')
await orbit(320, 0, 'v2-inspect-b.png')
await orbit(320, 0, 'v3-inspect-c.png')
await orbit(0, -160, 'v4-inspect-top.png')
await page.mouse.wheel({ deltaY: 300 })
await sleep(1000)
await page.screenshot({ path: `${OUT}/v5-inspect-close.png` })

// ---- switch to Explore and look around the deck -----------------------
await press('KeyV')
await page.waitForFunction(() => !!window.__sunny, { timeout: 60000 })
await sleep(1500)

const look = async (yawDeg, pitchDeg, file) => {
  await page.evaluate(({ y, p }) => window.__sunny.look(y, p), { y: yawDeg, p: pitchDeg })
  await sleep(700)
  await page.screenshot({ path: `${OUT}/${file}` })
}
// yaw -PI/2 faces along the ship's length (the default heading)
const D = Math.PI / 2
await look(D, -4*Math.PI/180, 'v6-deck-forward.png')
await look(-D, -4*Math.PI/180, 'v7-deck-back.png')
await look(0, -6*Math.PI/180, 'v8-deck-starboard.png')
await look(Math.PI, -6*Math.PI/180, 'v9-deck-port.png')
await look(D, 18*Math.PI/180, 'v10-deck-up.png')

// third person
await press('KeyC')
await sleep(900)
await look(D + 0.7, -4*Math.PI/180, 'v11-third-person.png')

// fly
await press('KeyC')
await press('KeyF')
await sleep(400)
await page.evaluate(() => window.__sunny.look(Math.PI/2 + 0.6, -18*Math.PI/180))
await sleep(200)
await press('Space')
await sleep(1800)
await release('Space')
await sleep(900)
await page.screenshot({ path: `${OUT}/v12-flying.png` })

console.log('errors:', errors.length ? errors.join(' | ') : 'none')
process.exitCode=errors.length?1:0
} finally {await browser.close()}
