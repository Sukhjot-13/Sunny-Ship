import * as THREE from 'three'
import { WIND } from '../config/shipConfig.js'
import { realisticTextureSet } from './realisticExterior.js'

/**
 * Sail deformation shader + Golden Hour physical canvas lighting.
 *
 * Vertices billow and flutter with live wind; fragment shading layers heavy
 * woven sailcloth relief, sewn panel seams, corner tension creases, fabric-
 * integrated Jolly Roger / stripe dye, warm golden-hour backlighting
 * translucency, and cool cerulean sky fill on shadowed folds.
 */
const vert = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  uniform vec3  uWindDir;
  uniform vec3 uBoundsMin, uBoundsMax;
  uniform mat4 uShipInverse;
  uniform float uProjection;
  uniform float uAuthoredUV;
  uniform float uFlag;
  uniform float uFlagEdge;

  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying float vBelly;
  varying vec2  vUv;

  void main() {
    vec3 authored = (uShipInverse * modelMatrix * vec4(position, 1.0)).xyz;
    vec3 projected = (authored - uBoundsMin) / max(uBoundsMax - uBoundsMin, vec3(0.001));
    vUv = mix(vec2(mix(projected.z, projected.x, uProjection), projected.y), vec2(uv.x, 1.0 - uv.y), uAuthoredUV);
    vec3 pos = position;

    // 0..1 across the sail; anchored at the mast/yard edge
    float across = clamp(mix(vUv.x, abs(vUv.x - uFlagEdge), uFlag), 0.0, 1.0);
    float h = clamp(vUv.y, 0.0, 1.0);

    // Belly profile: 0 at edges, max mid-span
    float bellyAmt = mix(sin(across * 3.14159) * sin(h * 3.14159), pow(across, 0.85), uFlag) * uWind;

    float phase = uTime * mix(1.18, 2.25, uFlag);
    float flap =
      sin(phase + h * 4.5 + across * 1.4) * 0.34 +
      sin(phase * 1.73 + h * 8.0 + across * 5.0) * 0.16;

    vec3 push = normalize(uWindDir + vec3(0.0001));
    // A slow pressure swell on sails and a smaller traveling wave on pennants.
    float pressure = sin(phase * 0.47 - across * 5.0 + h * 1.7) * 0.34;
    float d = (flap + pressure) * bellyAmt * mix(2.2, 0.95, uFlag);

    pos += push * d * 0.85;
    pos.y += d * 0.12 * (1.0 - h);

    vBelly = d;

    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;

    // Approximate the deformed normal from the bulge direction
    vec3 n = normal;
    n = normalize(n + push * d * 0.21);
    vNormal = normalize(mat3(modelMatrix) * n);

    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const frag = /* glsl */ `
  uniform vec3  uColor;
  uniform vec3  uStripeColor;
  uniform vec3  uSunDir;
  uniform vec3  uSunColor;
  uniform vec3  uSkyColor;
  uniform float uDesign;
  uniform sampler2D uEmblem;
  uniform sampler2D uFabricMap;
  uniform sampler2D uFabricNormal;
  uniform sampler2D uFabricRoughness;
  uniform vec2 uClothMetres;
  uniform vec2 uFabricPeriod;

  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying float vBelly;
  varying vec2  vUv;

  float hash2(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
      mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec3 N = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 L = normalize(uSunDir);
    vec3 V = normalize(cameraPosition - vWorldPos);

    // Natural unbleached heavy marine canvas base with subtle warm aging
    vec2 p = vUv;
    vec3 col = uColor * vec3(0.99, 0.96, 0.91);
    float inkMask = 0.0;

    if (uDesign > 1.5 && uDesign < 2.5) {
      // Rich woven crimson-burgundy and weathered charcoal spanker stripes
      float width = max(fwidth(p.x * 7.0), 0.0001);
      float phase = fract(p.x * 7.0);
      float stripe = smoothstep(0.5 - width, 0.5 + width, phase) * (1.0 - smoothstep(1.0 - width, 1.0, phase));
      vec3 charcoal = vec3(0.025, 0.024, 0.029);
      vec3 crimson = uStripeColor * vec3(0.54, 0.42, 0.40);
      col = mix(charcoal, crimson, stripe);
    }

    if ((uDesign > 0.5 && uDesign < 1.5) || uDesign > 2.5) {
      if (uDesign > 2.5) col = vec3(0.022, 0.024, 0.030);
      vec2 size = uDesign > 2.5 ? vec2(0.92, 0.74) : vec2(0.72, 0.54);
      vec2 mark = (p - vec2(0.5, 0.53)) / size + 0.5;
      vec4 ink = texture2D(uEmblem, clamp(mark, 0.0, 1.0));
      float within = step(0.0, mark.x) * step(mark.x, 1.0) * step(0.0, mark.y) * step(mark.y, 1.0);
      inkMask = ink.a * within;
      // Softly warm and ground the painted pigment so it sits in the canvas instead of glowing flat
      vec3 paintedInk = mix(ink.rgb, ink.rgb * vec3(0.94, 0.90, 0.84), 0.35);
      col = mix(col, paintedInk, inkMask * 0.92);
    }

    // Physical-metre woven sailcloth relief & macro fabric aging
    vec2 metres = vUv * uClothMetres;
    vec2 fabricUV = metres / uFabricPeriod;
    vec3 weaveTex = texture2D(uFabricMap, fabricUV).rgb;
    float clothAge = vnoise(metres * 0.22 + vec2(2.3, 1.1)) * 0.6 + vnoise(metres * 0.65) * 0.4;
    col *= mix(vec3(1.0), weaveTex, 0.85 - inkMask * 0.25);
    col *= 0.91 + clothAge * 0.14;
    // Gentle weathering toward the foot and top yard attachment
    float edgeDist = min(min(p.x, 1.0 - p.x), min(p.y, 1.0 - p.y));
    float yardAO = 1.0 - (1.0 - smoothstep(0.0, 0.08, 1.0 - p.y)) * 0.16;
    float footSalt = 1.0 - (1.0 - smoothstep(0.0, 0.10, p.y)) * 0.09;
    col *= yardAO * footSalt;

    // Tangent-space canvas weave + broad tension folds radiating from corners
    vec3 thread = texture2D(uFabricNormal, fabricUV).xyz * 2.0 - 1.0;
    vec3 q1 = dFdx(vWorldPos), q2 = dFdy(vWorldPos);
    vec2 st1 = dFdx(fabricUV), st2 = dFdy(fabricUV);
    vec3 T = q1 * st2.y - q2 * st1.y;
    vec3 B = -q1 * st2.x + q2 * st1.x;
    float inv = inversesqrt(max(max(dot(T, T), dot(B, B)), 0.00000001));
    float handed = sign(st1.x * st2.y - st1.y * st2.x);
    vec3 tDir = T * inv * handed;
    vec3 bDir = B * inv * handed;

    // Subtle billow & clew tension creases
    float cornerTension = (1.0 - smoothstep(0.0, 0.45, edgeDist));
    float foldWave = sin((p.x * 11.0 + p.y * 5.0) * 3.14159 + vBelly * 4.5) * 0.5 +
                     sin((p.x * 6.0 - p.y * 9.0) * 3.14159) * 0.5;
    float foldSlope = cos((p.x * 11.0 + p.y * 5.0) * 3.14159 + vBelly * 4.5) * 0.065 * (0.35 + cornerTension * 0.65);

    N = normalize(mat3(tDir, bDir, N) * vec3(thread.xy * 0.95 + vec2(foldSlope, foldSlope * 0.4), thread.z));
    float rough = texture2D(uFabricRoughness, fabricUV).g;

    // Sewn vertical cloth panels (~2.4m wide like real tall-ship sailcloth), horizontal reef bands & stitching
    float panelWidth = 2.4;
    float panelPhase = fract(metres.x / panelWidth);
    float panelEdge = min(panelPhase, 1.0 - panelPhase) * panelWidth;
    float pixel = max(fwidth(metres.x), 0.0001);
    float seam = 1.0 - smoothstep(0.006, 0.022 + pixel, panelEdge);
    // Subtle overlap shadow on one side of each vertical cloth strip
    float lapShade = (1.0 - smoothstep(0.0, 0.05, panelPhase)) * 0.045;
    float stitchLine = (1.0 - smoothstep(0.001, 0.003 + pixel, abs(panelEdge - 0.030))) * (1.0 - smoothstep(0.002, 0.008, pixel));
    float stitches = 0.5 + 0.5 * sin(metres.y * 420.0);
    float hem = 1.0 - smoothstep(0.028, 0.062, min(min(metres.x, uClothMetres.x - metres.x), min(metres.y, uClothMetres.y - metres.y)));

    // Subtle horizontal reefing band seam across lower third
    float reefDist = abs(p.y - 0.30);
    float reefBand = (1.0 - smoothstep(0.004, 0.012, reefDist)) * 0.06;

    float thickness = clamp(seam * 0.5 + hem * 0.8 + reefBand * 3.0, 0.0, 1.0);
    col *= 1.0 - seam * 0.10 - lapShade - hem * 0.11 - reefBand + stitchLine * stitches * 0.04;
    col *= 1.0 + foldWave * 0.032;

    // --- Golden Hour physically-inspired cloth lighting ---
    float ndl = dot(N, L);
    float frontLit = max(ndl, 0.0);
    float backLit = max(-ndl, 0.0);

    // Warm golden direct key on sunlit face
    vec3 direct = uSunColor * frontLit * 1.28;

    // Warm golden subsurface translucency glowing through woven canvas when backlit
    float viewThru = pow(clamp(dot(V, -L), 0.0, 1.0), 2.4);
    float transAmt = (backLit * 0.52 + viewThru * (0.28 + 0.42 * backLit)) * (1.0 - thickness * 0.55);
    vec3 translucency = uSunColor * vec3(1.06, 0.86, 0.62) * transAmt;

    // Cool cerulean sky hemisphere ambient + warm golden sea-bounce on shadowed creases
    float skyFactor = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 ambient = mix(vec3(0.24, 0.19, 0.16), uSkyColor * vec3(0.46, 0.62, 0.82), skyFactor);

    vec3 lit = col * (ambient + direct + translucency);

    // Soft cotton-fiber grazing sheen catching golden sun rim
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.2);
    lit += uSunColor * fresnel * rough * (0.08 + 0.14 * max(frontLit, viewThru));

    gl_FragColor = vec4(lit, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Build a sail ShaderMaterial. */
export function makeSailMaterial({
  color = '#f2ede0',
  stripe = null,
  design = 'plain',
  bounds = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)),
  projection = 'z',
  authoredUV = false,
  flag = false,
  flagEdge = 0,
  artwork = null,
  sunDir = null,
  skyColor = '#6da4dc',
} = {}) {
  const fabric = realisticTextureSet('canvas'), extent = bounds.getSize(new THREE.Vector3())
  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: WIND.baseStrength },
      uWindDir: { value: new THREE.Vector3(...WIND.direction) },
      uColor: { value: new THREE.Color(color).multiplyScalar(0.92) },
      uStripeColor: { value: new THREE.Color(stripe || '#a31c24') },
      uDesign: { value: { plain: 0, hat: 1, stripes: 2, pirate: 3 }[design] ?? 0 },
      uBoundsMin: { value: bounds.min.clone() },
      uBoundsMax: { value: bounds.max.clone() },
      uShipInverse: { value: new THREE.Matrix4() },
      uProjection: { value: projection === 'x' ? 1 : 0 },
      uAuthoredUV: { value: authoredUV ? 1 : 0 },
      uFlag: { value: flag ? 1 : 0 },
      uFlagEdge: { value: flagEdge },
      uEmblem: { value: emblemTexture(artwork) },
      uFabricMap: { value: fabric.map },
      uFabricNormal: { value: fabric.normalMap },
      uFabricRoughness: { value: fabric.roughnessMap },
      uFabricPeriod: { value: new THREE.Vector2(...fabric.period) },
      uClothMetres: { value: new THREE.Vector2(Math.max(0.1, projection === 'x' ? extent.x : extent.z), Math.max(0.1, extent.y)) },
      uSunDir: { value: sunDir ? sunDir.clone().normalize() : new THREE.Vector3(-0.72, 0.25, -0.65).normalize() },
      uSunColor: { value: new THREE.Color('#ffba6b') },
      uSkyColor: { value: new THREE.Color(skyColor) },
    },
  })
  material.userData.exteriorSurface = 'canvas'
  material.userData.finishVersion = 3
  return material
}

/** Configure the Suspense-loaded shared vector paint; no load during render. */
function emblemTexture(texture) {
  if (!texture) return null
  if (texture.colorSpace !== THREE.SRGBColorSpace) { texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true }
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 8
  texture.generateMipmaps = true
  return texture
}

/** Shared wind state - updated once per frame, read by sails + UI. */
export const windState = {
  strength: WIND.baseStrength,
  direction: new THREE.Vector3(...WIND.direction),
  time: 0,
}

/**
 * Advance the wind simulation. Returns the current state.
 * Two incommensurate sines give natural gusting without random noise.
 */
export function updateWind(t) {
  windState.time = t
  const gust =
    WIND.baseStrength +
    Math.sin(t * WIND.gustFrequency) * WIND.gustAmplitude * 0.5 +
    Math.sin(t * WIND.gustFrequency * 3.7) * WIND.gustAmplitude * 0.22
  windState.strength = Math.max(0.05, gust)

  const veer = Math.sin(t * 0.11) * 0.55
  windState.direction.set(Math.cos(veer), 0, Math.sin(veer) + 0.35).normalize()
  return windState
}
