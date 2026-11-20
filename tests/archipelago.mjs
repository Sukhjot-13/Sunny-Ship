import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'

const browser = await puppeteer.launch()
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  const url = process.env.URL || 'http://localhost:5173/'
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.sunny-title button', { timeout: 90000 })
  await page.locator('.sunny-title button').click()
  await page.waitForFunction(() => window.__ship && window.__sunnyNavigation, { timeout: 90000 })
  await page.waitForSelector('.voyage-island')

  const selectedIsland = () => page.$eval('.voyage-island', element => element.textContent)
  assert.equal(await selectedIsland(), 'Lantern Cay')
  await page.keyboard.press('n')
  assert.equal(await selectedIsland(), 'Twin Fangs')
  await page.locator('button[aria-keyshortcuts="N"]').click()
  assert.equal(await selectedIsland(), 'Mikan Shoals')

  await page.locator('button[aria-keyshortcuts="M"]').click()
  await page.waitForFunction(() => window.__sunnyNavigation.state.helm)
  await page.waitForFunction(() => window.__sunnyCamera.x > 110 && window.__sunnyCamera.y > 90)
  const chaseEye = await page.evaluate(() => window.__sunnyCamera.toArray())
  await page.mouse.move(720, 400)
  await page.mouse.down()
  await page.mouse.move(810, 410, { steps: 8 })
  await page.mouse.up()
  assert(await page.evaluate(eye => window.__sunnyCamera.distanceTo(window.__sunnyCamera.clone().fromArray(eye)) > 2, chaseEye))
  await page.keyboard.press('p')
  await page.waitForFunction(() => window.__sunnyCamera.z > 80)
  await page.keyboard.press('p')
  await page.waitForFunction(() => window.__sunnyCamera.x > 110 && window.__sunnyCamera.y > 90)

  await page.keyboard.press('j')
  await page.waitForFunction(() => window.__sunnyNavigation.state.jawOpen)
  await page.keyboard.press('k')
  await page.waitForFunction(() => document.body.innerText.includes('Gaon hit Red Jackal'))
  await page.keyboard.press('k')
  await page.waitForFunction(() => document.body.innerText.includes('Red Jackal is sinking'))
  await page.keyboard.press('r')
  await page.waitForFunction(() => !window.__sunnyNavigation.state.helm)
  await page.keyboard.press('m')
  await page.waitForFunction(() => window.__sunnyNavigation.state.helm)
  await page.keyboard.down('w')
  await page.waitForFunction(() => window.__sunnyNavigation.state.speed > 15, { timeout: 15000 })
  await page.keyboard.up('w')
  const departure = await page.evaluate(() => window.__sunnyNavigation.state)
  await page.keyboard.down('d')
  await page.waitForFunction(
    heading => window.__sunnyNavigation.state.heading > heading + 5,
    { timeout: 15000 },
    departure.heading,
  )
  await page.keyboard.up('d')
  assert(await page.evaluate(east => window.__sunnyNavigation.state.east < east, departure.east))
  await page.keyboard.press('m')
  await page.waitForFunction(() => !window.__sunnyNavigation.state.helm)

  await page.keyboard.press('r')
  await page.waitForFunction(() => window.__sunnyNavigation.state.east === 0)
  assert.equal(await selectedIsland(), 'Lantern Cay')
  await page.keyboard.press('v')
  await page.waitForFunction(() => !!window.__sunny)
  await page.keyboard.press('f')
  await page.waitForFunction(() => document.body.innerText.includes('Q/E altitude'))
  await page.evaluate(() => window.__sunny.look(Math.PI / 2, 0.53))
  const flightStart = await page.evaluate(() => window.__sunny.position[1])
  await page.keyboard.down('w')
  await page.waitForFunction(height => window.__sunny.position[1] > height + 2, {}, flightStart)
  await page.keyboard.up('w')
  await page.evaluate(() => {
    window.__sunny.teleport(-190, 38, 0)
    window.__sunny.look(Math.PI / 2, -0.38)
  })
  await page.keyboard.down('w')
  await page.waitForFunction(() => {
    const { position, vel } = window.__sunny
    return position[1] < 33 && Math.hypot(...vel) > 58
  })
  await page.keyboard.up('w')
  await page.keyboard.press('v')
  await page.waitForSelector('.voyage-controls')

  await page.close()
  const mobile = await browser.newPage()
  mobile.on('pageerror', error => errors.push(error.message))
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  await mobile.goto(url, { waitUntil: 'domcontentloaded' })
  await mobile.waitForSelector('.sunny-title button', { timeout: 90000 })
  await mobile.tap('.sunny-title button')
  await mobile.waitForSelector('button[aria-keyshortcuts="M"]')
  await mobile.tap('button[aria-keyshortcuts="M"]')
  const throttleButton = await mobile.waitForSelector('button[aria-label="Increase throttle"]', { visible: true })
  const bounds = await throttleButton.boundingBox()
  const touch = await mobile.touchscreen.touchStart(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await mobile.waitForFunction(() => window.__sunnyNavigation.state.throttle > 0.12)
  await touch.end()
  await new Promise(resolve => setTimeout(resolve, 120))
  const releasedThrottle = await mobile.evaluate(() => window.__sunnyNavigation.state.throttle)
  await new Promise(resolve => setTimeout(resolve, 250))
  assert.equal(await mobile.evaluate(() => window.__sunnyNavigation.state.throttle), releasedThrottle)
  assert.deepEqual(errors, [])
  console.log('PASS aerial chase and orbit cameras, keyboard and touch sailing, Gaon hits, Log Pose and pitch flight')
} finally {
  await browser.close()
}
