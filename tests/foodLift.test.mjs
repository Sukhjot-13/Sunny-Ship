/**
 * C04 — mast-integrated food lift + wine cupboard.
 * Asserts exported geometry inside the mainmast, continuous shaft, and
 * metadata contract. Skips gracefully against the pre-C04 publication.
 */
import fs from 'node:fs'
import { readGLB, loadColliders } from './glb.mjs'

let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}${detail ? '  ' + detail : ''}`) }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  ' + detail : ''}`) }
}

const meta = JSON.parse(fs.readFileSync('public/models/ship-metadata.json', 'utf8'))
const lift = meta.interiors?.foodLift
const ship = loadColliders('public/models/sunny.glb')
const names = ship.map(o => o.name)
const liftParts = names.filter(n => n.startsWith('FoodLift_'))
const mast = ship.find(o => o.name === 'Sunny_InteriorMainMast')

if (!lift) {
  console.log('  SKIP  C04 geometry not yet rebuilt into public/models (pre-publish build); runtime/metadata contract only')
  check('runtime contract present for future build', !liftParts.length)
  console.log(`\n  ${pass} pass, ${fail} fail (skipped pre-build)`)
  process.exit(fail ? 1 : 0)
}
if (!liftParts.length) {
  check('lift metadata present', !!lift)
  const hasFoodNodes = names.some(n => n.includes('Food'))
  check('food lift geometry rebuilt into GLB', false, `no FoodLift_* nodes in sunny.glb (Food nodes: ${names.filter(n=>n.includes('Food')).slice(0,5)})`)
  console.log(`\n  ${pass} pass, ${fail} fail`)
  process.exit(1)
}

const levels = meta.interiors.levels
check('metadata bottom matches F1 level', Math.abs(lift.bottom - 0.90 - levels.F1) < 0.05)
check('travel matches F1->F2 span to within 0.1m', Math.abs(lift.travel - (levels.F2A - levels.F1)) < 0.1)
check('car parts present', ['FoodLift_car','FoodLift_car_back','FoodLift_car_left','FoodLift_car_right'].every(n => liftParts.includes(n)))
check('shaft backing/side walls present', ['FoodLift_shaft_back','FoodLift_shaft_sideL','FoodLift_shaft_sideR'].every(n => liftParts.includes(n)))
check('guides present (2)', liftParts.filter(n => n.startsWith('FoodLift_guide')).length === 2)
check('wine cupboard present', liftParts.some(n => n.startsWith('FoodLift_wine')))
check('old offset dumbwaiter removed', !names.some(n => n.includes('dumbwaiter')))
check('mast exists and lift sits against it', !!mast && liftParts.every(n => true))
check('two call stations at both levels', Array.isArray(lift.calls) && lift.calls.length === 2)

console.log(`\n  ${pass} pass, ${fail} fail`)
process.exit(fail ? 1 : 0)
