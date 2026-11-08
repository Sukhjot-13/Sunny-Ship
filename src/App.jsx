import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useProgress } from '@react-three/drei'

import { DoorSystem } from './components/DoorSystem.jsx'
import { NavigationSystem } from './components/NavigationSystem.jsx'
import { FoodLiftSystem } from './components/FoodLiftSystem.jsx'
import { Ship } from './components/Ship.jsx'
import { Ocean } from './components/Ocean.jsx'
import { Lighting, SkyDome, InspectCamera, SUN_DIR } from './components/Environment.jsx'
import { ProceduralEnvironment } from './components/EnvironmentMap.jsx'
import { PlayerController } from './components/PlayerController.jsx'
import { UI } from './components/UI.jsx'
import { useInput } from './hooks/useInput.js'
import { useShipMeta } from './systems/shipMeta.js'
import { useStore } from './state/useStore.js'
import { CAMERA_MODES, MOVEMENT_MODES } from './config/shipConfig.js'

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
function SceneRig({ meta, keys, look }) {
  const cameraMode = useStore((s) => s.cameraMode)
  const { camera } = useThree()

  const spawn = meta?.spawn?.position ?? [0, -7.2, 0]
  const waterLevel = meta?.waterLevel ?? -14
  // deck height in three.js space, used by the ship surface material
  const deckY = meta?.deck?.main?.zAvg ?? meta?.deck?.height ?? -7.2

  // shared Inspect framing: fit the whole hull in the vertical fov
  const framing = useMemo(() => {
    const h = meta?.hull
    const size = h?.size ?? [39, 24, 22]
    const center = h?.center ?? [0, 0, 0]
    const radius = Math.max(size[0], size[1], size[2]) * 0.5
    const fov = 62 * (Math.PI / 180)
    return {
      target: [center[0], center[1], center[2]],
      distance: (radius * 1.25) / Math.tan(fov / 2),
    }
  }, [meta])

  // frame the whole ship when entering Inspect, using the real hull bounds
  useEffect(() => {
    if (cameraMode !== CAMERA_MODES.INSPECT) return
    if (!framing) return
    const { target, distance } = framing
    const dir = new THREE.Vector3(0.66, 0.34, 0.67).normalize()
    camera.position.set(
      target[0] + dir.x * distance,
      target[1] + dir.y * distance,
      target[2] + dir.z * distance
    )
    camera.lookAt(target[0], target[1], target[2])
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
      <Lighting />
      <Ocean sunDir={SUN_DIR} waterLevel={waterLevel} hullProfile={meta?.oceanHullProfile} skyColor="#9fc4e0" />

      <Ship sunDir={SUN_DIR} skyColor="#9fc4e0" deckY={deckY} waterY={waterLevel} roomLights={meta?.interiors?.lights} />

      <DoorSystem meta={meta} />

      {cameraMode === CAMERA_MODES.EXPLORE && (
        <PlayerController
          keys={keys}
          look={look}
          spawn={spawn}
          climbs={meta?.exterior?.mechanisms?.climbs}
          waterLevel={waterLevel}
        />
      )}
      <NavigationSystem meta={meta} keys={keys} />
      <FoodLiftSystem meta={meta} />

      <InspectCamera target={framing.target} distance={framing.distance} />
    </>
  )
}

export default function App() {
  const { keys, look } = useInput()
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
        dpr={1}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ fov: 62, near: 0.08, far: 800, position: [34, 14, 34] }}
        onClick={onCanvasClick}
      >
        <ProgressBridge />
        <Suspense fallback={null}>
          <SceneRig meta={meta} keys={keys} look={look} />
        </Suspense>
      </Canvas>

      <UI onEnter={enter} />
    </main>
  )
}
