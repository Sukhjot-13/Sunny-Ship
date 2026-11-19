import * as THREE from 'three'
import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { WATER_LEVEL } from '../config/shipConfig.js'
import { OCEAN_SIZE_M, OCEAN_HORIZON_SIZE_M, OCEAN_SEGMENTS, WAVE_SCALE } from '../config/renderConfig.js'
import { BURST, sampleBurst, voyage, shipYaw } from '../systems/navigation.js'
import { createOceanReflection } from '../systems/oceanReflection.js'

/**
 * Physical Golden Hour ocean shading over the navigation-matched Gerstner surface.
 *
 * Four summed Gerstner waves drive real displacement and normals, layered with
 * derivative-filtered multi-octave wind ripples, dielectric Fresnel sky/planar
 * reflection, dual-lobe GGX golden sun glitter, wave-crest subsurface scatter,
 * organic hull-contact spray/wake foam, and seamless atmospheric horizon blend.
 */
const vert = /* glsl */ `
  uniform float uTime;
  uniform float uChoppy;
  uniform float uHorizon;
  uniform float uNearEdge;
  uniform vec2 uWorldOffset;
  uniform mat4 uReflectionMatrix;

  void gerstner(
    vec2 dir, float steepness, float wavelength, float speed,
    inout vec3 disp, inout vec3 tangent, inout vec3 binormal, vec2 p, float t
  ) {
    float k = 6.28318530718 / wavelength;
    float c = sqrt(9.8 / k) * speed;
    vec2 d = normalize(dir);
    float f = k * (dot(d, p) - c * t);
    float a = steepness / k;

    disp += vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));

    tangent += vec3(
      -d.x * d.x * steepness * sin(f),
       d.x * steepness * cos(f),
      -d.x * d.y * steepness * sin(f)
    );
    binormal += vec3(
      -d.x * d.y * steepness * sin(f),
       d.y * steepness * cos(f),
      -d.y * d.y * steepness * sin(f)
    );
  }

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;
  varying vec4 vReflectCoord;

  void main() {
    vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
    vec2 p = wp.xz + uWorldOffset;

    vec3 disp = vec3(0.0);
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);

    gerstner(vec2( 1.0,  0.35), 0.26, 42.0, 1.00, disp, tangent, binormal, p, uTime);
    gerstner(vec2(-0.6,  1.0 ), 0.18, 23.0, 1.15, disp, tangent, binormal, p, uTime);
    gerstner(vec2( 0.8, -0.7 ), 0.13, 12.0, 1.30, disp, tangent, binormal, p, uTime);
    gerstner(vec2(-1.0, -0.25), 0.09,  6.5, 1.45, disp, tangent, binormal, p, uTime);

    // Fade displacement/normals into the flat horizon ring.
    float edge = smoothstep(uNearEdge * 0.70, uNearEdge, max(abs(wp.x), abs(wp.z)));
    float waveWeight = (1.0 - edge) * (1.0 - uHorizon);
    vec3 newPos = wp + disp * uChoppy * waveWeight;
    vWorldPos = newPos;
    vReflectCoord = uReflectionMatrix * vec4(newPos, 1.0);
    vNormal = normalize(mix(vec3(0.0, 1.0, 0.0), normalize(cross(binormal, tangent)), uChoppy * waveWeight));
    vCrest = clamp((disp.y * uChoppy + 0.18) * 1.45, 0.0, 1.0) * waveWeight;

    gl_Position = projectionMatrix * viewMatrix * vec4(newPos, 1.0);
  }
`

const frag = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSkyColor;
  uniform vec3 uSkyHorizon;
  uniform vec3 uSkyHorizonCool;
  uniform vec3 uSkyZenith;
  uniform vec3 uCameraPos;
  uniform float uTime;
  uniform sampler2D uReflectionMap;
  uniform float uReflectionReady;
  uniform vec2 uWorldOffset;
  uniform float uShipSpeed;
  uniform float uWaterLevel;
  uniform int uHullCount;
  uniform vec3 uHullProfile[32];
  uniform float uShipYaw;
  uniform float uShipLift;
  uniform vec2 uBurstImpact;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vCrest;
  varying vec4 vReflectCoord;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm3(vec2 p) {
    float v = 0.0;
    v += 0.55 * noise(p);
    p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.13 + vec2(5.2, 1.7);
    v += 0.30 * noise(p);
    p = mat2(0.8, 0.6, -0.6, 0.8) * p * 2.09 + vec2(2.8, 9.1);
    v += 0.15 * noise(p);
    return v;
  }

  vec2 rippleGrad(vec2 p, float eps, out float weight) {
    float fp = max(length(dFdx(p)), length(dFdy(p)));
    weight = 1.0 - smoothstep(0.22, 0.95, fp);
    if (weight < 0.005) return vec2(0.0);
    float gx = noise(p + vec2(eps, 0.0)) - noise(p - vec2(eps, 0.0));
    float gz = noise(p + vec2(0.0, eps)) - noise(p - vec2(0.0, eps));
    return vec2(gx, gz) * weight;
  }

  // Analytical Golden Hour sky matching SkyDome for reflections & horizon haze
  vec3 evalGoldenSky(vec3 dir, vec3 sunDir) {
    vec3 d = normalize(dir);
    float h = max(d.y, 0.0);
    float sunAz = clamp(dot(normalize(vec2(d.x, d.z) + 1e-5), normalize(vec2(sunDir.x, sunDir.z))) * 0.5 + 0.5, 0.0, 1.0);
    vec3 hor = mix(uSkyHorizonCool, uSkyHorizon, pow(sunAz, 1.55) * 0.86 + 0.14);
    vec3 mid = vec3(0.17, 0.42, 0.69);
    vec3 col = mix(hor, mid, pow(smoothstep(0.0, 0.28, h), 0.68));
    col = mix(col, uSkyZenith, pow(smoothstep(0.16, 0.88, h), 0.86));
    float belt = exp(-h * 8.5) * (0.22 + 0.78 * pow(sunAz, 1.8));
    col += vec3(1.0, 0.64, 0.28) * belt * 0.48;
    float sd = max(dot(d, sunDir), 0.0);
    col += vec3(1.0, 0.68, 0.32) * pow(sd, 5.5) * 0.50;
    col += vec3(1.0, 0.84, 0.52) * pow(sd, 42.0) * 1.25;
    return col;
  }

  void main() {
    // Cut the ocean out of the hull cross-section, including wave excursions.
    float c = cos(uShipYaw), s = sin(uShipYaw);
    vec2 local = vec2(c * vWorldPos.x - s * vWorldPos.z, s * vWorldPos.x + c * vWorldPos.z);
    float hullDistance = 1000.0;
    if (uShipLift < 0.5 && uHullCount > 1 && local.x >= uHullProfile[0].x && local.x <= uHullProfile[31].x) {
      for (int i = 0; i < 31; i++) {
        if (i >= uHullCount - 1) break;
        vec3 a = uHullProfile[i], b = uHullProfile[i + 1];
        if (local.x >= a.x && local.x <= b.x) {
          float t = (local.x - a.x) / max(b.x - a.x, 0.001);
          vec2 sides = mix(a.yz, b.yz, t);
          if (local.y >= sides.x && local.y <= sides.y) discard;
          hullDistance = min(abs(local.y - sides.x), abs(local.y - sides.y));
          break;
        }
      }
    }

    vec2 surface = vWorldPos.xz + uWorldOffset;
    float w1, w2, w3;
    vec2 gBroad = rippleGrad(surface * 0.28 + vec2(-uTime * 0.10, uTime * 0.07), 0.14, w1);
    vec2 gMid   = rippleGrad(surface * 1.15 + vec2( uTime * 0.18, -uTime * 0.13), 0.10, w2);
    vec2 gFine  = rippleGrad(surface * 3.80 + vec2(-uTime * 0.24, -uTime * 0.20), 0.08, w3);

    // Richer ocean choppiness so swells catch crisp dark-navy troughs and golden sunlit crests
    vec2 totalGrad = gBroad * 0.52 + gMid * 0.58 + gFine * 0.44;
    vec3 N = normalize(vNormal + vec3(totalGrad.x, 0.0, totalGrad.y));
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uSunDir);

    float nv = max(dot(N, V), 0.001);
    float nl = max(dot(N, L), 0.001);

    // Deep marine ocean body + sun-backlit subsurface teal scatter in wave crests
    float path = 1.65 / max(nv, 0.18);
    vec3 transmission = exp(-vec3(0.55, 0.10, 0.036) * path);
    vec3 body = mix(uDeepColor, uShallowColor, vCrest * 0.40);
    body *= mix(vec3(0.50), transmission, 0.44) * (0.42 + 0.58 * nl);

    // Subsurface sunlight passing through thin wave peaks when looking toward the sun
    float backScatter = pow(clamp(dot(V, -L + N * 0.45), 0.0, 1.0), 3.0) * vCrest;
    body += vec3(0.05, 0.34, 0.36) * uSunColor * backScatter * 0.58;

    // Physical water Fresnel (IOR 1.333 -> F0 = 0.0204), slightly restrained so open sea stays rich deep blue
    float fres = clamp(0.0204 + 0.86 * pow(1.0 - nv, 4.6), 0.02, 0.88);
    vec3 reflectedDir = reflect(-V, N);
    vec3 sky = evalGoldenSky(vec3(reflectedDir.x, max(reflectedDir.y, 0.015), reflectedDir.z), L);

    vec2 reflectionUV = vReflectCoord.xy / max(vReflectCoord.w, 0.001);
    reflectionUV += N.xz * 0.022;
    float inside = step(0.0, reflectionUV.x) * step(reflectionUV.x, 1.0) *
                   step(0.0, reflectionUV.y) * step(reflectionUV.y, 1.0) *
                   step(0.001, vReflectCoord.w);
    float border = smoothstep(0.0, 0.04, min(min(reflectionUV.x, reflectionUV.y), min(1.0 - reflectionUV.x, 1.0 - reflectionUV.y)));
    vec4 reflected = texture2D(uReflectionMap, clamp(reflectionUV, 0.001, 0.999), 0.7);
    float nearReflection = 1.0 - smoothstep(70.0, 145.0, max(abs(vWorldPos.x), abs(vWorldPos.z)));
    vec3 reflection = mix(sky, reflected.rgb, inside * border * reflected.a * uReflectionReady * nearReflection);

    vec3 col = body * (1.0 - fres) + reflection * fres;

    // Dual-lobe GGX Golden Hour sun glitter path (sparkle core + warm broad sunset sheen)
    vec3 H = normalize(L + V);
    float nh = max(dot(N, H), 0.0), vh = max(dot(V, H), 0.0);
    float variance = max(dot(dFdx(N), dFdx(N)), dot(dFdy(N), dFdy(N)));
    float F = 0.0204 + 0.9796 * pow(1.0 - vh, 5.0);

    float a2Sharp = clamp(0.0038 + variance * 0.55, 0.0038, 0.14);
    float dSharpDen = nh * nh * (a2Sharp - 1.0) + 1.0;
    float DSharp = a2Sharp / (3.14159265 * dSharpDen * dSharpDen);
    float kSharp = sqrt(a2Sharp) * 0.5;
    float GSharp = (nv / (nv * (1.0 - kSharp) + kSharp)) * (nl / (nl * (1.0 - kSharp) + kSharp));
    float specSharp = min(DSharp * GSharp * F / (4.0 * nv), 5.0);

    float a2Broad = clamp(0.055 + variance * 0.35, 0.055, 0.25);
    float dBroadDen = nh * nh * (a2Broad - 1.0) + 1.0;
    float DBroad = a2Broad / (3.14159265 * dBroadDen * dBroadDen);
    float specBroad = min(DBroad * F * 0.22, 1.2);

    col += uSunColor * (specSharp * 2.1 + specBroad * 0.75);

    // Organic hull-contact spray, bow whitewater, wake, and Coup de Burst splash
    // (No periodic grid crest polka-dots in the open ocean!)
    float foamTex = fbm3(surface * 1.15 + vec2(uTime * 0.14, -uTime * 0.11));
    float fineBubbles = noise(surface * 5.2 + vec2(-uTime * 0.22, uTime * 0.16));
    float speed = clamp(abs(uShipSpeed) / 5.0, 0.0, 1.0);

    // Rich frothy bow & hull-side waterline wash hugging the hull curve
    float bowFocus = smoothstep(4.0, -34.0, local.x);
    float contactBand = mix(1.55, 3.25, bowFocus) * (1.0 + 0.35 * speed);
    float contactMask = 1.0 - smoothstep(0.05, contactBand, hullDistance);
    float contact = contactMask * smoothstep(0.28, 0.68, foamTex * 0.66 + fineBubbles * 0.42) * (0.52 + 0.45 * speed + 0.36 * bowFocus);
    // Crisp tight foam rim right where water meets wood
    float tightRim = (1.0 - smoothstep(0.02, 0.46, hullDistance)) * smoothstep(0.22, 0.62, fineBubbles) * 0.62;

    float trailing = uShipSpeed >= 0.0 ? local.x - uHullProfile[31].x : uHullProfile[0].x - local.x;
    float spread = 1.0 + max(trailing, 0.0) * 0.24;
    float wake = (1.0 - smoothstep(0.2, 1.25, abs(abs(local.y) - spread))) *
                 exp(-max(trailing, 0.0) * 0.042) * step(0.0, trailing) * step(trailing, 48.0) * speed;
    wake *= smoothstep(0.34, 0.76, foamTex) * 0.46;

    float impact = 0.0;
    if (uBurstImpact.x >= 0.0) {
      vec2 offset = local - vec2(-20.0 + uBurstImpact.y, 0.0);
      float radius = length(offset * vec2(0.78, 1.0));
      float edge = 7.0 + uBurstImpact.x * 27.0;
      float cresting = 1.0 - smoothstep(1.0, 5.0, abs(radius - edge));
      float wash = (1.0 - smoothstep(edge * 0.35, edge, radius)) * 0.58;
      impact = clamp(cresting + wash, 0.0, 1.0) * smoothstep(0.16, 0.68, foamTex) * exp(-uBurstImpact.x * 1.7);
    }

    float foam = clamp((contact + tightRim + wake) * (1.0 - step(0.5, uShipLift)), 0.0, 0.82);
    foam = min(0.90, foam + impact);
    // Foam tinted warmly by golden-hour sun on lit side, soft cool pearl in shadow
    vec3 foamCol = mix(vec3(0.68, 0.76, 0.84), vec3(1.0, 0.90, 0.78), 0.35 + 0.65 * nl);
    col = mix(col, foamCol, foam);

    // Distant atmospheric horizon mist — keeps nearby sea rich deep navy while dissolving the far edge
    float dist = length(vWorldPos.xz - uCameraPos.xz);
    vec3 viewDir = normalize(vWorldPos - uCameraPos);
    vec3 horizonMist = evalGoldenSky(vec3(viewDir.x, 0.0, viewDir.z), L);
    float fog = pow(smoothstep(300.0, 860.0, dist), 1.45);
    col = mix(col, horizonMist, clamp(fog, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Four flat rectangles around the detailed ocean, only eight triangles. */
function horizonGeometry() {
  const inner = OCEAN_SIZE_M / 2, outer = OCEAN_HORIZON_SIZE_M / 2
  const positions = [], indices = []
  for (const [x0, x1, z0, z1] of [
    [-outer, outer, inner, outer],
    [-outer, outer, -outer, -inner],
    [-outer, -inner, -inner, inner],
    [inner, outer, -inner, inner],
  ]) {
    const i = positions.length / 3
    positions.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x1, 0, z0)
    indices.push(i, i + 1, i + 2, i, i + 2, i + 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  return geometry
}

export const Ocean = forwardRef(function Ocean({ waterLevel = WATER_LEVEL, hullProfile = [], ...props }, ref) {
  const meshRef = useRef()
  const horizonRef = useRef()
  const horizon = useMemo(horizonGeometry, [])
  const reflection = useMemo(() => createOceanReflection(waterLevel), [waterLevel])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTime: { value: 0 },
          uChoppy: { value: WAVE_SCALE },
          uHorizon: { value: 0 },
          uNearEdge: { value: OCEAN_SIZE_M / 2 },
          uSunDir: { value: new THREE.Vector3(-0.72, 0.24, -0.65).normalize() },
          uSunColor: { value: new THREE.Color('#ffb05e') },
          uDeepColor: { value: new THREE.Color('#041528') },
          uShallowColor: { value: new THREE.Color('#0a3952') },
          uSkyColor: { value: new THREE.Color('#649bd6') },
          uSkyHorizon: { value: new THREE.Color('#f4ae68') },
          uSkyHorizonCool: { value: new THREE.Color('#b6c5d8') },
          uSkyZenith: { value: new THREE.Color('#0d3266') },
          uCameraPos: { value: new THREE.Vector3() },
          uReflectionMap: { value: reflection.texture },
          uReflectionMatrix: { value: reflection.matrix },
          uReflectionReady: { value: 0 },
          uShipSpeed: { value: 0 },
          uWaterLevel: { value: waterLevel },
          uHullCount: { value: hullProfile.length },
          uShipYaw: { value: 0 },
          uShipLift: { value: 0 },
          uBurstImpact: { value: new THREE.Vector2(-1, 0) },
          uWorldOffset: { value: new THREE.Vector2() },
          uHullProfile: { value: Array.from({ length: 32 }, (_, i) => new THREE.Vector3(...(hullProfile[i] ?? [0, 0, 0]))) },
        },
      }),
    [waterLevel, hullProfile, reflection]
  )

  const horizonMaterial = useMemo(() => {
    const far = material.clone()
    far.uniforms = { ...material.uniforms, uHorizon: { value: 1 } }
    return far
  }, [material])

  useEffect(() => {
    window.__sunnyOcean = {
      mesh: meshRef.current,
      horizon: horizonRef.current,
      material,
      size: OCEAN_SIZE_M,
      segments: OCEAN_SEGMENTS,
      reflection,
      get reflectionFrames() { return reflection.frames },
    }
    return () => { delete window.__sunnyOcean; material.dispose(); horizonMaterial.dispose() }
  }, [material, horizonMaterial, reflection])
  useEffect(() => () => horizon.dispose(), [horizon])
  useEffect(() => () => reflection.dispose(), [reflection])

  useFrame((state, delta) => {
    const u = material.uniforms
    u.uTime.value += delta
    u.uShipYaw.value = shipYaw()
    u.uShipLift.value = voyage.lift
    u.uShipSpeed.value = voyage.speed
    const age = BURST.seconds - voyage.burst
    const sinceSplash = age - BURST.charge - BURST.flight
    if (voyage.burst > 0 && sinceSplash >= 0) u.uBurstImpact.value.set(sinceSplash, sampleBurst(age).distance - BURST.range)
    else u.uBurstImpact.value.set(-1, 0)
    u.uWorldOffset.value.set(voyage.east, voyage.south)
    u.uCameraPos.value.copy(state.camera.position)
    if (props.sunDir) u.uSunDir.value.copy(props.sunDir).normalize()
    if (props.shallowColor) u.uShallowColor.value.set(props.shallowColor)
    if (props.deepColor) u.uDeepColor.value.set(props.deepColor)
    if (props.skyColor) u.uSkyColor.value.set(props.skyColor)
    reflection.update(state, [meshRef.current, horizonRef.current], { hullProfile, yaw: u.uShipYaw.value })
    u.uReflectionReady.value = reflection.ready ? 1 : 0
    if (ref) ref.current = u.uTime
  })

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, waterLevel, 0]}
        frustumCulled={false}
      >
        <planeGeometry args={[OCEAN_SIZE_M, OCEAN_SIZE_M, OCEAN_SEGMENTS, OCEAN_SEGMENTS]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh
        ref={horizonRef}
        geometry={horizon}
        material={horizonMaterial}
        position={[0, waterLevel, 0]}
        frustumCulled={false}
      />
    </group>
  )
})

/**
 * Height of the ocean surface at a world position.
 * Mirrors the vertex shader's Gerstner sum so the ship can bob with the waves.
 */
export function waveHeightAt(x, z, time) {
  const waves = [
    { dir: [1.0, 0.35], steep: 0.26, len: 42.0, speed: 1.0 },
    { dir: [-0.6, 1.0], steep: 0.18, len: 23.0, speed: 1.15 },
    { dir: [0.8, -0.7], steep: 0.13, len: 12.0, speed: 1.3 },
    { dir: [-1.0, -0.25], steep: 0.09, len: 6.5, speed: 1.45 },
  ]
  let y = 0
  for (const w of waves) {
    const k = (2 * Math.PI) / w.len
    const c = Math.sqrt(9.8 / k) * w.speed
    const dx = w.dir[0]
    const dz = w.dir[1]
    const len = Math.hypot(dx, dz)
    const ux = dx / len
    const uz = dz / len
    const f = k * (ux * x + uz * z - c * time)
    y += (w.steep / k) * Math.sin(f)
  }
  const edge = Math.min(1, Math.max(0, (Math.max(Math.abs(x), Math.abs(z)) - OCEAN_SIZE_M * 0.35) / (OCEAN_SIZE_M * 0.15)))
  return y * WAVE_SCALE * (1 - edge * edge * (3 - 2 * edge))
}
