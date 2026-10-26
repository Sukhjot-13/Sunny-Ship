import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createDoorSystem, doorMotion } from '../systems/doors.js'
import { setDynamic } from '../systems/collision.js'
import { useShipMeta } from '../systems/shipMeta.js'
import { onInteract } from '../hooks/useInput.js'
import { useStore } from '../state/useStore.js'
import { CAMERA_MODES } from '../config/shipConfig.js'

/**
 * Runtime doors and hatches.
 *
 * Owns nothing but the animation: the state machine lives in
 * `src/systems/doors.js` (pure, no three.js), the collision lives in
 * `src/systems/collision.js`, and the meshes belong to the scene.
 *
 * Ship registers the cloned moving nodes; App mounts this once inside Canvas.
 * Updates before the player in every camera/movement mode, so flight observes
 * the same leaves. Hatch lids support walking at their current footprint.
 * Collider/state arrays and transform scratch storage are reused each frame.
 */

/** node name -> live Object3D, filled by Ship.jsx. */
const doorNodes = new Map()
/** node name -> rest transform, captured at registration. */
const doorRest = new Map()
/** node names we have already complained about, so the console stays readable. */
const missingNodes = new Set()

const UP = new THREE.Vector3(0, 1, 0)
const scratchQuat = new THREE.Quaternion()
const scratchAxis = new THREE.Vector3()
const scratchMotion = [0, 0, 0, 0]

/**
 * Register a moving leaf/lid. Call this from Ship.jsx with the cloned object
 * whose name matches the door metadata's `node`.
 *
 * @param {string} name node name from the metadata
 * @param {import('three').Object3D} object3d the leaf / lid (or a group holding it)
 * @returns {() => void} unregister
 */
export function registerDoorNode(name, object3d) {
  if (!name || !object3d) return () => {}
  doorNodes.set(name, object3d)
  doorRest.set(name, { x: object3d.position.x, y: object3d.position.y, z: object3d.position.z, quat: object3d.quaternion.clone() })
  missingNodes.delete(name)
  return () => {
    if (doorNodes.get(name) === object3d) {
      doorNodes.delete(name)
      doorRest.delete(name)
    }
  }
}

/** Registered object for a node name, or undefined. */
export function getDoorNode(name) {
  return doorNodes.get(name)
}

export function DoorSystem({ meta: metaProp, doors: doorsProp } = {}) {
  const ownMeta = useShipMeta()
  const meta = metaProp ?? ownMeta

  // Convert once: the metadata is Blender Z-up and never changes at runtime.
  const rawDoors = useMemo(() => {
    const list = doorsProp ?? meta?.interiors?.doors ?? []
    return Array.isArray(list) ? list : []
  }, [doorsProp, meta])

  const system = useMemo(() => createDoorSystem(rawDoors), [rawDoors])
  const systemRef = useRef(system)
  useEffect(() => { systemRef.current = system }, [system])

  const nearRef = useRef(null)
  const openRef = useRef(-1)

  // `E` on foot is a one-shot: toggle the nearest hatch, nothing else.
  useEffect(() => onInteract(() => {
    const s = useStore.getState()
    if (s.cameraMode !== CAMERA_MODES.EXPLORE || s.flying) return
    systemRef.current.interactNearest(s.position)
  }), [])

  // debug hook (verification scripts and the browser console)
  useEffect(() => {
    window.__sunnyDoors = {
      get state() { return systemRef.current.getState() },
      get colliders() { return systemRef.current.getColliders() },
      get doors() { return systemRef.current.doors },
      get near() { return systemRef.current.nearestInteraction(window.__sunny?.position) },
      toggle: (id) => systemRef.current.toggleHatch(id),
      registered: () => Array.from(doorNodes.keys()),
    }
    return () => { delete window.__sunnyDoors }
  }, [])

  useEffect(() => () => { setDynamic(null) }, [])

  useFrame((_, delta) => {
    const store = useStore.getState()
    const exploring = store.cameraMode === CAMERA_MODES.EXPLORE
    const player = exploring ? (window.__sunny?.position ?? store.position) : null
    const out = systemRef.current.update(Math.min(delta, 0.1), player)

    // --- push the leaves to the collision world ---
    setDynamic(out.colliders)

    // --- drive the visible leaves ---
    for (const door of systemRef.current.doors) {
      const object = doorNodes.get(door.node)
      if (!object) {
        if (import.meta.env?.DEV && door.node && !missingNodes.has(door.node)) {
          missingNodes.add(door.node)
          console.warn('[doors] no registered node for', door.node, '- collider still animates')
        }
        continue
      }
      const rest = doorRest.get(door.node)
      if (!rest) continue
      const t = door.state.openness
      const motion = doorMotion(door,t,scratchMotion)
      object.position.set(rest.x+motion[0],rest.y+motion[1],rest.z+motion[2])
      if (door.mode !== 'slide') {
        const axis = door.mode==='lift' ? scratchAxis.fromArray(door.ey) : UP
        scratchQuat.setFromAxisAngle(axis,motion[3])
        object.quaternion.copy(rest.quat).premultiply(scratchQuat)
      }
    }

    // --- HUD summary, only when it actually changes ---
    const near = out.near
    const prev = nearRef.current
    if (near?.id !== prev?.id || near?.open !== prev?.open) {
      nearRef.current = near ? { ...near } : null
      store.setNearInteraction(near ? { ...near } : null)
    }
    if (out.openCount !== openRef.current) {
      openRef.current = out.openCount
      store.setOpenDoorCount(out.openCount)
    }
  }, -1)

  return null
}
