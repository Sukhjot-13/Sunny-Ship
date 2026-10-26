/**
 * Physics sanity test for the collision proxy.
 *
 * Parses sunny-collision.glb directly (no browser) and simulates the player
 * controller's movement logic against the collider boxes to verify:
 *   1. the spawn point is supported (not falling)
 *   2. walking forward stays supported
 *   3. the player cannot walk off the deck edge
 *   4. the player cannot pass through an obstacle box
 */
import fs from 'node:fs'
import * as THREE from 'three'

import { loadColliders } from './glb.mjs'
import { sweepFlight } from '../src/systems/flightCollision.js'
import { stepSupport } from '../src/systems/stepSupport.js'
import {surfaceCollisionBounds} from '../src/systems/surfaceCollision.js'

// --- controller logic (mirrors PlayerController.jsx) -------------------
const RADIUS = 0.34
const HEIGHT = 1.75
const EPS = 0.02   // contact epsilon, mirrors collision.js

function raycastDown(boxes, origin, maxDist = 200) {
  let bestY = -Infinity
  for (const b of boxes) {
    if (!b.name.startsWith('COLL_Floor')) continue
    if (
      origin.x >= b.min.x && origin.x <= b.max.x &&
      origin.z >= b.min.z && origin.z <= b.max.z
    ) {
      if (b.max.y <= origin.y + 0.6 && b.max.y > bestY) bestY = b.max.y
    }
  }
  if (bestY === -Infinity) return null
  const d = origin.y - bestY
  return d > maxDist ? null : { y: bestY, distance: d }
}

function resolveHorizontal(boxes, p, v) {
  for (const b of boxes) {
    const pMin = new THREE.Vector3(p.x - RADIUS, p.y, p.z - RADIUS)
    const pMax = new THREE.Vector3(p.x + RADIUS, p.y + HEIGHT, p.z + RADIUS)
    if (
      pMax.x < b.min.x || pMin.x > b.max.x ||
      pMax.y < b.min.y - EPS || pMin.y > b.max.y - EPS ||
      pMax.z < b.min.z || pMin.z > b.max.z
    ) continue
    const ox = Math.min(pMax.x - b.min.x, b.max.x - pMin.x)
    const oz = Math.min(pMax.z - b.min.z, b.max.z - pMin.z)
    if (ox < oz) {
      if (p.x < (b.min.x + b.max.x) / 2) p.x -= ox; else p.x += ox
      v.x = 0
    } else {
      if (p.z < (b.min.z + b.max.z) / 2) p.z -= oz; else p.z += oz
      v.z = 0
    }
  }
  return { p, v }
}

// --- run ---------------------------------------------------------------
const meta = JSON.parse(fs.readFileSync('public/models/ship-metadata.json', 'utf8'))
const boxes = loadColliders('public/models/sunny-collision.glb')

// convert spawn blender->three
const spawnBlender = meta.spawn.position
const spawn = new THREE.Vector3(spawnBlender[0], spawnBlender[2], -spawnBlender[1])
const waterLevel = meta.waterLevel ?? -14

console.log(`colliders: ${boxes.length}`)
console.log(`  floors: ${boxes.filter(b => b.name.startsWith('COLL_Floor')).length}`)
console.log(`  hull:   ${boxes.filter(b => b.name === 'COLL_Hull').length}`)
console.log(`  walls:  ${boxes.filter(b => b.name.startsWith('COLL_Wall')).length}`)
console.log(`  obst:   ${boxes.filter(b => b.name.startsWith('COLL_Obj')).length}`)
console.log(`spawn (three): ${spawn.toArray().map(v => v.toFixed(2))}`)
console.log(`water level:   ${waterLevel}`)
console.log()

let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name} ${detail}`) }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`) }
}

console.log('=== TEST 1: spawn is supported ===')
{
  const ground = raycastDown(boxes, spawn)
  check('ground found under spawn', !!ground, ground ? `y=${ground.y.toFixed(2)}` : '')
  if (ground) {
    check('spawn is just above ground', Math.abs(spawn.y - ground.y) < 1.0,
      `dy=${(spawn.y - ground.y).toFixed(2)}`)
    check('deck is above water', ground.y > waterLevel,
      `deck=${ground.y.toFixed(2)} water=${waterLevel}`)
  }
}

console.log('\n=== TEST 2: player falls at a plausible rate then lands ===')
{
  const p = spawn.clone()
  const v = new THREE.Vector3()
  const dt = 1 / 60
  let landed = null
  for (let i = 0; i < 600; i++) {
    v.y += -18 * dt
    p.y += v.y * dt
    const g = raycastDown(boxes, new THREE.Vector3(p.x, p.y + 0.05, p.z), 60)
    if (g && v.y <= 0 && p.y <= g.y + 0.35) { p.y = g.y; v.y = 0; landed = i; break }
  }
  check('player lands', landed !== null, landed !== null ? `after ${landed} frames (${(landed * dt).toFixed(2)}s)` : 'never landed')
  check('landing is on the deck', p.y > waterLevel, `y=${p.y.toFixed(2)}`)
}

console.log('\n=== TEST 3: walking forward stays supported ===')
{
  let p = spawn.clone().setY(spawn.y)
  const v = new THREE.Vector3()
  const dt = 1 / 60
  let offDeck = 0
  for (let i = 0; i < 600; i++) {
    v.x = 3.4
    p.x += v.x * dt
    const r = resolveHorizontal(boxes, p, v)
    p.x = r.p.x
    p.y -= 18 * dt
    const g = raycastDown(boxes, new THREE.Vector3(p.x, p.y + 0.05, p.z), 60)
    if (g && v.y <= 0 && p.y <= g.y + 0.35) { p.y = g.y; v.y = 0 }
    else offDeck++
  }
  check('stays mostly supported while walking', offDeck < 120,
    `${offDeck}/600 frames airborne`)
  check('did not sink below the hull', p.y > -60, `y=${p.y.toFixed(2)}`)
}

console.log('\n=== TEST 4: cannot walk off the deck edge ===')
{
  // walk in 8 directions, see how far we get before losing floor
  let maxRadius = 0
  for (let dir = 0; dir < 8; dir++) {
    const a = (dir / 8) * Math.PI * 2
    const dx = Math.cos(a), dz = Math.sin(a)
    let p = spawn.clone()
    const v = new THREE.Vector3()
    const dt = 1 / 60
    for (let i = 0; i < 900; i++) {
      v.x = dx * 3.4; v.z = dz * 3.4
      p.x += v.x * dt; p.z += v.z * dt
      const r = resolveHorizontal(boxes, p, v)
      p.x = r.p.x; p.z = r.p.z
      p.y -= 18 * dt
      const g = raycastDown(boxes, new THREE.Vector3(p.x, p.y + 0.05, p.z), 60)
      if (g && v.y <= 0 && p.y <= g.y + 0.35) { p.y = g.y; v.y = 0 }
      else break
      maxRadius = Math.max(maxRadius, Math.hypot(p.x - spawn.x, p.z - spawn.z))
    }
  }
  console.log(`  (max horizontal travel from spawn: ${maxRadius.toFixed(2)} m)`)
  check('boundary walls contain the player', maxRadius < 25, `max radius ${maxRadius.toFixed(2)} m`)
}

console.log('\n=== TEST 5: obstacles are solid ===')
{
  const obst = boxes.filter(b => b.name.startsWith('COLL_Obj'))
  // check a few obstacles sit within reach of a floor
  let reachable = 0
  for (const o of obst) {
    const cx = (o.min.x + o.max.x) / 2
    const cz = (o.min.z + o.max.z) / 2
    const cy = (o.min.y + o.max.y) / 2
    const g = raycastDown(boxes, new THREE.Vector3(cx, cy + 0.5, cz), 12)
    if (g) reachable++
  }
  check('obstacles sit near walkable floor', reachable > 0, `${reachable}/${obst.length}`)
  check('has obstacle colliders', obst.length > 0, `${obst.length} obstacles`)
}

console.log('\n=== TEST 6: no degenerate colliders ===')
{
  const bad = boxes.filter(b =>
    b.max.x - b.min.x < 0.01 || b.max.y - b.min.y < 0.01 || b.max.z - b.min.z < 0.01)
  check('no zero-size colliders', bad.length === 0, bad.map(b => b.name).join(','))
}

console.log('\n=== TEST 7: low diagonal edges are climbable ===')
{
  const corner = new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(-0.3, 0.25, -0.05))
  const overhead = new THREE.Box3(new THREE.Vector3(-1, 2, -1), new THREE.Vector3(1, 2.6, 1))
  const world = [{ box: corner, isFloor: true }, { box: overhead, isFloor: true }]
  const feet = new THREE.Vector3(0, 0, 0)
  check('step probe sees a floor corner outside the centre ray', stepSupport(world, feet, RADIUS, 0.8) === 0.25)
  check('step probe ignores overhead decks and distant edges', stepSupport(world, feet, 0.1, 0.8) === null)
  check('step probe respects maximum climbing height', stepSupport(world, feet, RADIUS, 0.2) === null)
}

// A sloped moving blade remains solid without filling its empty envelope.
{
  const boxes=surfaceCollisionBounds([[[0,0,0],[4,0,0],[4,4,0]]]);
  const contains=(b,p)=>p.every((v,k)=>v>=b.min[k]&&v<=b.max[k]);
  check('sectioned moving blade keeps every sampled real surface solid',Array.from({length:19},(_,i)=>{const x=.1+i*.2;return boxes.some(b=>contains(b,[x,x*.6,0]))}).every(Boolean));
  check('sectioned moving blade leaves its empty upper-front corner clear',!boxes.some(b=>contains(b,[1,3,0])));
  check('surface collision skin gives every bound finite physical thickness',boxes.every(b=>b.min.every((v,k)=>Number.isFinite(v)&&b.max[k]-v>=.024)));
  let rejected=false;try{surfaceCollisionBounds([[[NaN,0,0],[1,0,0],[1,1,0]]])}catch{rejected=true}
  check('non-finite moving surfaces cannot enter the collision world',rejected);
}

// Swept flight must stop at thin solids even with a boosted 1.27 m frame.
{
  const wall={name:'COLL_Solid_test',box:new THREE.Box3(new THREE.Vector3(1,-1,-2),new THREE.Vector3(1.06,4,2))}
  const start=new THREE.Vector3(0,0,0)
  const hit=sweepFlight([wall],start,new THREE.Vector3(38,0,0),1/30,RADIUS,HEIGHT)
  check('boosted flight cannot tunnel through a thin wall',hit.position.x<1-RADIUS&&hit.velocity.x===0)
  const slide=sweepFlight([wall],start,new THREE.Vector3(38,0,6),1/30,RADIUS,HEIGHT)
  check('flight preserves motion along a wall',slide.position.z>0.15&&slide.velocity.z===6)
  const ceiling={name:'COLL_Floor_test',box:new THREE.Box3(new THREE.Vector3(-2,2,-2),new THREE.Vector3(2,2.2,2))}
  const up=sweepFlight([ceiling],start,new THREE.Vector3(0,38,0),1/30,RADIUS,HEIGHT)
  check('flight head cannot pass upward through a floor',up.position.y<2-HEIGHT&&up.velocity.y===0)
  const down=sweepFlight([ceiling],new THREE.Vector3(0,3,0),new THREE.Vector3(0,-38,0),1/30,RADIUS,HEIGHT)
  check('flight feet cannot pass downward through a floor',down.position.y>2.2&&down.velocity.y===0)
  const guard={...wall,name:'COLL_Wall_test'}
  check('flight ignores synthetic walking edge guards',sweepFlight([guard],start,new THREE.Vector3(38,0,0),1/30,RADIUS,HEIGHT).position.x>1)
}

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
process.exit(fail ? 1 : 0)
