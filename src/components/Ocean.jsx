import * as THREE from 'three'
import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { WAVE_HEIGHT, WATER_LEVEL } from '../config/shipConfig.js'
import { OCEAN_SIZE_M, OCEAN_HORIZON_SIZE_M, OCEAN_SEGMENTS, WAVE_SCALE } from '../config/renderConfig.js'
import { voyage, shipYaw } from '../systems/navigation.js'
import { createOceanReflection } from '../systems/oceanReflection.js'

/**
 * Physical water shading over the existing navigation-matched wave surface.
 *
 * Four summed Gerstner waves give real displacement + normals, plus fresnel
 * Filtered capillary normals, dielectric Fresnel, GGX sun, planar ship/sky
 * reflection and restrained contact/crest/wake foam. Displacement and hull
 * masking retain their original navigation correspondence.
 */
const vert = /* glsl */ `
  uniform float uTime;
  uniform float uChoppy;
  uniform float uHorizon;
  uniform float uNearEdge;
  uniform vec2 uWorldOffset;
  uniform mat4 uReflectionMatrix;

  // Gerstner wave: returns displacement, accumulates normal via tangents.
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
  varying float vFoam;
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

    // Fade displacement/normals into the flat, very cheap horizon ring.
    float edge = smoothstep(uNearEdge*0.70,uNearEdge,max(abs(wp.x),abs(wp.z)));
    float waveWeight = (1.0-edge)*(1.0-uHorizon);
    vec3 newPos = wp + disp * uChoppy * waveWeight;
    vWorldPos = newPos;
    vReflectCoord = uReflectionMatrix * vec4(newPos,1.0);
    vNormal = normalize(mix(vec3(0.0,1.0,0.0),normalize(cross(binormal, tangent)),uChoppy*waveWeight));

    // crests catch light -> use them as a foam hint
    vFoam = smoothstep(0.15, 0.50, disp.y*uChoppy)*waveWeight;

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

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vFoam;
  varying vec4 vReflectCoord;

  // cheap value-noise for foam breakup
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    // Cut the ocean out of the hull cross-section, including wave excursions.
    float c=cos(uShipYaw),s=sin(uShipYaw);
    vec2 local=vec2(c*vWorldPos.x-s*vWorldPos.z,s*vWorldPos.x+c*vWorldPos.z);
    float hullDistance=1000.0;
    if (uShipLift<0.5 && uHullCount>1 && local.x>=uHullProfile[0].x && local.x<=uHullProfile[31].x) {
    for (int i=0; i<31; i++) {
      if (i >= uHullCount-1) break;
      vec3 a=uHullProfile[i], b=uHullProfile[i+1];
      if (local.x>=a.x && local.x<=b.x) {
        float t=(local.x-a.x)/max(b.x-a.x,0.001);
        vec2 sides=mix(a.yz,b.yz,t);
        if (local.y>=sides.x && local.y<=sides.y) discard;
        hullDistance=min(abs(local.y-sides.x),abs(local.y-sides.y));
        break;
      }
    }
    }
    vec2 surface=vWorldPos.xz+uWorldOffset;
    vec2 rp=surface*3.6+vec2(uTime*0.19,-uTime*0.14);
    // Smooth away ripple frequencies that no longer fit in a screen pixel.
    // Unfiltered normals produced salt-like sparkle during camera movement.
    float footprint=max(length(dFdx(rp)),length(dFdy(rp)));
    float rippleWeight=1.0-smoothstep(0.25,1.0,footprint);
    float rippleX=noise(rp+vec2(0.08,0.0))-noise(rp-vec2(0.08,0.0));
    float rippleZ=noise(rp+vec2(0.0,0.08))-noise(rp-vec2(0.0,0.08));
    vec2 broad=surface*.65+vec2(-uTime*.11,uTime*.08);
    vec2 undulation=vec2(noise(broad+vec2(.12,0))-noise(broad-vec2(.12,0)),noise(broad+vec2(0,.12))-noise(broad-vec2(0,.12)));
    float broadWeight=1.0-smoothstep(.25,1.0,max(length(dFdx(broad)),length(dFdy(broad))));
    vec3 N = normalize(vNormal+vec3(rippleX,0.0,rippleZ)*.42*rippleWeight+vec3(undulation.x,0,undulation.y)*.32*broadWeight);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uSunDir);

    float nv=max(dot(N,V),.001),nl=max(dot(N,L),.001);
    // Analytical deep water: short red absorption length and blue/green scatter.
    // This is a deep ocean model, not a fabricated screen-space depth buffer.
    float path=1.6/max(nv,.18);
    vec3 transmission=exp(-vec3(.45,.065,.025)*path);
    vec3 body=mix(uDeepColor,uShallowColor,smoothstep(-.45,.55,vWorldPos.y-uWaterLevel)*.55);
    body*=mix(vec3(.65),transmission,.35)*(.65+.35*nl);
    float fres=.0204+.9796*pow(1.0-nv,5.0);
    vec3 reflectedDir=reflect(-V,N);
    vec3 sky=mix(uSkyHorizon,uSkyZenith,pow(clamp(reflectedDir.y,0.0,1.0),.62));
    vec2 reflectionUV=vReflectCoord.xy/max(vReflectCoord.w,.001);
    reflectionUV+=N.xz*.018;
    float inside=step(0.0,reflectionUV.x)*step(reflectionUV.x,1.0)*step(0.0,reflectionUV.y)*step(reflectionUV.y,1.0)*step(.001,vReflectCoord.w);
    float border=smoothstep(0.0,.04,min(min(reflectionUV.x,reflectionUV.y),min(1.0-reflectionUV.x,1.0-reflectionUV.y)));
    vec4 reflected=texture2D(uReflectionMap,clamp(reflectionUV,.001,.999),.8);
    float nearReflection=1.0-smoothstep(65.0,130.0,max(abs(vWorldPos.x),abs(vWorldPos.z)));
    vec3 reflection=mix(sky,reflected.rgb,inside*border*reflected.a*uReflectionReady*nearReflection);
    vec3 col=body*(1.0-fres)+reflection*fres;

    // GGX sun with derivative-based roughness to suppress distant sparkles.
    vec3 H = normalize(L + V);
    float nh=max(dot(N,H),0.0),vh=max(dot(V,H),0.0);
    float variance=max(dot(dFdx(N),dFdx(N)),dot(dFdy(N),dFdy(N)));
    float a2=clamp(.006+variance*.6,.006,.15),denom=nh*nh*(a2-1.0)+1.0;
    float D=a2/(3.14159265*denom*denom),k=sqrt(a2)*.5;
    float G=(nv/(nv*(1.0-k)+k))*(nl/(nl*(1.0-k)+k));
    float F=.0204+.9796*pow(1.0-vh,5.0);
    col+=uSunColor*min(D*G*F/(4.0*nv),3.0)*1.6;

    float bubbles=noise(surface*6.0+vec2(uTime*.15,0.0));
    float breakup=noise(surface*1.7-uTime*.14);
    float crest=smoothstep(.75,1.0,vFoam)*smoothstep(.48,.77,breakup)*.22;
    float speed=clamp(abs(uShipSpeed)/5.0,0.0,1.0);
    float contact=(1.0-smoothstep(.04,.48,hullDistance))*smoothstep(.30,.72,bubbles)*(.14+.40*speed);
    float trailing=uShipSpeed>=0.0?local.x-uHullProfile[31].x:uHullProfile[0].x-local.x;
    float spread=1.0+max(trailing,0.0)*.24;
    float wake=(1.0-smoothstep(.2,1.1,abs(abs(local.y)-spread)))*exp(-max(trailing,0.0)*.045)*step(0.0,trailing)*step(trailing,45.0)*speed;
    wake*=smoothstep(.35,.78,breakup)*.36;
    float foam=clamp(crest+(contact+wake)*(1.0-step(.5,uShipLift)),0.0,.65);
    col=mix(col,vec3(.72,.81,.82),foam);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Four flat rectangles around the detailed ocean, only eight triangles. */
function horizonGeometry() {
  const inner=OCEAN_SIZE_M/2,outer=OCEAN_HORIZON_SIZE_M/2
  const positions=[],indices=[]
  for(const [x0,x1,z0,z1] of [[-outer,outer,inner,outer],[-outer,outer,-outer,-inner],
    [-outer,-inner,-inner,inner],[inner,outer,-inner,inner]]) {
    const i=positions.length/3
    positions.push(x0,0,z0,x0,0,z1,x1,0,z1,x1,0,z0)
    indices.push(i,i+1,i+2,i,i+2,i+3)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setIndex(indices)
  return geometry
}

export const Ocean = forwardRef(function Ocean({ waterLevel = WATER_LEVEL, hullProfile = [], ...props }, ref) {
  const meshRef = useRef()
  const horizonRef = useRef()
  const horizon = useMemo(horizonGeometry,[])
  const reflection=useMemo(()=>createOceanReflection(waterLevel),[waterLevel])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uTime: { value: 0 },
          uChoppy: { value: WAVE_SCALE },
          uHorizon: { value: 0 },
          uNearEdge: { value: OCEAN_SIZE_M/2 },
          uSunDir: { value: new THREE.Vector3(0.4, 0.82, 0.4).normalize() },
          uSunColor: { value: new THREE.Color('#fff4dc') },
          uDeepColor: { value: new THREE.Color('#123d4e') },
          uShallowColor: { value: new THREE.Color('#287887') },
          uSkyColor: { value: new THREE.Color('#9fc4e0') },
          uSkyHorizon: { value: new THREE.Color('#cfe3f2') },
          uSkyZenith: { value: new THREE.Color('#2f6fa8') },
          uCameraPos: { value: new THREE.Vector3() },
          uReflectionMap: { value: reflection.texture },
          uReflectionMatrix: { value: reflection.matrix },
          uReflectionReady: { value: 0 },
          uShipSpeed: { value: 0 },
          uWaterLevel: { value: waterLevel },
          uHullCount: { value: hullProfile.length },
          uShipYaw: { value: 0 },
          uShipLift: { value: 0 },
          uWorldOffset: { value: new THREE.Vector2() },
          uHullProfile: { value: Array.from({length:32},(_,i)=>new THREE.Vector3(...(hullProfile[i]??[0,0,0]))) },
        },
      }),
    [waterLevel,hullProfile,reflection]
  )

  const horizonMaterial=useMemo(()=>{
    const far=material.clone()
    far.uniforms={...material.uniforms,uHorizon:{value:1}}
    return far
  },[material])

  useEffect(() => {
    window.__sunnyOcean = { mesh:meshRef.current, horizon:horizonRef.current, material, size:OCEAN_SIZE_M, segments:OCEAN_SEGMENTS, reflection,
      get reflectionFrames(){return reflection.frames} }
    return () => { delete window.__sunnyOcean; material.dispose();horizonMaterial.dispose() }
  },[material,horizonMaterial,reflection])
  useEffect(()=>()=>horizon.dispose(),[horizon])
  useEffect(()=>()=>reflection.dispose(),[reflection])

  useFrame((state, delta) => {
    const u = material.uniforms
    u.uTime.value += delta
    u.uShipYaw.value = shipYaw()
    u.uShipLift.value = voyage.lift
    u.uShipSpeed.value = voyage.speed
    u.uWorldOffset.value.set(voyage.east,voyage.south)
    u.uCameraPos.value.copy(state.camera.position)
    if (props.sunDir) u.uSunDir.value.copy(props.sunDir).normalize()
    if (props.shallowColor) u.uShallowColor.value.set(props.shallowColor)
    if (props.deepColor) u.uDeepColor.value.set(props.deepColor)
    if (props.skyColor) u.uSkyColor.value.set(props.skyColor)
    reflection.update(state,[meshRef.current,horizonRef.current],{hullProfile,yaw:u.uShipYaw.value})
    u.uReflectionReady.value=reflection.ready?1:0
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
    <mesh ref={horizonRef} geometry={horizon} material={horizonMaterial}
      position={[0,waterLevel,0]} frustumCulled={false} />
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
  const edge=Math.min(1,Math.max(0,(Math.max(Math.abs(x),Math.abs(z))-OCEAN_SIZE_M*0.35)/(OCEAN_SIZE_M*0.15)))
  return y * WAVE_SCALE * (1-edge*edge*(3-2*edge))
}
