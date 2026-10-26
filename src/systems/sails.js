import * as THREE from 'three'
import { WIND } from '../config/shipConfig.js'
import { realisticTextureSet } from './realisticExterior.js'

/**
 * Sail deformation shader + shared wind state.
 *
 * Each sail is a tall thin plane. Rather than simulate cloth, vertices are
 * displaced in the vertex shader by a travelling wave whose amplitude is
 * driven by the live wind strength - so the sails belly out and flutter with
 * the gusts, and flatten when the wind drops.
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
    vec3 projected = (authored-uBoundsMin) / max(uBoundsMax-uBoundsMin, vec3(0.001));
    vUv = mix(vec2(mix(projected.z, projected.x, uProjection), projected.y), vec2(uv.x,1.0-uv.y), uAuthoredUV);
    vec3 pos = position;

    // 0..1 across the sail; anchored at the mast edge (u = 0)
    float across = clamp(mix(vUv.x,abs(vUv.x-uFlagEdge),uFlag), 0.0, 1.0);
    float h = clamp(vUv.y, 0.0, 1.0);

    // belly profile: 0 at the mast, max mid-span
    float bellyAmt = mix(sin(across * 3.14159)*sin(h*3.14159),pow(across,0.85),uFlag)*uWind;

    float phase = uTime * 1.5;
    float flap =
      sin(phase + h * 4.5 + across * 1.4) * 0.34 +
      sin(phase * 1.73 + h * 8.0 + across * 5.0) * 0.16;

    vec3 push = normalize(uWindDir + vec3(0.0001));
    float d = flap * bellyAmt * 0.30;

    pos += push * d * 0.85;
    pos.y += d * 0.12 * (1.0 - h);

    vBelly = d;

    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;

    // approximate the deformed normal from the bulge direction
    vec3 n = normal;
    n = normalize(n + push * d * 0.8);
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

  void main() {
    vec3 N = normalize(vNormal)*(gl_FrontFacing?1.0:-1.0);
    vec3 L = normalize(uSunDir);
    vec3 V = normalize(cameraPosition - vWorldPos);

    // Separate reference designs: white canvas, straw hat, red/black aft sail,
    // and the Straw Hats' black Jolly Roger. Projection ignores unreliable FBX UVs.
    vec3 col = uColor;
    vec2 p = vUv;
    if (uDesign > 1.5 && uDesign < 2.5) {
      float width = max(fwidth(p.x*7.0),0.0001);
      float phase = fract(p.x*7.0);
      float stripe = smoothstep(0.5-width,0.5+width,phase)*(1.0-smoothstep(1.0-width,1.0,phase));
      col = mix(vec3(0.025,0.025,0.032), uStripeColor, stripe);
    }
    if ((uDesign > 0.5 && uDesign < 1.5) || uDesign > 2.5) {
      if(uDesign>2.5)col=vec3(0.018,0.021,0.028);
      vec2 size=uDesign>2.5?vec2(0.92,0.74):vec2(0.72,0.54);
      vec2 mark=(p-vec2(0.5,0.53))/size+0.5;
      vec4 ink=texture2D(uEmblem,clamp(mark,0.0,1.0));
      float within=step(0.0,mark.x)*step(mark.x,1.0)*step(0.0,mark.y)*step(mark.y,1.0);
      col=mix(col,ink.rgb,ink.a*within);
    }

    // Canvas threads use actual metres, independently of the normalized artwork.
    vec2 metres=vUv*uClothMetres,fabricUV=metres/uFabricPeriod;
    col*=texture2D(uFabricMap,fabricUV).rgb;
    vec3 thread=texture2D(uFabricNormal,fabricUV).xyz*2.0-1.0;
    vec3 q1=dFdx(vWorldPos),q2=dFdy(vWorldPos);
    vec2 st1=dFdx(fabricUV),st2=dFdy(fabricUV);
    vec3 T=q1*st2.y-q2*st1.y,B=-q1*st2.x+q2*st1.x;
    float inv=inversesqrt(max(max(dot(T,T),dot(B,B)),.00000001));
    float handed=sign(st1.x*st2.y-st1.y*st2.x);
    N=normalize(mat3(T*inv*handed,B*inv*handed,N)*vec3(thread.xy*.7,thread.z));
    float rough=texture2D(uFabricRoughness,fabricUV).g;
    // Sewn vertical panels, edge reinforcement and filtered paired stitching.
    float panelEdge=min(fract(metres.x/.9),1.0-fract(metres.x/.9))*.9;
    float pixel=max(fwidth(metres.x),.0001);
    float seam=1.0-smoothstep(.004,.014+pixel,panelEdge);
    float stitchLine=(1.0-smoothstep(.001,.002+pixel,abs(panelEdge-.021)))*(1.0-smoothstep(.002,.006,pixel));
    float stitches=.5+.5*sin(metres.y*628.3185);
    float hem=1.0-smoothstep(.018,.035,min(min(metres.x,uClothMetres.x-metres.x),min(metres.y,uClothMetres.y-metres.y)));
    col*=1.0-seam*.09-hem*.08+stitchLine*stitches*.04;

    // --- lighting: cloth is thin, so light both sides
    float lam = abs(dot(N, L));
    col *= 0.72 + lam * 0.68;
    col *= vec3(0.86) + uSkyColor * 0.14;

    // --- translucency when backlit
    float trans = pow(max(dot(-N, L), 0.0), 2.0);
    col += col * uSunColor * trans * 0.22;

    // --- sheen along the bulge
    vec3 H = normalize(L + V);
    col += uSunColor * pow(1.0-max(dot(N,V),0.0),5.0) * rough * .04;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Build a sail ShaderMaterial. */
export function makeSailMaterial({
  color = '#f2ede0',
  stripe = null,
  design = 'plain',
  bounds = new THREE.Box3(new THREE.Vector3(0,0,0),new THREE.Vector3(1,1,1)),
  projection = 'z',
  authoredUV = false,
  flag = false,
  flagEdge = 0,
  artwork = null,
  sunDir = null,
  skyColor = '#9fc4e0',
} = {}) {
  const fabric=realisticTextureSet('canvas'),extent=bounds.getSize(new THREE.Vector3())
  const material=new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: WIND.baseStrength },
      uWindDir: { value: new THREE.Vector3(...WIND.direction) },
      uColor: { value: new THREE.Color(color).multiplyScalar(0.92) },
      uStripeColor: { value: new THREE.Color(stripe || '#b91d25') },
      uDesign: { value: {plain:0,hat:1,stripes:2,pirate:3}[design] ?? 0 },
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
      uClothMetres: { value: new THREE.Vector2(Math.max(.1,projection==='x'?extent.x:extent.z),Math.max(.1,extent.y)) },
      uSunDir: { value: sunDir ? sunDir.clone().normalize() : new THREE.Vector3(0.4, 0.82, 0.4) },
      uSunColor: { value: new THREE.Color('#fff4dc') },
      uSkyColor: { value: new THREE.Color(skyColor) },
    },
  })
  material.userData.exteriorSurface='canvas';material.userData.finishVersion=2
  return material
}

/** Configure the Suspense-loaded shared vector paint; no load during render. */
function emblemTexture(texture){
 if(!texture)return null
 if(texture.colorSpace!==THREE.SRGBColorSpace){texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true}
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=8;texture.generateMipmaps=true
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
