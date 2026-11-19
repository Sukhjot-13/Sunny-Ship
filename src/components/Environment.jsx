import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useStore } from '../state/useStore.js'
import { CAMERA_MODES } from '../config/shipConfig.js'
import { BURST, shipYaw, voyage } from '../systems/navigation.js'
import { SKY_FILL, SUN_COLOR, SUN_DIR, skyRadiance } from '../systems/maritimeLight.js'

/**
 * Low sun and cool sky fill give the ship a readable light and shadow side.
 */
export function Lighting() {
  return (
    <>
      <hemisphereLight args={[SKY_FILL, '#74736c', .54]} />
      <directionalLight
        castShadow
        position={SUN_DIR.clone().multiplyScalar(115)}
        intensity={3.25}
        color={SUN_COLOR}
        shadow-mapSize={[3072, 3072]}
        shadow-camera-near={1}
        shadow-camera-far={225}
        shadow-camera-left={-65}
        shadow-camera-right={65}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.00008}
        shadow-normalBias={0.055}
      />
    </>
  )
}

/**
 * Distant cloud layer with soft sunlit edges above the maritime haze.
 */
export function SkyDome() {
  const material = useMemo(() => new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDir: { value: SUN_DIR.clone() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
          // Sky is infinitely distant, including in the oblique water camera.
          // The reflection clip plane must not cut a finite dome into a band.
          gl_Position.z = gl_Position.w;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDir;
        varying vec3 vDir;
        ${skyRadiance}

        float cloudHash(vec2 p) {
          p = fract(p * vec2(.31831, .36787));
          p += dot(p, p.yx + 19.19);
          return fract(p.x * p.y);
        }

        float cloudNoise(vec2 p) {
          vec2 cell = floor(p), t = fract(p);
          t *= t * (3.0 - 2.0 * t);
          return mix(mix(cloudHash(cell), cloudHash(cell + vec2(1, 0)), t.x),
                     mix(cloudHash(cell + vec2(0, 1)), cloudHash(cell + 1.0), t.x), t.y);
        }

        float cloudField(vec2 p) {
          mat2 turn = mat2(1.64, 1.21, -1.21, 1.64);
          float density = cloudNoise(p) * .51;
          p = turn * p + 11.7;
          density += cloudNoise(p) * .26;
          p = turn * p + 7.3;
          density += cloudNoise(p) * .13;
          p = turn * p;
          density += cloudNoise(p) * .068;
          density += cloudNoise(turn * p) * .032;
          return density;
        }

        void main() {
          vec3 d = normalize(vDir);
          vec3 col = maritimeSky(d, uSunDir);
          float sun = max(dot(d, uSunDir), 0.0);
          if (d.y > -.015) {
            vec2 p = d.xz * 2.9 / (max(d.y, 0.0) + .19) + vec2(3.8, 1.7);
            float density = cloudField(p);
            float cover = smoothstep(.515, .675, density) * smoothstep(-.016, .13, d.y);
            float shade = smoothstep(.01, .108, density - cloudField(p + uSunDir.xz * .52) + .032);
            vec3 cloud = mix(vec3(.33, .39, .51), vec3(1.17, .91, .66), shade);
            cloud += vec3(.43, .21, .07) * pow(sun, 7.0);
            col += vec3(15.0, 8.6, 3.55) * smoothstep(.99986, .99994, sun);
            col = mix(col, cloud, cover * .94);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }), [])

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <primitive object={material} attach="material" />
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
  const orbit = useRef(null)
  const startingView = useRef(null)
  const burstView = useMemo(() => ({
    eye:new THREE.Vector3(),focus:new THREE.Vector3(),up:new THREE.Vector3(0,1,0),
  }), [])

  useFrame(({camera})=>{
    const controls=orbit.current
    if(!controls){startingView.current=null;return}
    if(voyage.burst===0){
      const saved=startingView.current
      if(!saved)return
      camera.position.copy(saved.eye)
      controls.target.copy(saved.focus)
      controls.enabled=true
      controls.update()
      startingView.current=null
      return
    }
    startingView.current??={eye:camera.position.clone(),focus:controls.target.clone()}
    controls.enabled=false
    const age=BURST.seconds-voyage.burst
    const weight=Math.min(1,age/BURST.charge,voyage.burst/.62)
    const blend=weight*weight*(3-2*weight)
    const lift=Math.max(0,voyage.lift)
    const elevation=lift/BURST.height
    const pass=Math.max(0,Math.min(1,(age-BURST.charge-.4)/(BURST.flight-.65)))
    const sweep=pass*pass*(3-2*pass)
    const {eye,focus,up}=burstView
    eye.set(94-178*sweep,34+lift*.72,145+23*Math.sin(pass*Math.PI)+14*elevation).applyAxisAngle(up,shipYaw())
    focus.set(13-19*sweep,-8+lift*.72+6*elevation,0).applyAxisAngle(up,shipYaw())
    camera.position.copy(startingView.current.eye).lerp(eye,blend)
    focus.lerp(startingView.current.focus,1-blend)
    camera.lookAt(focus)
  },-.5)

  if (cameraMode !== CAMERA_MODES.INSPECT) return null

  return (
    <OrbitControls
      ref={orbit}
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
      maxPolarAngle={Math.PI * 0.54}
      onStart={() => {
        ready.current = true
      }}
      onChange={() => {
        // keep OrbitControls authoritative in inspect mode
      }}
    />
  )
}
