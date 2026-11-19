import * as THREE from 'three'
import { sweepFlight } from './flightCollision.js'
import { stepSupport } from './stepSupport.js'
import { CONTACT_GAP } from './doors.js'
import {COLLISION_PROXY_URL,readCollisionWorld,preloadCollisionWorld} from './collisionWorld.js'
import {resolveList} from './bodyCollision.js'
export {resolveList} from './bodyCollision.js'

/**
 * Static collision world for the ship.
 *
 * Deliberately NOT the visual mesh. The pipeline (tools/build_assets.py)
 * raycasts the ship and builds a small set of simple meshes:
 *   - heightfield floor slabs for every walkable deck region (with risers
 *     between levels and a solid skirt underneath, so you cannot fall through)
 *   - invisible boundary walls around each region edge, so you cannot walk off
 *   - a hull box so leaving the deck lands you on the ship, not in the sea
 *   - box colliders for masts, cabins, railings and other obstacles
 *
 * Exposed as a plain array of Box3 (OBB-free: all colliders are axis aligned)
 * plus a `raycastDown` helper for ground detection. Physics is resolved
 * manually in the controller - this is far lighter than a full physics engine
 * for a first-person walker and gives exact control over step-up/jump feel.
 *
 * On top of the static proxy there is a small dynamic layer (`world.dynamic`,
 * filled by `setDynamic`) for solids that move: door leaves and hatch lids.
 * Every query that treats solids as solid resolves against both layers;
 * Ground queries include static floors and the current dynamic hatch lids.
 * Vertical door leaves remain ordinary solids.
 */
/**
 * Contact epsilon. The player's feet rest exactly on a floor's top face, and a
 * strict inequality would read that exact touch as a horizontal overlap and
 * shove the player sideways every frame. This margin treats "resting on" as
 * "not penetrating".
 */
const EPS = 0.02

/**
 * Dynamic collider layer (door leaves, hatch lids, ...).
 *
 * These cannot live in the static proxy: a closed leaf has to be solid and an
 * open leaf has to be gone, which changes every frame. They are kept at module
 * scope - not per hook instance - so `useCollision()` may be called from more
 * than one component (PlayerController today, anything else tomorrow) without
 * each call seeing a different set. `setDynamic` is therefore safe to call from
 * a component that does not hold the collision object itself.
 *
 * Entries are `{ box: THREE.Box3, isFloor: false, name }`, matching the static
 * shape. Door leaves use `isFloor: false`; hatch lids use `isFloor: true`,
 * so they support walking only at their current moving footprint.
 */
const dynamicPool = []
const dynamicEntries = []
const dynamicSources = new Map()

/**
 * Replace the dynamic collider set. Call once per frame with plain data so the
 * caller never allocates a Box3 itself:
 *
 *   setDynamic([{ min: [x, y, z], max: [x, y, z], name: 'DOOR_ForeDoor' }])
 *
 * The Box3 instances and entry objects are pooled and reused; entries with a
 * non-finite bound are dropped rather than poisoning the world with NaN.
 * The array is mutated in place, so holders of `world.dynamic` stay valid.
 */
export function setDynamic(entries, source = 'doors') {
  if (entries?.length) dynamicSources.set(source, entries)
  else dynamicSources.delete(source)
  const all = Array.from(dynamicSources.values()).flat()
  const n = all.length
  let w = 0
  for (let i = 0; i < n; i++) {
    const src = all[i]
    if (!src) continue
    const smin = src.min
    const smax = src.max
    if (!smin || !smax) continue
    const x0 = smin.x !== undefined ? smin.x : smin[0]
    const y0 = smin.y !== undefined ? smin.y : smin[1]
    const z0 = smin.z !== undefined ? smin.z : smin[2]
    const x1 = smax.x !== undefined ? smax.x : smax[0]
    const y1 = smax.y !== undefined ? smax.y : smax[1]
    const z1 = smax.z !== undefined ? smax.z : smax[2]
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(z0) ||
        !Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1)) continue
    let entry = dynamicPool[w]
    if (!entry) {
      entry = { box: new THREE.Box3(), isFloor: false, name: '' }
      dynamicPool[w] = entry
    }
    entry.box.min.set(x0, y0, z0)
    entry.box.max.set(x1, y1, z1)
    entry.isFloor = src.isFloor === true
    entry.name = src.name ?? ''
    dynamicEntries[w] = entry
    w++
  }
  dynamicEntries.length = w
  return dynamicEntries
}

/** Drop every dynamic collider (leaves frozen open would otherwise block). */
export function clearDynamic() {
  dynamicSources.clear()
  return setDynamic(null)
}

/** Solid test for `hasCeiling`, over one list. */
function ceilingIn(list, position, radius, fromY, height) {
  for (let i = 0; i < list.length; i++) {
    const box = list[i].box
    if (
      position.x + radius < box.min.x || position.x - radius > box.max.x ||
      position.z + radius < box.min.z || position.z - radius > box.max.z
    ) continue
    if (box.min.y >= fromY && box.min.y <= fromY + height) return true
  }
  return false
}

/** Solid overlap test for `isBlocked`, over one list. */
function blockedIn(list, min, max) {
  for (let i = 0; i < list.length; i++) {
    const item = list[i], box = item.box
    const gap = item.name?.startsWith('DOOR_') ? CONTACT_GAP + .001 : 0
    if (
      min.x < box.max.x+gap && max.x > box.min.x-gap &&
      min.y < box.max.y && max.y > box.min.y &&
      min.z < box.max.z+gap && max.z > box.min.z-gap
    ) return true
  }
  return false
}

export function useCollision() {
  const world=readCollisionWorld(COLLISION_PROXY_URL)
  world.dynamic=dynamicEntries

  // ---- queries -------------------------------------------------------
  // Static floors and moving hatch lids share ground queries. An open lid
  // supports only its parked footprint, leaving the shaft clear.
  const raycastDown = (origin, maxDist = 200, radius = 0) => {
    // sample the box tops in the vertical column below `origin`
    let bestY = -Infinity
    const low=new THREE.Vector3(origin.x-radius,origin.y-maxDist,origin.z-radius)
    const high=new THREE.Vector3(origin.x+radius,origin.y+.6,origin.z+radius)
    for (const { box, isFloor } of [...world.floorIndex.query(low,high),...dynamicEntries]) {
      if (!isFloor) continue
      if (
        origin.x + radius >= box.min.x && origin.x - radius <= box.max.x &&
        origin.z + radius >= box.min.z && origin.z - radius <= box.max.z
      ) {
        if (box.max.y <= origin.y + 0.6 && box.max.y > bestY) {
          bestY = box.max.y
        }
      }
    }
    if (bestY === -Infinity) return null
    const dist = origin.y - bestY
    if (dist > maxDist) return null
    return { y: bestY, distance: dist }
  }

  /**
   * Resolve a capsule (approximated as an axis-aligned box) against the world.
   * Axis-separated resolution so sliding along walls feels clean.
   */
  const resolve = (position, velocity, radius, height) => {
    const p = position.clone()
    const v = velocity.clone()

    const playerMin = new THREE.Vector3(p.x - radius, p.y, p.z - radius)
    const playerMax = new THREE.Vector3(p.x + radius, p.y + height, p.z + radius)

    let blocker = resolveList(world.boxes, p, v, playerMin, playerMax, radius, height, world.index)
    if (dynamicEntries.length) {
      // a leaf that has moved under the player resolves last, so it can never
      // be overridden into a position that re-overlaps the capsule
      const dyn = resolveList(dynamicEntries, p, v, playerMin, playerMax, radius, height)
      if (dyn) blocker = dyn
    }

    return { position: p, velocity: v, blocker }
  }

  /**
   * Ceiling check: is there solid ground above `y` within `height`?
   * Stops the player jumping through a deck above them.
   */
  const hasCeiling = (position, radius, fromY, height) => {
    const low=new THREE.Vector3(position.x-radius,fromY,position.z-radius)
    const high=new THREE.Vector3(position.x+radius,fromY+height,position.z+radius)
    return ceilingIn(world.index.query(low,high), position, radius, fromY, height) ||
      ceilingIn(dynamicEntries, position, radius, fromY, height)
  }

  /** True if the player's box overlaps any solid (static or dynamic). */
  const isBlocked = (position, radius, height) => {
    const min = new THREE.Vector3(position.x - radius, position.y + EPS, position.z - radius)
    const max = new THREE.Vector3(position.x + radius, position.y + height, position.z + radius)
    return blockedIn(world.index.query(min,max), min, max) || blockedIn(dynamicEntries, min, max)
  }

  const stepHeightAt = (position, radius, maxRise) => {
    const low=new THREE.Vector3(position.x-radius,position.y+.01,position.z-radius)
    const high=new THREE.Vector3(position.x+radius,position.y+maxRise,position.z+radius)
    return stepSupport([...world.floorIndex.query(low,high),...dynamicEntries],position,radius,maxRise)
  }

  const moveFlight = (position, velocity, dt, radius, height) => {
    // Every axis-clamped pose stays inside this complete swept envelope.
    // One sweep still integrates dt once against statics followed by dynamics.
    const end=position.clone().addScaledVector(velocity,dt)
    const low=new THREE.Vector3(Math.min(position.x,end.x)-radius,Math.min(position.y,end.y),Math.min(position.z,end.z)-radius)
    const high=new THREE.Vector3(Math.max(position.x,end.x)+radius,Math.max(position.y,end.y)+height,Math.max(position.z,end.z)+radius)
    return sweepFlight([...world.index.query(low,high),...dynamicEntries],position,velocity,dt,radius,height)
  }

  return { world, setDynamic, clearDynamic, moveFlight, raycastDown, stepHeightAt, resolve, hasCeiling, isBlocked }
}

if(typeof window!=='undefined')preloadCollisionWorld(COLLISION_PROXY_URL)
