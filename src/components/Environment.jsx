import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useStore } from '../state/useStore.js'
import { CAMERA_MODES } from '../config/shipConfig.js'

export const SUN_DIR = new THREE.Vector3(0.45, 0.78, 0.35).normalize()

/**
 * Lighting rig: a warm key sun that casts the shadows, a cool hemisphere fill
 * for sky/ground bounce, and a soft rim so the hull silhouette reads against
 * the sky.
 */
export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#dfeaf5', '#8a7f66', 1.25]} />
      <ambientLight intensity={0.30} color="#f2ece0" />
      <directionalLight
        castShadow
        position={[SUN_DIR.x * 90, SUN_DIR.y * 90, SUN_DIR.z * 90]}
        intensity={2.9}
        color="#fff3dc"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0001}
        shadow-normalBias={0.12}
      />
      {/* cool rim from behind for silhouette separation */}
      <directionalLight
        position={[-60, 30, -70]}
        intensity={0.9}
        color="#9ec4e6"
      />
      {/* low bounce from the sea */}
      <directionalLight position={[0, -20, 20]} intensity={0.4} color="#7fa8c4" />
    </>
  )
}

/**
 * Procedural sky dome. A cheap gradient + sun disc that also feeds the scene
 * environment so PBR materials get sensible ambient reflections.
 */
export function SkyDome() {
  const matRef = useRef()
  const { gl, scene } = useThree()

  const material = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDir: { value: SUN_DIR.clone() },
        uTop: { value: new THREE.Color('#2f6fa8') },
        uHorizon: { value: new THREE.Color('#cfe3f2') },
        uBottom: { value: new THREE.Color('#8fb0c4') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          // Sky is infinitely distant, including in the oblique water camera.
          // The reflection clip plane must not cut a finite dome into a band.
          gl_Position.z = gl_Position.w;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDir, uTop, uHorizon, uBottom;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col;
          if (h >= 0.0) {
            col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.62));
          } else {
            col = mix(uHorizon, uBottom, pow(clamp(-h, 0.0, 1.0), 0.5));
          }
          // sun disc + broad glow
          float sd = max(dot(d, normalize(uSunDir)), 0.0);
          col += vec3(1.0, 0.96, 0.86) * pow(sd, 620.0) * 2.2;
          col += vec3(1.0, 0.93, 0.78) * pow(sd, 12.0) * 0.16;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
    return m
  }, [])

  return (
    <mesh ref={matRef} material={material} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[450, 24, 16]} />
    </mesh>
  )
}

/**
 * Orbit camera used by Inspect mode.
 *
 * The target and framing distance are shared with SceneRig so the camera and
 * the controls agree on what "the whole ship" means.
 */
export function InspectCamera({ target = [0, 0, 0], distance = 45 }) {
  const cameraMode = useStore((s) => s.cameraMode)
  const ready = useRef(false)

  if (cameraMode !== CAMERA_MODES.INSPECT) return null

  return (
    <OrbitControls
      makeDefault
      enabled={cameraMode === CAMERA_MODES.INSPECT}
      target={target}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
      zoomSpeed={0.8}
      panSpeed={0.5}
      minDistance={8}
      maxDistance={400}
      maxPolarAngle={Math.PI * 0.495}
      onStart={() => {
        ready.current = true
      }}
      onChange={() => {
        // keep OrbitControls authoritative in inspect mode
      }}
    />
  )
}
