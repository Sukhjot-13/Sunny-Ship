/**
 * Regression test for the "stuck on Click to Orbit" bug.
 *
 * The title screen hands over to INSPECT mode, but the old code rendered a
 * full-screen `position: fixed; inset: 0` overlay to prompt for pointer lock.
 * In INSPECT mode no pointer lock is ever requested, so that overlay stayed up
 * forever and swallowed every pointer event - OrbitControls could never
 * receive a drag, so the page was completely unresponsive.
 *
 * This asserts that in Inspect mode:
 *   1. nothing full-screen is intercepting pointer events over the canvas
 *   2. dragging actually orbits the camera
 */
import puppeteer from 'puppeteer'

const URL = process.env.URL || 'http://localhost:5173/'

let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`) }
}

const browser = await puppeteer.launch()
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(URL, { waitUntil: 'load' })
// wait for the scene to be ready (the camera hook is installed by SceneRig,
// which mounts in every mode)
await page.waitForFunction(() => !!window.__sunnyCamera, { timeout: 90000 })
// also wait for the loading screen to clear
await page.waitForFunction(
  () => !document.body.innerText.includes('Loading the ship'),
  { timeout: 90000 })

// click the title screen exactly like a user would
await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) =>
    d.textContent.trim() === 'Click to Explore')
  el?.click()
})
await new Promise((r) => setTimeout(r, 600))

console.log('\n=== INSPECT MODE IS INTERACTIVE ===')
{
  // what does the browser think is under the middle of the screen?
  const hit = await page.evaluate(() => {
    const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2)
    return { tag: el?.tagName, cls: el?.className || '', pe: getComputedStyle(el).pointerEvents }
  })
  check('pointer reaches the canvas in the centre of the screen',
    hit.tag === 'CANVAS', `topmost element is <${hit.tag}> (pointer-events: ${hit.pe})`)

  // A more direct invariant than hunting for overlays: wherever you might
  // click or drag, the topmost element must be the canvas. elementFromPoint
  // ignores pointer-events:none elements, so the passive hint is fine.
  const hits = await page.evaluate(() => {
    const pts = [
      [window.innerWidth / 2, window.innerHeight / 2],
      [window.innerWidth / 4, window.innerHeight / 3],
      [window.innerWidth * 0.75, window.innerHeight * 0.4],
      [window.innerWidth / 2, window.innerHeight * 0.9],
      [window.innerWidth / 3, window.innerHeight * 0.75],
    ]
    return pts.map(([x, y]) => {
      const el = document.elementFromPoint(x, y)
      return el?.tagName || 'none'
    })
  })
  const allCanvas = hits.every((t) => t === 'CANVAS')
  check('canvas is the topmost element everywhere you could drag', allCanvas,
    allCanvas ? `${hits.length} sample points all hit the canvas`
      : `hit: ${hits.join(', ')}`)
}

// does dragging actually change the camera?
{
  const camBefore = await page.evaluate(() => {
    const c = window.__sunnyCamera
    return c ? c.toArray() : null
  })
  await page.mouse.move(640, 400)
  await page.mouse.down()
  await page.mouse.move(880, 430, { steps: 12 })
  await page.mouse.up()
  await new Promise((r) => setTimeout(r, 500))
  const camAfter = await page.evaluate(() => {
    const c = window.__sunnyCamera
    return c ? c.toArray() : null
  })
  if (camBefore && camAfter) {
    const moved = Math.hypot(
      camAfter[0] - camBefore[0], camAfter[1] - camBefore[1], camAfter[2] - camBefore[2])
    check('dragging orbits the camera', moved > 0.5, `camera moved ${moved.toFixed(2)} m`)
  } else {
    check('dragging orbits the camera', false, 'camera debug hook missing')
  }
}

console.log('\n=== V STILL LEAVES INSPECT ===')
{
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })))
  await new Promise((r) => setTimeout(r, 700))
  const label = await page.evaluate(() => document.body.innerText)
  check('V switches to Explore', /EXPLORE/.test(label))
  check('Explore asks for the mouse', /Click to Capture Mouse/.test(label))
}

console.log('\n=== NO RUNTIME ERRORS ===')
check('no runtime errors', errors.length === 0, errors.slice(0, 2).join(' | '))

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
await browser.close()
process.exit(fail ? 1 : 0)
