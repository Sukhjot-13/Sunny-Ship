import { useEffect, useMemo, useRef } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { resolveMaterial, authoredMaterial } from '../systems/materials.js'
import { exteriorMaterial } from '../systems/exteriorMaterials.js'
import { realisticExteriorMaterial,usesRealisticExterior } from '../systems/realisticExterior.js'
import { interiorGeometry,realisticInteriorMaterial,usesRealisticInterior } from '../systems/realisticInterior.js'
import { createInteriorLightRig } from '../systems/interiorLighting.js'
import { makeSailMaterial, updateWind } from '../systems/sails.js'
import { SHIP_COLORS } from '../config/shipConfig.js'
import { registerDoorNode } from './DoorSystem.jsx'
import { useStore } from '../state/useStore.js'
import { shipYaw, voyage } from '../systems/navigation.js'

/**
 * The Thousand Sunny.
 *
 * The GLB keeps one node per original FBX object, and the Blender pipeline
 * stamped each with a `sunny_part` semantic tag (mast / sail / rigging /
 * trim / hull_below / deck). That tag drives material selection, so
 * re-exporting the model does not break the app - no hardcoded names.
 *
 * Sails keep their original mesh and geometry; they only get an animated
 * ShaderMaterial that billows them in the vertex shader. (An earlier version
 * cloned the sail meshes and that mis-placed them, because several of the
 * FBX objects carry baked vertex offsets relative to their origin.)
 */
export function Ship({ sunDir, skyColor = '#9fc4e0', deckY = 0, waterY = -14, roomLights, ...props }) {
  const bobRef = useRef()
  const timeRef = useRef(0)
  const { scene } = useGLTF('/models/sunny.glb')
  const emblem = useTexture('/artwork/straw-hat-jolly-roger.svg')
  const interiorLights=useMemo(()=>createInteriorLightRig(roomLights),[roomLights])
  useEffect(()=>()=>interiorLights.dispose(),[interiorLights])

  // ---- assign materials, collect sails --------------------------------
  const ship = useMemo(() => {
    const root = scene.clone(true)
    const sails = []
    const interiorGeometries = []
    let sailCount = 0

    root.updateMatrixWorld(true)
    root.traverse((child) => {
      if (!child.isMesh) return
      const tags = child.userData?.sunny_part ? child.userData : child.parent?.userData ?? {}
      const part = tags.sunny_part ?? inferPart(child.name)

      if (part === 'sail' || part === 'flag') {
        const bounds = new THREE.Box3().setFromObject(child)
        const sailName = child.parent?.userData?.sunny_part ? child.parent.name : child.name
        const mat = makeSailMaterial({
          color: SHIP_COLORS.canvas,
          design: part === 'flag' ? 'pirate' : sailName.includes('008') ? 'stripes' : sailName.includes('004') ? 'hat' : 'plain',
          bounds,
          projection: sailName.includes('008') || part === 'flag' ? 'x' : 'z',
          authoredUV: !!tags.sunny_sail_uv,
          flag: part === 'flag',
          flagEdge: sailName.includes('010') ? 1 : 0,
          artwork: emblem,
          sunDir,
          skyColor,
        })
        // keep the authored geometry, swap the material
        child.material = mat
        sails.push({
          mat,
          // wind must be expressed in this mesh's LOCAL space
          invQuat: child.getWorldQuaternion(new THREE.Quaternion()).invert(),
        })
        sailCount++
      } else {
        const outside=usesRealisticExterior(tags,child.name)
        const inside=!outside&&usesRealisticInterior(tags,child.name)
        if(inside){
          child.geometry=interiorGeometry(child)
          interiorGeometries.push(child.geometry)
        }
        const finish=outside?realisticExteriorMaterial:exteriorMaterial
        const paint = m => inside
          ? realisticInteriorMaterial(m,{wood:tags.sunny_wood_kind,name:child.name,fabric:tags.sunny_fabric,uv:!!tags.sunny_uv_space})
          : tags.sunny_uv_space
          ? finish(m,{wood:tags.sunny_wood_kind,kind:tags.sunny_uv_kind,name:child.name,feature:tags.sunny_feature})
          : authoredMaterial(m,{solid:part==='mast'||part==='rigging',vertical:part==='mast'})
        child.material = tags.sunny_authored
          ? (Array.isArray(child.material) ? child.material.map(paint) : paint(child.material))
          : resolveMaterial(part, child.name, deckY, waterY)
      }
      child.castShadow = true
      child.receiveShadow = true
      child.frustumCulled = true
    })

    return { root, sails, sailCount, interiorGeometries }
  }, [scene, emblem, sunDir, skyColor, deckY, waterY])

  useEffect(() => {
    const unregister = []
    ship.root.traverse(node => {
      if (node.userData?.sunny_door || node.userData?.sunny_hatch) {
        unregister.push(registerDoorNode(node.name, node))
      }
    })
    return () => unregister.forEach(fn => fn())
  }, [ship])

  // ---- drive wind + ship bobbing --------------------------------------
  const localWind = useMemo(() => new THREE.Vector3(), [])
  const shipInverse = useMemo(() => new THREE.Matrix4(), [])

  useFrame((state, delta) => {
    timeRef.current += delta
    const wind = updateWind(timeRef.current)

    if (bobRef.current) {
      if (useStore.getState().cameraMode === 'explore') {
        bobRef.current.rotation.set(0, shipYaw(), voyage.pitch, 'YXZ')
        bobRef.current.position.y = voyage.lift
      } else {
        const t = timeRef.current
        bobRef.current.rotation.y = shipYaw()
        // gentle ship motion: slow roll, pitch and heave
        bobRef.current.rotation.z = Math.sin(t * 0.31) * 0.016 + Math.sin(t * 0.73) * 0.006
        bobRef.current.rotation.x = Math.sin(t * 0.24 + 1.2) * 0.012
        bobRef.current.position.y = Math.sin(t * 0.28) * 0.10 + Math.sin(t * 0.61) * 0.04
      }
      bobRef.current.updateWorldMatrix(true, false)
      shipInverse.copy(bobRef.current.matrixWorld).invert()
    }
    interiorLights.update(state.camera,delta)
    for (const { mat, invQuat } of ship.sails) {
      localWind.copy(wind.direction).transformDirection(shipInverse).applyQuaternion(invQuat).normalize()
      mat.uniforms.uTime.value = timeRef.current
      mat.uniforms.uWind.value = wind.strength
      mat.uniforms.uWindDir.value.copy(localWind)
      mat.uniforms.uShipInverse.value.copy(shipInverse)
      if (sunDir) mat.uniforms.uSunDir.value.copy(sunDir).normalize()
    }
  })

  useEffect(
    () => () => {
      for (const { mat } of ship.sails) mat.dispose()
      for (const geometry of ship.interiorGeometries) geometry.dispose()
    },
    [ship]
  )

  // expose for automated visual diagnostics
  useEffect(() => {
    window.__ship = ship.root
    return () => { delete window.__ship }
  }, [ship])

  return (
    <group ref={bobRef} {...props}>
      <primitive object={ship.root} />
      <primitive object={interiorLights.group} />
    </group>
  )
}

/** Fallback classifier if the pipeline's custom property is missing. */
function inferPart(name) {
  const n = (name || '').toLowerCase()
  if (n.startsWith('plane0') && /0[4-9]/.test(n)) return 'sail'
  if (n.includes('cylinder') || n.includes('tube')) return 'mast'
  if (n.startsWith('line') || n.includes('ngon')) return 'rigging'
  if (n.startsWith('sphere') || n.startsWith('circle')) return 'trim'
  return 'deck'
}

useGLTF.preload('/models/sunny.glb')
useTexture.preload('/artwork/straw-hat-jolly-roger.svg')
