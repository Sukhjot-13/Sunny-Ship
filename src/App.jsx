import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useProgress } from '@react-three/drei'

import { DoorSystem } from './components/DoorSystem.jsx'
import { NavigationSystem } from './components/NavigationSystem.jsx'
import { FoodLiftSystem } from './components/FoodLiftSystem.jsx'
import { CoupDeBurstEffects } from './components/CoupDeBurstEffects.jsx'
import { Ship } from './components/Ship.jsx'
import { PatrolFleet } from './components/PatrolFleet.jsx'
import { Archipelago } from './components/Archipelago.jsx'
import { Ocean } from './components/Ocean.jsx'
import { Lighting, SkyDome, InspectCamera, SUN_DIR, SKY_FILL_COLOR } from './components/Environment.jsx'
import { ProceduralEnvironment } from './components/EnvironmentMap.jsx'
import { PlayerController } from './components/PlayerController.jsx'
import { UI } from './components/UI.jsx'
import { useInput } from './hooks/useInput.js'
import { useShipMeta } from './systems/shipMeta.js'
import { useStore } from './state/useStore.js'
import { shipYaw } from './systems/navigation.js'
import { CAMERA_MODES } from './config/shipConfig.js'

/** Feed drei's loader progress into the store for the loading screen. */
function ProgressBridge() {
  const { progress, active } = useProgress()
  const setLoading = useStore((s) => s.setLoading)
  useEffect(() => {
    if (!active) setLoading(false, 1)
    else setLoading(true, progress / 100)
  }, [progress, active, setLoading])
  return null
}

/**
 * Camera control arbitration.
 *
 * Inspect mode -> OrbitControls owns the camera.
 * Explore mode -> the player controller writes it directly.
 * The player transform lives in the zustand store, so returning from Inspect
 * to Explore restores exactly where the player was standing.
 */
function SceneRig({ meta, keys, look, touchHelm }) {
  const cameraMode = useStore((s) => s.cameraMode)
  const { camera } = useThree()

  const spawn = meta?.spawn?.position ?? [0, -7.2, 0]
  const waterLevel = meta?.waterLevel ?? -14
  const flightBounds = useMemo(() => {
    const hull = meta?.hull
    if (!hull) return undefined
    return { min: [hull.min[0], hull.min[2], -hull.max[1]], max: [hull.max[0], hull.max[2], -hull.min[1]] }
  }, [meta])
  // deck height in three.js space, used by the ship surface material
  const deckY = meta?.deck?.main?.zAvg ?? meta?.deck?.height ?? -7.2

  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height))
  const framing = useMemo(() => {
    const min = meta?.hull?.min ?? [-43, -21, -62]
    const max = meta?.hull?.max ?? [43, 21, 62]
    const bottom = Math.max(min[2], waterLevel)
    const center = new THREE.Vector3((min[0] + max[0]) / 2, (bottom + max[2]) / 2, -(min[1] + max[1]) / 2)
    const direction = new THREE.Vector3(-0.72, -0.10, 0.69).normalize()
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize()
    const up = new THREE.Vector3().crossVectors(direction, right)
    const tangent = Math.tan(THREE.MathUtils.degToRad(31))
    const corner = new THREE.Vector3()
    let distance = 0
    // Metadata is Z-up. Fit the above-water envelope along both camera axes.
    for (const x of [min[0], max[0]]) {
      for (const y of [bottom, max[2]]) {
        for (const z of [-max[1], -min[1]]) {
          corner.set(x, y, z).sub(center)
          const horizontal = Math.abs(corner.dot(right)) / (tangent * Math.max(0.2, aspect) * 0.88)
          const vertical = Math.abs(corner.dot(up)) / (tangent * 0.84)
          distance = Math.max(distance, corner.dot(direction) + Math.max(horizontal, vertical))
        }
      }
    }
    return { center, direction, distance }
  }, [meta, waterLevel, aspect])

  // Each entry to Inspect frames the bow in the ship's current heading.
  const [inspectTarget, setInspectTarget] = useState([0, 0, 0])
  useLayoutEffect(() => {
    if (cameraMode !== CAMERA_MODES.INSPECT) return
    const yaw = shipYaw()
    const axis = new THREE.Vector3(0, 1, 0)
    const target = framing.center.clone().applyAxisAngle(axis, yaw)
    const direction = framing.direction.clone().applyAxisAngle(axis, yaw)
    camera.position.copy(target).addScaledVector(direction, framing.distance)
    camera.lookAt(target)
    setInspectTarget(target.toArray())
  }, [cameraMode, camera, framing])

  // expose the camera for the browser tests (e.g. proving Inspect can orbit)
  useEffect(() => {
    window.__sunnyCamera = camera.position
    return () => { delete window.__sunnyCamera }
  }, [camera])

  return (
    <>
      <SkyDome />
      <ProceduralEnvironment sunDir={SUN_DIR} />
      <Lighting rooms={meta?.interiors?.rooms} levels={meta?.interiors?.levels} dockWaterLevel={meta?.interiors?.dockWaterLevel ?? waterLevel} />
      <Archipelago waterLevel={waterLevel} />
      <PatrolFleet waterLevel={waterLevel} />
      <Ocean sunDir={SUN_DIR} waterLevel={waterLevel} hullProfile={meta?.oceanHullProfile} skyColor={SKY_FILL_COLOR} />

      <Ship sunDir={SUN_DIR} skyColor={SKY_FILL_COLOR} deckY={deckY} waterY={waterLevel} roomLights={meta?.interiors?.lights}
        aquariumLayout={meta?.interiors?.rooms?.find(room=>room.name==='Aquarium Bar')?.lounge}
        libraryLayout={meta?.interiors?.rooms?.find(room=>room.name==='Library')?.libraryLayout}
        bathLayout={meta?.interiors?.rooms?.find(room=>room.name==='Bath')?.bathLayout} />

      <DoorSystem meta={meta} />

      {cameraMode === CAMERA_MODES.EXPLORE && (
        <PlayerController
          keys={keys}
          look={look}
          spawn={spawn}
          climbs={meta?.exterior?.mechanisms?.climbs}
          flightBounds={flightBounds}
          waterLevel={waterLevel}
        />
      )}
      <NavigationSystem meta={meta} keys={keys} touchHelm={touchHelm} />
      <CoupDeBurstEffects outlet={meta?.exterior?.mechanisms?.burst} waterLevel={waterLevel} />
      <FoodLiftSystem meta={meta} />

      <InspectCamera target={inspectTarget} />
    </>
  )
}

export default function App() {
  const { keys, look } = useInput()
  const touchHelm = useRef({})
  const meta = useShipMeta()

  const cameraMode = useStore((s) => s.cameraMode)
  const setStarted = useStore((s) => s.setStarted)

  const enter = () => {
    const el = document.querySelector('canvas')
    if (useStore.getState().started && cameraMode === CAMERA_MODES.EXPLORE) {
      el?.requestPointerLock?.()
    } else {
      setStarted(true)
      if (cameraMode === CAMERA_MODES.EXPLORE) el?.requestPointerLock?.()
    }
  }

  // click on the canvas captures the pointer while exploring
  const onCanvasClick = () => {
    if (cameraMode !== CAMERA_MODES.EXPLORE || useStore.getState().cannonPanelOpen) return
    document.querySelector('canvas')?.requestPointerLock?.()
  }

  return (
    <main className="scene-frame">
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.96,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ fov: 62, near: 0.08, far: 2200, position: [34, 14, 34] }}
        onClick={onCanvasClick}
      >
        <ProgressBridge />
        <Suspense fallback={null}>
          <SceneRig meta={meta} keys={keys} look={look} touchHelm={touchHelm} />
        </Suspense>
      </Canvas>

      <UI onEnter={enter} touchHelm={touchHelm} />
    </main>
  )
}
