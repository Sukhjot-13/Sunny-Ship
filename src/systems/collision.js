import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { sweepFlight } from './flightCollision.js'
import { stepSupport } from './stepSupport.js'
import { CONTACT_GAP } from './doors.js'

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

/**
 * One built world per collision GLB scene. Cached so repeated `useCollision()`
 * calls share the same box arrays instead of re-traversing the proxy.
 */
const worldCache = new WeakMap()

function buildWorld(scene) {
  const cached = worldCache.get(scene)
  if (cached) return cached

  const boxes = []
  const floors = []

  scene.traverse((child) => {
    if (!child.isMesh) return
    child.geometry.computeBoundingBox()
    const bb = child.geometry.boundingBox.clone()
    bb.applyMatrix4(child.matrixWorld)

    const box = new THREE.Box3(bb.min, bb.max)
    const isFloor = child.name.startsWith('COLL_Floor')

    if (isFloor) floors.push(box)
    boxes.push({ box, isFloor, name: child.name })
  })

  const world = { boxes, floors, dynamic: dynamicEntries }
  worldCache.set(scene, world)
  return world
}

/**
 * Axis-separated capsule-vs-one-list resolution. Shared by `resolve` for the
 * static boxes and the dynamic layer; keeps the push-out maths in one place.
 */
export function resolveList(list, p, v, playerMin, playerMax, radius, height) {
  let blocker = null
  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const box = item.box
    // Keep walking contact outside the moving door's existing safety band.
    // Body dimensions and the physical published leaf bounds stay unchanged.
    const gap = item.name?.startsWith('DOOR_') ? CONTACT_GAP + .001 : 0
    const minX=box.min.x-gap,maxX=box.max.x+gap,minZ=box.min.z-gap,maxZ=box.max.z+gap
    // broad phase. The vertical test is inset by EPS so that resting exactly
    // on a floor's top face is not treated as a side collision.
    if (
      playerMax.x < minX || playerMin.x > maxX ||
      playerMax.y < box.min.y - EPS || playerMin.y > box.max.y - EPS ||
      playerMax.z < minZ || playerMin.z > maxZ
    ) continue

    // --- horizontal resolution: push out on the shallower axis
    const overlapX = Math.min(playerMax.x - minX, maxX - playerMin.x)
    const overlapZ = Math.min(playerMax.z - minZ, maxZ - playerMin.z)

    if (overlapX < overlapZ) {
      if (p.x < (box.min.x + box.max.x) / 2) p.x -= overlapX
      else p.x += overlapX
      v.x = 0
    } else {
      if (p.z < (box.min.z + box.max.z) / 2) p.z -= overlapZ
      else p.z += overlapZ
      v.z = 0
    }
    blocker = item.name

    // refresh the broad-phase bounds after the push
    playerMin.set(p.x - radius, p.y, p.z - radius)
    playerMax.set(p.x + radius, p.y + height, p.z + radius)
  }
  return blocker
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
  const { scene } = useGLTF('/models/sunny-collision.glb')

  const world = useMemo(() => buildWorld(scene), [scene])

  // ---- queries -------------------------------------------------------
  // Static floors and moving hatch lids share ground queries. An open lid
  // supports only its parked footprint, leaving the shaft clear.
  const raycastDown = (origin, maxDist = 200, radius = 0) => {
    // sample the box tops in the vertical column below `origin`
    let bestY = -Infinity
    for (const { box, isFloor } of flightBoxes(world)) {
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

    let blocker = resolveList(world.boxes, p, v, playerMin, playerMax, radius, height)
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
  const hasCeiling = (position, radius, fromY, height) =>
    ceilingIn(world.boxes, position, radius, fromY, height) ||
    ceilingIn(dynamicEntries, position, radius, fromY, height)

  /** True if the player's box overlaps any solid (static or dynamic). */
  const isBlocked = (position, radius, height) => {
    const min = new THREE.Vector3(position.x - radius, position.y + EPS, position.z - radius)
    const max = new THREE.Vector3(position.x + radius, position.y + height, position.z + radius)
    return blockedIn(world.boxes, min, max) || blockedIn(dynamicEntries, min, max)
  }

  const stepHeightAt = (position, radius, maxRise) =>
    stepSupport(flightBoxes(world), position, radius, maxRise)

  const moveFlight = (position, velocity, dt, radius, height) =>
    sweepFlight(flightBoxes(world), position, velocity, dt, radius, height)

  return { world, setDynamic, clearDynamic, moveFlight, raycastDown, stepHeightAt, resolve, hasCeiling, isBlocked }
}

/**
 * The box list flight collision sweeps, statics followed by dynamics.
 *
 * sweepFlight() integrates the whole step, so it must be called ONCE per frame
 * with every solid in a single list - running it twice (once per layer) would
 * integrate the same dt twice and silently double the flight speed.
 *
 * The list holds references to the same pooled Box3 objects that setDynamic
 * mutates, so it only has to be rebuilt when the static world identity or the
 * dynamic count changes: per-frame geometry edits are picked up for free.
 */
const flightList = []
const flightKey = { world: null, count: -1 }

function flightBoxes(world) {
  if (flightKey.world === world && flightKey.count === dynamicEntries.length) return flightList
  flightKey.world = world
  flightKey.count = dynamicEntries.length
  flightList.length = 0
  for (let i = 0; i < world.boxes.length; i++) flightList.push(world.boxes[i])
  for (let i = 0; i < dynamicEntries.length; i++) flightList.push(dynamicEntries[i])
  return flightList
}

useGLTF.preload('/models/sunny-collision.glb')
