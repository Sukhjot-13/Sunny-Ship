/**
 * In-browser gameplay verification.
 *
 * Drives the real app in headless Chrome and asserts on live player state:
 *   - the ship loads and renders (WebGL frames drawn)
 *   - the player spawns standing on the main deck (not in the sea)
 *   - walking keeps the player supported
 *   - running is faster than walking
 *   - jumping leaves the ground and comes back down to the SAME height
 *   - the player cannot walk off the deck edge
 *   - every camera/movement mode toggles
 *
 * Run: npm run dev  (in another shell)  then  node tests/gameplay.mjs
 */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import { loadColliders } from './glb.mjs'
import { stairFlights, walkFlight, walkJourney } from './stairFlights.mjs'
import { OCEAN_SIZE_M, OCEAN_SEGMENTS } from '../src/config/renderConfig.js'

const OUT = 'tests/screenshots'
fs.mkdirSync(OUT, { recursive: true })
const URL = process.env.URL || 'http://localhost:5173/'
const shipMeta = JSON.parse(fs.readFileSync('public/models/ship-metadata.json','utf8'))
const waterLevel = shipMeta.waterLevel

let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`) }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--use-gl=angle', '--use-angle=metal', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--enable-webgl', '--window-size=1440,900',
  ],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text())
})

const press = (code) =>
  page.evaluate((c) => window.dispatchEvent(new KeyboardEvent('keydown', { code: c })), code)
const release = (code) =>
  page.evaluate((c) => window.dispatchEvent(new KeyboardEvent('keyup', { code: c })), code)
const state = () => page.evaluate(() => {
  const s = window.__sunny
  return s ? { pos: s.position, grounded: s.grounded, speed: s.speed,
               colliders: s.colliderCount, floors: s.floorCount, spawn: s.spawn } : null
})
const hold = async (code, ms) => { await press(code); await sleep(ms); await release(code) }
const respawn = async () => {
  await page.evaluate(() => window.__sunny?.respawn())
  await sleep(500)
}

console.log('=== LOADING ===')
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
await page.waitForSelector('canvas', { timeout: 60000 })
await page.waitForFunction(()=>window.__ship && !document.body.innerText.includes('Loading the ship'),{timeout:120000})
await sleep(3000)

// dismiss the title screen (the HUD only renders once started)
await page.mouse.click(720, 450)
await sleep(800)

// the app boots into Inspect mode; switch to Explore so the player mounts
await press('KeyV')
await page.waitForFunction(() => !!window.__sunny, { timeout: 90000 })
await sleep(1500)
if (errors.length) {
  console.log('LOAD ERRORS:', errors.slice(0, 6).join('\n  '))
}

let s = await state()
check('player controller is alive', !!s)
check('collision world loaded', s.colliders > 10, `${s.colliders} colliders, ${s.floors} floors`)
check('player is grounded at spawn', s.grounded, `grounded=${s.grounded}`)
check('player is above the sea', s.pos[1] > waterLevel + 1,
  `y=${s.pos[1].toFixed(2)} (water=${waterLevel.toFixed(2)})`)
check('player is near deck height', Math.abs(s.pos[1] - s.spawn[1]) < 1.0,
  `y=${s.pos[1].toFixed(2)} spawn=${s.spawn[1].toFixed(2)}`)
await page.screenshot({ path: `${OUT}/g1-spawn-deck.png` })

console.log('\n=== WALKING ===')
await respawn()
// Sample peak speed while moving; the deck has railings/masts so a naive
// straight-line walk can legitimately stop against a post.
const samplePeak = async (keys, ms) => {
  const stop = Date.now() + ms
  for (const k of keys) await press(k)
  let peak = 0
  while (Date.now() < stop) {
    const s = await state()
    if (s) peak = Math.max(peak, s.speed)
    await sleep(60)
  }
  for (const k of keys) await release(k)
  await sleep(200)
  return peak
}

const before = (await state()).pos.slice()
const walkPeak = await samplePeak(['KeyW'], 2000)
const afterWalk = (await state()).pos
const walked = Math.hypot(afterWalk[0] - before[0], afterWalk[2] - before[2])
check('player moves under WASD', walked > 0.8, `moved ${walked.toFixed(2)} m`)
check('walking speed is sensible', walkPeak > 2.5 && walkPeak < 4.0,
  `peak ${walkPeak.toFixed(2)} m/s (expect ~3.4)`)
check('still grounded while walking', (await state()).grounded)
check('still above water while walking', afterWalk[1] > waterLevel + 1, `y=${afterWalk[1].toFixed(2)}`)
await page.screenshot({ path: `${OUT}/g2-walked.png` })

console.log('\n=== RUNNING ===')
await respawn()
const runPeak = await samplePeak(['KeyW', 'ShiftLeft'], 2000)
check('running is faster than walking', runPeak > walkPeak + 1.5,
  `walk=${walkPeak.toFixed(2)} run=${runPeak.toFixed(2)} m/s`)
check('running speed is sensible', runPeak < 9, `peak ${runPeak.toFixed(2)} m/s (expect ~6.6)`)

console.log('\n=== JUMPING ===')
await respawn()
await sleep(600)
const groundY = (await state()).pos[1]
await press('Space')
await sleep(260)
const midY = (await state()).pos[1]
const airborne = !(await state()).grounded
await release('Space')
await sleep(1600)
const landedY = (await state()).pos[1]
check('jump leaves the ground', airborne && midY > groundY + 0.2,
  `ground=${groundY.toFixed(2)} peak>${midY.toFixed(2)} airborne=${airborne}`)
check('player lands back at deck height', Math.abs(landedY - groundY) < 0.35,
  `landed=${landedY.toFixed(2)} ground=${groundY.toFixed(2)}`)
check('grounded again after landing', (await state()).grounded)

console.log('\n=== TRAVERSING THE SHIP ===')
await respawn()
// Measure reach in each cardinal direction from spawn. Walking straight into
// a railing post and stopping is correct behaviour, so each direction is
// measured independently against its own reasonable distance.
const DIR_NAMES = { KeyA: 'port', KeyD: 'starboard', KeyW: 'bow', KeyS: 'stern' }
const reaches = {}
for (const key of Object.keys(DIR_NAMES)) {
  await respawn()
  const p0 = (await state()).pos.slice()
  await press(key)
  await sleep(2500)
  await release(key)
  await sleep(200)
  const p1 = (await state()).pos.slice()
  reaches[key] = Math.hypot(p1[0] - p0[0], p1[2] - p0[2])
  console.log(`  ${DIR_NAMES[key].padEnd(10)} reached ${reaches[key].toFixed(2)} m`)
}
{
  const all = Object.values(reaches)
  const minR = Math.min(...all)
  const maxR = Math.max(...all)
  const total = all.reduce((a, b) => a + b, 0)
  check('can leave spawn in every direction', minR > 1.0, `min ${minR.toFixed(2)} m before the nearest fixture`)
  check('walks a good distance in the open directions', maxR > 5,
    `max ${maxR.toFixed(2)} m`)
  check('lawn is traversable around the fixtures', total > 12,
    `combined ${total.toFixed(1)} m across 4 directions`)
}
await respawn()
await page.screenshot({ path: `${OUT}/g3-traversed.png` })

console.log('\n=== CANNOT WALK OFF THE SHIP ===')
await respawn()
// run hard in every direction for a while; the player must stay on the deck
let worst = 0
for (const code of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
  await hold(code, 2600)
  await sleep(200)
  const p = (await state()).pos
  worst = Math.min(worst, p[1])
}
check('never fell into the sea while running', worst > waterLevel+1, `lowest y=${worst.toFixed(2)}`)
check('still grounded after sprinting', (await state()).grounded)
await page.screenshot({ path: `${OUT}/g3-after-sprint.png` })

// Stepping off the edge must be a short recovery, not a dive. The deck sits
// ~7 m above the waterline, so a guard that only fires near the water means a
// long free-fall first.
{
  await respawn()
  const safe = (await state()).pos.slice()
  await page.evaluate(() => {
    const s = window.__sunny
    s.teleport(s.lastSafe[0] + 45, s.lastSafe[1] + 0.5, s.lastSafe[2])
  })
  let lowest = Infinity
  for (let i = 0; i < 12; i++) {
    await sleep(100)
    lowest = Math.min(lowest, (await state()).pos[1])
  }
  const end = (await state()).pos
  check('going over the edge never drops near the water',
    lowest > safe[1] - 3.0, `lowest y=${lowest.toFixed(2)} vs deck ${safe[1].toFixed(2)}`)
  check('going over the edge puts you back on the deck',
    end[1] > safe[1] - 1.0, `y=${end[1].toFixed(2)}`)
}

console.log('\n=== MODES ===')
const modeText = () => page.evaluate(() => document.body.innerText)
await press('KeyV'); await sleep(900)
check('V switches to Inspect', (await modeText()).includes('INSPECT'))
await page.screenshot({ path: `${OUT}/g4-inspect.png` })

await press('KeyV'); await sleep(900)
check('V returns to Explore', (await modeText()).includes('EXPLORE'))

// Exercise preservation away from spawn, where resetting would be visible.
await hold('KeyA',700); await sleep(250)
const posBeforeToggle = (await state()).pos.slice()
await press('KeyV'); await sleep(800)      // into inspect
await press('KeyV'); await sleep(800)      // back to explore
const posAfterToggle = (await state()).pos.slice()
check('player position preserved across Inspect',
  Math.hypot(posAfterToggle[0] - posBeforeToggle[0], posAfterToggle[2] - posBeforeToggle[2]) < 0.05,
  `moved ${Math.hypot(posAfterToggle[0]-posBeforeToggle[0], posAfterToggle[2]-posBeforeToggle[2]).toFixed(3)} m`)

await press('KeyC'); await sleep(700)
check('C switches to 3rd person', (await modeText()).includes('3RD PERSON'))
await page.screenshot({ path: `${OUT}/g5-third-person.png` })
await press('KeyC'); await sleep(500)
check('C switches back to 1st person', (await modeText()).includes('1ST PERSON'))

await press('KeyF'); await sleep(700)
check('F enables fly mode', (await modeText()).includes('FLY'))
const flyPos = (await state()).pos.slice()
await press('KeyW'); await press('Space'); await sleep(1500)
const flyPos2 = (await state()).pos.slice()
check('fly mode lifts the player up', flyPos2[1] > flyPos[1] + 1.5,
  `y ${flyPos[1].toFixed(1)} -> ${flyPos2[1].toFixed(1)}`)
await page.screenshot({ path: `${OUT}/g6-fly.png` })
await release('KeyW'); await release('Space')
// Toggle with both the visible button and B; exercise a real bare bulkhead.
check('flight collision starts off',!(await page.evaluate(()=>window.__sunny.flyCollision)))
await page.click('button[aria-pressed]')
check('flight collision button enables it',await page.evaluate(()=>window.__sunny.flyCollision))
const bulkhead=loadColliders('public/models/sunny.glb').find(m=>m.name==='Sunny_RoomPartition_b1_1_seg0')
const wallX=(bulkhead.min.x+bulkhead.max.x)/2,wallZ=(bulkhead.min.z+bulkhead.max.z)/2
const wallStart=[wallX-1.4,shipMeta.interiors.levels.B1+0.4,wallZ]
await page.evaluate(s=>{window.__sunny.teleport(...s);window.__sunny.look(-Math.PI/2,0)},wallStart)
await hold('KeyW',650)
check('flying with collision stops at a real partition wall',(await state()).pos[0]<bulkhead.min.x-0.3)
await press('KeyB');await release('KeyB')
check('B disables flight collision',!(await page.evaluate(()=>window.__sunny.flyCollision)))
await page.evaluate(s=>window.__sunny.teleport(...s),wallStart)
await hold('KeyW',650)
check('flying without collision passes the same wall',(await state()).pos[0]>bulkhead.max.x+1)
await press('KeyF'); await sleep(600)
check('F returns to walking', (await modeText()).includes('1ST PERSON'))
await page.evaluate(s=>window.__sunny.teleport(s[0],s[1]-0.4,s[2]),wallStart)
await sleep(500);await hold('KeyW',900)
check('walking always collides with the same partition wall',(await state()).pos[0]<bulkhead.min.x-0.3)

console.log('\n=== ACTUAL STAIR CLIMBS ===')
for(const flight of stairFlights(loadColliders('public/models/sunny.glb'))) {
  const climb=await walkFlight(page,flight)
  check(`${flight.name} approach stays on its landing`,climb.stable)
  check(`${flight.name} can be climbed with walking controls`,climb.climbed,
    `feet=${climb.result.pos.map(v=>v.toFixed(2))}, blocker=${climb.result.blocker}`)
}

console.log('\n=== COMPLETE DECK JOURNEYS ===')
const visualMeshes=loadColliders('public/models/sunny.glb')
for(const kind of ['helm','garden'])for(const side of ['port','starboard']) {
  const trace=await walkJourney(page,visualMeshes,kind,side)
  console.log(JSON.stringify({route:`${side} to ${kind}`,trace}))
  check(`spawn to ${kind} via ${side}: approaches, transfers and exit`,
    trace.length>=6&&trace.every(t=>t.ok)&&trace.at(-1).grounded)
}

console.log('\n=== DRY STRUCTURAL DECK ===')
// Approach the real dock/workshop doorway. The old (-6, centreline) start
// was inside the occupied Kurosai bay, so its straight walk tested a vehicle.
const lowerDoor=shipMeta.interiors.doors.find(d=>d.id==='B1_door1_0')
await page.evaluate(d=>{window.__sunny.teleport(d.pos[0]-2.5,d.pos[2]+.03,-d.pos[1]);window.__sunny.look(-Math.PI/2,-.05)},lowerDoor)
await sleep(700)
const shellStart=await state()
check('lower interior floor supports the player',shellStart.grounded && Math.abs(shellStart.pos[1]-shipMeta.interiors.levels.B1)<0.15)
await hold('KeyW',2200)
const shellEnd=await state()
check('open partition doorway connects the lower compartments',shellEnd.pos[0]-shellStart.pos[0]>5 && shellEnd.grounded)
check('lower-compartment walk crosses the actual door station',shellEnd.pos[0]>lowerDoor.pos[0]+1)
await page.screenshot({path:`${OUT}/g7-dry-interior-shell.png`})
const ocean=await page.evaluate(()=>{
  const o=window.__sunnyOcean,p=o.mesh.geometry.parameters,u=o.material.uniforms
  const b=document.querySelector('canvas').getBoundingClientRect()
  return {width:p.width,height:p.height,segments:p.widthSegments,count:u.uHullCount.value,
    profile:u.uHullProfile.value.map(v=>v.toArray()),cutout:o.material.fragmentShader.includes('discard'),
    horizonTriangles:o.horizon.geometry.index.count/3,
    horizonWidth:Math.max(...o.horizon.geometry.attributes.position.array.filter((_,i)=>i%3===0))-Math.min(...o.horizon.geometry.attributes.position.array.filter((_,i)=>i%3===0)),
    fullWindow:Math.abs(b.width-innerWidth)<2&&Math.abs(b.height-innerHeight)<2}
})
check('full-window preview restored',ocean.fullWindow)
check('ocean is a bounded mesh with reduced tessellation',ocean.width===OCEAN_SIZE_M&&ocean.height===OCEAN_SIZE_M&&ocean.segments===OCEAN_SEGMENTS)
check('sea extends to the horizon with only eight extra triangles',ocean.horizonTriangles===8&&ocean.horizonWidth===1800)
check('ocean shader excludes the measured hull interior',ocean.count===32&&ocean.cutout&&ocean.profile.some(v=>Math.abs(v[0])<1&&v[1]<-0.7605&&v[2]>-0.7605))
check('structural floor stays above every wave crest',shipMeta.interiors.levels.B1>waterLevel+0.7)

console.log('\n=== RENDERING ===')
const render = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const gl = c.getContext('webgl2') || c.getContext('webgl')
  return { w: c.width, h: c.height, ok: !!gl }
})
check('canvas is rendering', render.ok && render.w > 0, `${render.w}x${render.h}`)

// frame timing over 2s
const fps = await page.evaluate(() => new Promise((resolve) => {
  let n = 0
  const t0 = performance.now()
  const tick = () => {
    n++
    if (performance.now() - t0 < 2000) requestAnimationFrame(tick)
    else resolve(Math.round((n / (performance.now() - t0)) * 1000))
  }
  requestAnimationFrame(tick)
}))
check('renders at an interactive frame rate', fps >= 30, `${fps} fps (headless software/ANGLE)`)

console.log('\n=== ERRORS ===')
check('no runtime errors', errors.length === 0, errors.slice(0, 5).join(' | '))

await browser.close()
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
process.exit(fail ? 1 : 0)
