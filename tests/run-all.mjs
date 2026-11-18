/**
 * Single test entry point - runs every suite and reports one result.
 *
 *   npm test
 *
 * Serial suites: pure navigation/climbing, physical interior/exterior materials, exported geometry/collision,
 * all room routes, real exterior/interior/controls journeys, interaction,
 * motion comparisons and visual capture. The suites array is authoritative.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')

// ensure the dev server is up for the browser suites
async function ensureServer() {
  try {
    const r = await fetch('http://localhost:5173/', { signal: AbortSignal.timeout(2000) })
    if (r.ok) return true
  } catch {}
  console.log('  starting dev server...')
  const child = spawn('npm', ['run', 'dev'], {
    cwd: root, detached: true, stdio: 'ignore',
  })
  child.unref()
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500))
    try {
      const res = await fetch('http://localhost:5173/', { signal: AbortSignal.timeout(1500) })
      if (res.ok) return true
    } catch {}
  }
  return false
}

const run = (file, label) =>
  new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}\n  ${label}\n${'='.repeat(60)}`)
    const p = spawn(process.execPath, [path.join(here, file)], {
      cwd: root, stdio: 'inherit',
    })
    p.on('close', (code) => resolve({ label, code: code ?? 1 }))
  })

// assets must exist
const models = ['sunny.glb', 'sunny-collision.glb', 'ship-metadata.json']
let missing = models.filter((m) => !fs.existsSync(path.join(root, 'public/models', m)))
if (missing.length) {
  console.error(`Missing assets: ${missing.join(', ')}\nRun: npm run assets`)
  process.exit(1)
}

const serverUp = await ensureServer()
if (!serverUp) {
  console.error('Could not start the dev server on :5173')
  process.exit(1)
}

const suites=[
 ['collisionData.test.mjs','exact plain collision decoding'],
 ['collisionIndex.test.mjs','conservative indexed body, step and flight equivalence'],
 ['innerGateCollision.test.mjs','actual inner shutter coverage and clear waiting-room passage'],
 ['foreShroudFixture.test.mjs','outboard longitudinal fore fans and physical rope junctions'],
 ['foreGalleryFixture.test.mjs','dense gallery balusters and retained native supports'],
 ['foreGalleryReference.test.mjs','actual full-height gallery/source rhythm and frozen native support'],
 ['balustradeFixture.test.mjs','closed supported fore path balustrades and real upper stair gap'],
 ['foreTopGuardReference.test.mjs','actual supported fore rim and all six complete stair guards'],
 ['aftFacadeFixture.test.mjs','R13 source facade authoring fixture'],
 ['aftFacadeReference.test.mjs','R13 actual central entry and front aperture topology'],
 ['foreFacadeFixture.test.mjs','R09 fore entry, round ports and native frontage authoring'],
 ['foreFacadeReference.test.mjs','R09 actual fore topology and full body passages'],
 ['gardenPlanterFixture.test.mjs','R15 open planting shells and curved blade UV authoring'],
 ['shadeTreeFixture.test.mjs','rooted lawn trunks and physically attached rounded foliage'],
 ['lawnCrownReference.test.mjs','actual deep lawn crowns with exact unrelated geometry and physics preservation'],
 ['gardenReference.test.mjs','actual inboard planting, soil, approaches and mikan crowns'],
 ['floorCollision.test.mjs','actual rectangular gallery floor support'],
 ['roundAccessCollision.test.mjs','circular shaft physical floor clearance'],
 ['roundHatchFixture.test.mjs','R14 round lawn hatch authoring fixture'],
 ['referenceDockAccess.test.mjs','R04/R14 continuous lawn and single round Dock access'],
 ['dockChannelProfile.test.mjs','below-deck crown and rounded mouth design'],
 ['dockRoundTransition.test.mjs','actual rounded outlets and outboard mouth flare'],
 ['referenceScale.test.mjs','matching reversible reference-scale artifacts'],
 ['spatialBoxes.test.mjs','conservative reachability broad phase'],
 ['referenceExterior.test.mjs','reference exterior profile and moving glazed doors'],
 ['dockPlanCut.test.mjs','C03 convex floor-cut authoring fixture'],
 ['dockWaterConstruction.test.mjs','C03 water, bed and retained-mouth geometry'],
 ['dockRotatingClearance.test.mjs','C03 actual rotating chamber clearance'],
 ['dockAlignment.test.mjs','C03 selected bay alignment'],
 ['dockOutletShell.test.mjs','C02 complete local mouth shell and body clearance'],
 ['dockApertures.test.mjs','C02 actual paired dock lining apertures'],
 ['foreTrim.test.mjs','C01 actual exported fore trim clearance'],
 ['foreStorage.test.mjs','C01 real storage enclosure and physical join'],
 ['foreExterior.test.mjs','C01 original bow exterior preservation'],
 ['interiorMaterials.test.mjs','physical interior materials and metric projection'],
 ['aquariumRoom.test.mjs','Aquarium tank, furnishings and preserved route interfaces'],
 ['libraryRoom.test.mjs','Library furnishings, clear glazing and full Bath ladder'],
 ['bathRoom.test.mjs','Bath fixtures, material regions and contained water'],
 ['exteriorMaterials.test.mjs','physical exterior materials and reflection guards'],
 ['navigation.test.mjs','navigation logic'],['foodLift.test.mjs','C04 mast-integrated food lift'],['climbing.test.mjs','climbing and interaction logic'],['assets.test.mjs','asset structure'],['exterior.test.mjs','exterior coplanar geometry'],['doors.test.mjs','door and hatch collision'],
 ['physics.test.mjs','collision physics'],['reachability.mjs','deck reachability'],
 ['roomRoutes.mjs','all room and interior stair routes'],['gameplay.mjs','in-browser gameplay'],
 ['cannonControls.mjs','universal visible cannon controls'],
 ['exteriorJourneys.mjs','continuous balcony, gallery, slide and exterior passages'],
 ['exteriorAccess.mjs','outdoor thresholds, exterior hatch descents and returns'],
 ['foreFacadeJourneys.mjs','both actual lower fore thresholds and grounded lawn returns'],
 ['climbing.mjs','continuous lookout rope, ladder, hatch and return descent'],
 ['interiorJourneys.mjs','continuous room tour and interior stairs'],
 ['bathJourneys.mjs','continuous Bath, washroom and toilet journey via the Library ladder'],
 ['navigation.mjs','walking to ship controls and operating navigation'],['interaction.mjs','pointer / orbit interaction'],['exteriorMotion.mjs','exterior movement and stationary comparison'],['visual.mjs','visual capture'],
]
const results=[]
for(let i=0;i<suites.length;i++)results.push(await run(suites[i][0],`${i+1}/${suites.length}  ${suites[i][1]}`))

console.log(`\n${'='.repeat(60)}\n  SUMMARY\n${'='.repeat(60)}`)
let failed = 0
for (const r of results) {
  if (r.code !== 0) failed++
  console.log(`  ${r.code === 0 ? 'PASS' : 'FAIL'}  ${r.label}`)
}
console.log(`\n  screenshots: ${path.join(root, 'tests/screenshots')}`)
process.exit(failed ? 1 : 0)
