import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useStore } from '../state/useStore.js'
import { CAMERA_MODES } from '../config/shipConfig.js'
import { BURST, shipYaw, voyage } from '../systems/navigation.js'

// Low golden-hour sun off the bow-starboard horizon (~14° elevation):
// rakes warm golden sunlight across the lion figurehead, brass collar, hull,
// deck lawn and sails while placing the blazing sun & golden ocean glint path
// in view from the bow-quarter, deck, and default Inspect angles.
export const SUN_DIR = new THREE.Vector3(-0.72, 0.24, -0.65).normalize()
export const SUN_COLOR = '#ffb05e'
export const SKY_HORIZON_COLOR = '#f2ae6b'
export const SKY_ZENITH_COLOR = '#123a70'
export const SKY_FILL_COLOR = '#649bd6'

const OUTDOOR_HEMI_SKY = new THREE.Color('#629ad8')
const INDOOR_HEMI_SKY = new THREE.Color('#f0cda0')
const OUTDOOR_HEMI_GND = new THREE.Color('#5e422c')
const INDOOR_HEMI_GND = new THREE.Color('#573c28')
const OUTDOOR_AMB = new THREE.Color('#a4bedd')
const INDOOR_AMB = new THREE.Color('#f2d6b0')

/**
 * Golden-hour lighting rig: warm low-angle sun casting high-resolution shadows
 * centered on the ship's real hull/rigging bounds, cool cerulean sky fill for
 * photographic warm-key / cool-shadow contrast, and warm ocean bounce below.
 *
 * When the camera steps inside an enclosed interior room, non-shadowed outdoor
 * sky/ocean fill lights smoothly yield to warm maritime room bounce so cold
 * outdoor sky never bleeds through solid timber hull walls, while the real
 * shadow-casting Golden Hour sun continues streaming through windows & doors.
 */
export function Lighting({ rooms = [], levels = null, dockWaterLevel = -51.85 } = {}) {
  const keyRef = useRef()
  const hemiRef = useRef()
  const ambRef = useRef()
  const skyFillRef = useRef()
  const seaBounceRef = useRef()
  const indoorMixRef = useRef(0)

  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0, -24, 0)
    return o
  }, [])

  const enclosedBoxes = useMemo(() => {
    if (!rooms?.length || !levels) return []
    return rooms
      .filter((r) => r.name !== 'Observation Deck' && r.name !== 'Stern Ladder Access' && r.x && r.y)
      .map((r) => {
        const floor = r.name === 'Soldier Dock System' ? dockWaterLevel : levels[r.level]
        if (!Number.isFinite(floor)) return null
        const ceiling = floor + (r.name === 'Aquarium Bar' || r.name === 'Library' || r.name === 'Bath' ? 5.2 : 4.2)
        return { x0: r.x[0], x1: r.x[1], z0: -r.y[1], z1: -r.y[0], y0: floor - 0.5, y1: ceiling }
      })
      .filter(Boolean)
  }, [rooms, levels, dockWaterLevel])

  useEffect(() => {
    if (keyRef.current) {
      keyRef.current.target = target
      keyRef.current.target.updateMatrixWorld()
    }
  }, [target])

  useFrame(({ camera }, delta) => {
    if (!enclosedBoxes.length) return
    const yaw = shipYaw()
    const c = Math.cos(yaw), s = Math.sin(yaw)
    const lx = c * camera.position.x - s * camera.position.z
    const lz = s * camera.position.x + c * camera.position.z
    const ly = camera.position.y - voyage.lift
    let inside = false
    for (let i = 0; i < enclosedBoxes.length; i++) {
      const b = enclosedBoxes[i]
      if (lx >= b.x0 && lx <= b.x1 && lz >= b.z0 && lz <= b.z1 && ly >= b.y0 && ly <= b.y1) {
        inside = true
        break
      }
    }
    const targetMix = inside ? 1 : 0
    const prev = indoorMixRef.current
    const next = THREE.MathUtils.damp(prev, targetMix, 14, Math.min(delta, 0.1))
    if (Math.abs(next - prev) < 0.0005 && Math.abs(next - targetMix) < 0.001) {
      if (prev === targetMix) return
      indoorMixRef.current = targetMix
    } else {
      indoorMixRef.current = next
    }
    const m = indoorMixRef.current
    if (hemiRef.current) {
      hemiRef.current.color.copy(OUTDOOR_HEMI_SKY).lerp(INDOOR_HEMI_SKY, m)
      hemiRef.current.groundColor.copy(OUTDOOR_HEMI_GND).lerp(INDOOR_HEMI_GND, m)
      hemiRef.current.intensity = THREE.MathUtils.lerp(0.76, 0.50, m)
    }
    if (ambRef.current) {
      ambRef.current.color.copy(OUTDOOR_AMB).lerp(INDOOR_AMB, m)
      ambRef.current.intensity = THREE.MathUtils.lerp(0.12, 0.26, m)
    }
    if (skyFillRef.current) {
      skyFillRef.current.intensity = THREE.MathUtils.lerp(0.78, 0.08, m)
    }
    if (seaBounceRef.current) {
      seaBounceRef.current.intensity = THREE.MathUtils.lerp(0.46, 0.04, m)
    }
  })

  return (
    <>
      <primitive object={target} />
      {/* Cool azure zenith fill + warm golden-timber/sea bounce */}
      <hemisphereLight ref={hemiRef} args={['#629ad8', '#5e422c', 0.76]} />
      {/* Restrained ambient so shadows keep sculptural depth without crushing blacks */}
      <ambientLight ref={ambRef} intensity={0.12} color="#a4bedd" />
      {/* Primary golden-hour sun key */}
      <directionalLight
        ref={keyRef}
        castShadow
        position={[SUN_DIR.x * 140, -24 + SUN_DIR.y * 140, SUN_DIR.z * 140]}
        intensity={3.05}
        color={SUN_COLOR}
        shadow-mapSize={[4096, 4096]}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-camera-left={-74}
        shadow-camera-right={74}
        shadow-camera-top={98}
        shadow-camera-bottom={-56}
        shadow-bias={-0.00018}
        shadow-normalBias={0.055}
        shadow-radius={2.2}
      />
      {/* Opposite cerulean sky fill so shaded port/stern hull reads with rich atmospheric depth */}
      <directionalLight
        ref={skyFillRef}
        position={[-SUN_DIR.x * 95, 26, -SUN_DIR.z * 95]}
        intensity={0.78}
        color="#82b4e6"
      />
      {/* Warm golden-amber bounce rising off the sunlit ocean waves */}
      <directionalLight
        ref={seaBounceRef}
        position={[SUN_DIR.x * 55, -76, SUN_DIR.z * 55]}
        intensity={0.46}
        color="#e89448"
      />
    </>
  )
}

/**
 * Photorealistic Golden Hour atmospheric sky dome with infinite camera-centered
 * projection (eliminating any vertical horizon offset regardless of camera altitude),
 * Rayleigh/Mie horizon glow, blazing solar corona, and sculptural sunlit cumulus clouds.
 */
export function SkyDome() {
  const matRef = useRef()

  const material = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDir: { value: SUN_DIR.clone() },
        uZenith: { value: new THREE.Color('#0d3266') },
        uMidSky: { value: new THREE.Color('#2c6bb0') },
        uHorizonCool: { value: new THREE.Color('#b6c5d8') },
        uHorizonWarm: { value: new THREE.Color('#f4ae68') },
        uBottom: { value: new THREE.Color('#0c2138') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          // Infinite camera-centered skybox: translation is stripped from viewMatrix
          // so the horizon is ALWAYS exactly at eye-level d.y == 0 (for both main
          // and planar-reflection cameras), preventing any shifted below-horizon band.
          mat4 rotView = mat4(mat3(viewMatrix));
          vec4 clip = projectionMatrix * rotView * vec4(position, 1.0);
          gl_Position = clip.xyww;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunDir, uZenith, uMidSky, uHorizonCool, uHorizonWarm, uBottom;
        varying vec3 vDir;

        float hash2(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash2(i);
          float b = hash2(i + vec2(1.0, 0.0));
          float c = hash2(i + vec2(0.0, 1.0));
          float d = hash2(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.50;
          mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
          for (int i = 0; i < 6; i++) {
            v += a * vnoise(p);
            p = rot * p * 2.07 + vec2(13.7, 7.3);
            a *= 0.50;
          }
          return v;
        }

        // Sculptural cumulus density with domain-warped billowy puffs
        float cumulus(vec2 uv) {
          vec2 warp = vec2(fbm(uv * 0.75 + vec2(1.4, 3.2)), fbm(uv * 0.75 + vec2(7.1, 2.8))) - 0.5;
          float macro = fbm(uv * 0.85 + warp * 0.42);
          float puffs = fbm(uv * 2.45 - warp * 0.35 + vec2(5.2, 8.6));
          float billow = 1.0 - abs(puffs * 2.0 - 1.0);
          float shape = macro * 0.76 + billow * 0.28;
          return smoothstep(0.51, 0.70, shape);
        }

        void main() {
          vec3 d = normalize(vDir);
          vec3 sDir = normalize(uSunDir);
          float h = d.y;
          float sd = max(dot(d, sDir), 0.0);
          float sunAz = clamp(dot(normalize(vec2(d.x, d.z) + 1e-5), normalize(vec2(sDir.x, sDir.z))) * 0.5 + 0.5, 0.0, 1.0);

          // Horizon warmth peaks dramatically near the sun, softer pearl-blue opposite
          vec3 horizon = mix(uHorizonCool, uHorizonWarm, pow(sunAz, 1.55) * 0.86 + 0.14);
          vec3 horizonBelt = vec3(1.0, 0.64, 0.28) * (0.22 + 0.78 * pow(sunAz, 1.8)) * 0.48;
          vec3 horizonExact = horizon + horizonBelt;

          vec3 col;
          if (h >= 0.0) {
            float tMid = smoothstep(0.0, 0.28, h);
            float tTop = smoothstep(0.16, 0.88, h);
            col = mix(horizon, uMidSky, pow(tMid, 0.68));
            col = mix(col, uZenith, pow(tTop, 0.86));
            // Warm atmospheric sunset band hugging the horizon toward the sun
            col += horizonBelt * exp(-h * 8.5);
          } else {
            // 100% continuous with h == 0.0 horizonExact so no seam or dark band ever appears
            col = mix(horizonExact, uBottom, pow(smoothstep(0.0, 0.35, -h), 0.75));
          }

          // Broad Mie forward-scattering golden glow + crisp blazing sun disc
          col += vec3(1.0, 0.68, 0.32) * pow(sd, 5.5) * 0.52;
          col += vec3(1.0, 0.84, 0.52) * pow(sd, 42.0) * 1.35;
          col += vec3(1.0, 0.96, 0.82) * pow(sd, 1100.0) * 7.5;

          // Sculptural sunlit golden-hour cumulus clouds
          if (h > 0.005) {
            float proj = 1.0 / (h + 0.15);
            vec2 cloudUV = d.xz * proj * 0.92 + vec2(3.8, -1.9);
            float density = cumulus(cloudUV);

            float horizonMask = smoothstep(0.012, 0.13, h);
            float zenithMask = 1.0 - smoothstep(0.58, 0.96, h) * 0.50;
            float cloudAlpha = density * horizonMask * zenithMask * 0.92;

            if (cloudAlpha > 0.005) {
              // Dual-step directional light marching toward the sun for crisp lit tops & shaded bellies
              vec2 sunStep = normalize(sDir.xz + 1e-5);
              float occ1 = cumulus(cloudUV + sunStep * 0.10);
              float occ2 = cumulus(cloudUV + sunStep * 0.26);
              float shadow = clamp(occ1 * 0.62 + occ2 * 0.38, 0.0, 1.0);
              float light = clamp(1.0 - shadow * 0.85 - density * 0.28 + 0.22, 0.0, 1.0);

              // Cool periwinkle-slate undersides vs warm golden-cream sunlit tops
              vec3 shadowCol = mix(vec3(0.30, 0.39, 0.55), vec3(0.56, 0.43, 0.39), pow(sunAz, 1.6));
              vec3 litCol = mix(vec3(0.98, 0.88, 0.78), vec3(1.05, 0.82, 0.52), pow(sunAz, 1.1) * 0.75 + 0.25);
              vec3 cloudCol = mix(shadowCol, litCol, smoothstep(0.08, 0.84, light));

              // Blazing golden-white silver-lining rim around clouds facing the sun
              float edge = smoothstep(0.05, 0.45, density) * (1.0 - smoothstep(0.45, 0.95, density));
              float rim = pow(sd, 4.0) * (0.45 + edge * 1.65) + pow(sd, 16.0) * 1.45;
              cloudCol += vec3(1.0, 0.86, 0.54) * rim;

              // Aerial haze blends distant low clouds smoothly into horizon glow
              float distFade = smoothstep(0.012, 0.20, h);
              cloudCol = mix(horizon * 1.04, cloudCol, distFade);

              col = mix(col, cloudCol, cloudAlpha);
            }
          }

          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
    return m
  }, [])

  return (
    <mesh ref={matRef} material={material} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[450, 32, 24]} />
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
