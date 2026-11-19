import * as THREE from 'three'

const caustics = `
 float aquariumCaustic(vec2 p,float t) {
   vec2 warped=p+vec2(sin(p.y*1.34+t*.52),sin(p.x*1.11-t*.43))*.63;
   float sheet=sin(warped.x*3.6+warped.y*1.63+t*.66)+sin(warped.y*4.2-warped.x*1.82-t*.54);
   float crossSheet=sin(warped.x*2.4-warped.y*2.9-t*.25);
   float width=max(fwidth(sheet)*1.15,.018);
   return (1.-smoothstep(.018,.115+width,abs(sheet)))*(.43+.57*pow(max(0.,crossSheet),2.));
 }
`

const backdrop = `
 float beam=sin(aPosition.z*.83+aPosition.x*.63+(aPosition.y-aFloor)*.96+aTime*.34);
 float shafts=pow(max(0.,beam),3.6)*.76+pow(max(0.,sin(aPosition.z*1.79-aPosition.x*.22+(aPosition.y-aFloor)*1.18-aTime*.15)),6.5)*.34;
 float level=smoothstep(.65,4.65,aPosition.y-aFloor);
 float ripples=aquariumCaustic(aPosition.xz+vec2((aPosition.y-aFloor)*.6,0.),aTime);
 float drift=sin(aPosition.z*3.21+aPosition.x*1.71+aPosition.y*4.87+aTime*.14)*sin(aPosition.z*.92-aPosition.y*13.26+aTime*.29);
 // Deep oceanic sapphire at tank bed warming to luminous turquoise-gold sunlit surface canopy
 vec3 deepWater=vec3(.006,.075,.145);
 vec3 upperWater=vec3(.045,.43,.62);
 diffuseColor.rgb=mix(deepWater,upperWater,level)
  +vec3(.16,.52,.50)*(shafts*(.46+.46*level)+ripples*.13*level+.03*drift)
  +vec3(.14,.11,.04)*shafts*pow(level,2.2)*.42;
`

const glass = `
 vec3 sight=normalize(cameraPosition-aWorld);
 float glint=pow(1.-abs(dot(normalize(aNormal),sight)),3.2);
 float ribbon=aquariumCaustic(aPosition.xz+vec2((aPosition.y-aFloor)*.68,0.),aTime);
 diffuseColor.rgb=mix(vec3(.14,.62,.76),vec3(.88,.76,.56),glint*.28);
 diffuseColor.a=.032+.14*glint+.028*ribbon;
`

const habitat = `
 float shadow=.52+.48*max(0.,normalize(aNormal).y);
 float ripple=aquariumCaustic(aPosition.xz+vec2(aPosition.y*.43,0.),aTime);
 diffuseColor.rgb=mix(diffuseColor.rgb*shadow,vec3(.042,.27,.36),.28)+vec3(.10,.22,.22)*ripple*.44;
`

const canopy = `
 float wave=aquariumCaustic(aWorld.xz*.9,aTime);
 diffuseColor.rgb=vec3(.048,.35,.48)+vec3(.12,.30,.34)*wave;
`

export function createAquariumFinish(layout) {
  const materials = new Map(), time = { value: 0 }, floor = { value: layout?.centre?.[2] ?? -40.551 }
  const mast = { value: new THREE.Vector2(layout?.centre[0] ?? 18.795, -(layout?.centre[1] ?? 1.287)) }
  const program = { backdrop, glass, canopy, sand: habitat, reef: habitat, fish: habitat }
  const haloTexture = layout ? createHaloTexture() : null
  function materialFor(source, role, swim) {
    const phase = swim?.[0] ?? 0, speed = swim?.[1] ?? 0
    const key = [source.name, role, phase, speed].join(':')
    if (materials.has(key)) return materials.get(key)
    const material = new THREE.MeshBasicMaterial({ name: source.name, color: source.color.clone(), side: THREE.DoubleSide })
    if (role === 'volume') { material.visible = false }
    if (role === 'lamp') { material.color.setRGB(5.6, 2.5, 0.42) }
    if (role === 'glass') {
      material.side = THREE.FrontSide; material.transparent = true; material.depthWrite = false
    }
    if (program[role]) {
      material.customProgramCacheKey = () => `aquarium-v2:${role}`
      material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, { aTime: time, aFloor: floor, aPhase: { value: phase }, aSpeed: { value: speed } })
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
         varying vec3 aPosition,aWorld,aNormal;
         uniform float aTime,aPhase,aSpeed;`)
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
         ${role === 'fish' ? `transformed.x+=.045*sin(aTime*aSpeed+aPhase+position.z*2.7);
           transformed.y+=.072*sin(aTime*aSpeed*.79+aPhase+position.x*1.34);
           transformed.z+=.095*cos(aTime*aSpeed+aPhase);` : ''}
         aPosition=transformed;aWorld=(modelMatrix*vec4(transformed,1.)).xyz;
         aNormal=normalize(mat3(modelMatrix)*normal);`)
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
         varying vec3 aPosition,aWorld,aNormal;
         uniform float aTime,aFloor;
         ${caustics}`)
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
         ${program[role]}`)
      }
    }
    material.userData.aquariumFinish = role
    materials.set(key, material)
    return material
  }
  function addHalo(root, position) {
    if (!haloTexture) return
    const key = 'halo'
    if (!materials.has(key)) materials.set(key, new THREE.SpriteMaterial({
      map: haloTexture, color: '#ffbe55', transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.78, toneMapped: false,
    }))
    const sprite = new THREE.Sprite(materials.get(key)); sprite.position.copy(position)
    sprite.raycast = () => {}
    sprite.scale.set(1.85, 1.85, 1); sprite.name = 'AquariumWarmHalo'; root.add(sprite)
  }
  return { materialFor, addHalo, time, mast, dispose() { for (const material of materials.values()) material.dispose(); haloTexture?.dispose() } }
}

function createHaloTexture() {
  const size = 64, data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1), index = 4 * (y * size + x)
    data.set([255, 240, 188, Math.round(225 * Math.exp(-radius * radius * 6.5) * Math.max(0, 1 - radius))], index)
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearFilter; texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true
  return texture
}

export function applyAquariumFloorLight(shader, aquarium) {
  shader.uniforms.aTime = aquarium.time
  shader.uniforms.aMast = aquarium.mast
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
   uniform float aTime;
   uniform vec2 aMast;
   ${caustics}`)
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
   float distanceToMast=length((vInteriorPosition.xz-aMast)*vec2(1.,.9));
   float glow=exp(-distanceToMast*distanceToMast*.16);
   float soak=smoothstep(aMast.x-6.2,aMast.x+.5,vInteriorPosition.x)*(.62+.38*smoothstep(1.8,8.,abs(vInteriorPosition.z-aMast.y)));
   float pattern=aquariumCaustic(vInteriorPosition.xz*.48,aTime);
   diffuseColor.rgb*=vec3(.44,.59,.74)+vec3(.62,.34,.11)*glow;
   diffuseColor.rgb+=vec3(.028,.125,.185)*soak*(.28+pattern*.72);`)
}
