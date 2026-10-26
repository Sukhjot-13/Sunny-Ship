/** Physical room finishes, fixed metric projection and original geometry invariants. */
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {interiorTextureSet,interiorSurfaceRole,interiorTileSize,interiorGeometry,realisticInteriorMaterial,usesRealisticInterior,applyInteriorProjection} from '../src/systems/realisticInterior.js'
import {realisticTextureSet,realisticExteriorMaterial} from '../src/systems/realisticExterior.js'
import {createInteriorLightRig} from '../src/systems/interiorLighting.js'

for(const role of ['upholstery','linen','curtain','tile','porcelain','paper']){
 const set=interiorTextureSet(role)
 assert.equal(interiorTextureSet(role),set)
 let lo=255,hi=0
 for(const [key,t] of Object.entries({map:set.map,normalMap:set.normalMap,roughnessMap:set.roughnessMap})){
  assert.equal(t.colorSpace,key==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace)
  assert.equal(t.wrapS,THREE.RepeatWrapping);assert.equal(t.wrapT,THREE.RepeatWrapping)
  assert.equal(t.minFilter,THREE.LinearMipmapLinearFilter);assert(t.generateMipmaps&&t.anisotropy>=8)
  assert.equal(t.repeat.x,1/set.period[0]);assert.equal(t.repeat.y,1/set.period[1])
 }
 for(let i=0;i<set.normalMap.image.data.length;i+=4*71){
  const n=Array.from(set.normalMap.image.data.slice(i,i+3),v=>v/255*2-1)
  assert(Math.abs(Math.hypot(...n)-1)<.014);assert(n[2]>0)
  const r=set.roughnessMap.image.data[i];lo=Math.min(lo,r);hi=Math.max(hi,r)
  assert.equal(set.map.image.data[i+3],255)
 }
 assert(hi>lo&&lo>=35&&hi<=255,`${role}: missing or invalid roughness`)
}
assert.equal(interiorTextureSet('grain'),realisticTextureSet('grain'),'reuse immutable wood data only')
const source=new THREE.MeshStandardMaterial({name:'Sunny_timber',color:'#b17846'}),before=source.toJSON()
const inside=realisticInteriorMaterial(source),outside=realisticExteriorMaterial(source)
assert(inside.isMeshPhysicalMaterial&&inside!==outside)
assert.equal(inside.color.getHex(),source.color.getHex());assert.deepEqual(source.toJSON(),before)
assert.equal(inside,realisticInteriorMaterial(source));assert.equal(inside.opacity,1);assert(!inside.transparent)
assert.notEqual(inside,realisticInteriorMaterial(source,{uv:true}),'authored UV and projection programs must be distinct')
assert.notEqual(inside,realisticInteriorMaterial(new THREE.MeshStandardMaterial({name:source.name,color:'white'})))
const mat=name=>new THREE.MeshStandardMaterial({name:'Sunny_'+name,color:'#a9c0a4'})
for(const [label,name,role] of [
 ['tile_ivory','Sunny_InteriorFloor_F3_bath','tile'],['linen','bed','linen'],['cloth_aqua','Sunny_Aquarium_curtain','curtain'],
 ['upholstery_teal','chair','upholstery'],['paper','book_page','paper'],['white','Sunny_Wash_sink','porcelain'],
 ['steel','workshop','steel'],['brass','tap','brass'],['glass','window','glass'],['glass','Wash_mirror','mirror'],
 ['tankwater','aquarium','water'],['lamp_glow','RoomLamp_bulb','lamp'],['black','cannon_barrel','iron'],
])assert.equal(interiorSurfaceRole(mat(label),{name}),role)
const lamp=realisticInteriorMaterial(mat('lamp_glow'))
assert(lamp.emissiveIntensity>1&&lamp.emissive.getHex()!==0&&!lamp.transparent)
for(const role of ['glass','tankwater']){
 const m=realisticInteriorMaterial(mat(role));assert(m.transparent&&!m.depthWrite&&m.opacity>.1&&m.opacity<.3)
}
assert(usesRealisticInterior({sunny_authored:true,sunny_feature:'Library'},'Sunny_Library_table'))
assert(usesRealisticInterior({sunny_authored:true,sunny_fabric:true},'Sunny_Aquarium_curtain'))
assert(!usesRealisticInterior({sunny_authored:true,sunny_feature:'Anchor'},'Sunny_Anchor'))
assert(!usesRealisticInterior({sunny_authored:true},'NativeHull'))
assert.equal(interiorTileSize('Sunny_AquariumFloor_shell'),.75)
assert.equal(interiorTileSize('Sunny_InteriorFloor_F3_library'),.65)
assert.equal(interiorTileSize('Sunny_InteriorFloor_F3_bath'),.55)
assert.equal(interiorTileSize('Sunny_InteriorFloor_F2_service'),.55)

// Projection is frozen in physical metres, even with transformed/rotating furniture.
const original=new THREE.BoxGeometry(2,3,4),mesh=new THREE.Mesh(original,source)
mesh.position.set(11,-35,7);mesh.rotation.set(.1,.7,-.2);mesh.scale.set(2,.5,1.3);mesh.updateMatrixWorld(true)
const projected=interiorGeometry(mesh)
assert.notEqual(projected,original);assert(!original.hasAttribute('interiorPosition'))
for(const key of ['position','normal','uv'])assert.deepEqual(projected.getAttribute(key).array,original.getAttribute(key).array,`${key} changed`)
assert.deepEqual(projected.index.array,original.index.array);assert.deepEqual(projected.groups,original.groups)
const p=new THREE.Vector3(),expected=new THREE.Vector3(),n=new THREE.Vector3(),normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
for(let i=0;i<original.attributes.position.count;i++){
 p.fromBufferAttribute(projected.attributes.interiorPosition,i)
 expected.fromBufferAttribute(original.attributes.position,i).applyMatrix4(mesh.matrixWorld)
 assert(p.distanceTo(expected)<.00001)
 n.fromBufferAttribute(projected.attributes.interiorNormal,i)
 expected.fromBufferAttribute(original.attributes.normal,i).applyMatrix3(normalMatrix).normalize()
 assert(n.distanceTo(expected)<.00001)
}
const fixed=projected.attributes.interiorPosition.array.slice();mesh.position.x+=100;mesh.rotation.y+=2;mesh.updateMatrixWorld(true)
assert.deepEqual(projected.attributes.interiorPosition.array,fixed,'texture swims when ship/door moves')
const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>'}
applyInteriorProjection(shader,interiorTextureSet('tile'),.55)
assert.equal(shader.uniforms.iTile.value,.55);assert.equal(shader.uniforms.iAlbedo.value.colorSpace,THREE.SRGBColorSpace)
assert(shader.vertexShader.includes('vInteriorPosition=interiorPosition'))
assert(shader.fragmentShader.includes('normal=interiorRelief(normal,faceDirection)'))
assert(shader.fragmentShader.includes('float roughnessFactor=roughness*'),'replaced Three chunk must retain the required local declaration')
assert(!shader.fragmentShader.includes('uTime'))
assert(!shader.fragmentShader.includes('#include <map_fragment>'))
projected.dispose();original.dispose();source.dispose()
// The two-light budget follows the ship and does not reset at distance crossovers.
const fixtureRecords=[{pos:[-1,0,2],intensity:28,colour:'#ffda98'},{pos:[1,0,2],intensity:28,colour:'#ffda98'},{pos:[50,0,2],intensity:28,colour:'#ffda98'}]
const recordCopy=structuredClone(fixtureRecords),rig=createInteriorLightRig(fixtureRecords),camera=new THREE.PerspectiveCamera()
const owner=new THREE.Group();owner.position.set(20,10,-30);owner.rotation.y=.8;owner.add(rig.group);owner.updateMatrixWorld(true)
const place=x=>{camera.position.set(x,1,0).applyMatrix4(owner.matrixWorld);camera.updateMatrixWorld(true)}
place(-.2);for(let i=0;i<120;i++)rig.update(camera,1/60)
assert.equal(rig.slots.length,2);assert(rig.slots.every(s=>s.light.castShadow&&s.light.shadow.mapSize.x===512))
const firstFixtures=rig.slots.map(s=>s.fixture),firstIntensity=rig.slots.map(s=>s.light.intensity)
assert(firstIntensity.every(i=>i>27&&i<=28))
place(.2);rig.update(camera,1/60)
assert.deepEqual(rig.slots.map(s=>s.fixture),firstFixtures,'distance crossover reassigned the light slots')
assert(rig.slots.every((s,i)=>s.light.intensity>=firstIntensity[i]-.001),'distance crossover extinguished a nearby lamp')
for(const {light,target,fixture} of rig.slots){
 assert(light.position.distanceTo(new THREE.Vector3(fixture.pos[0],fixture.pos[2],-fixture.pos[1]))<.0001)
 assert.equal(target.position.y,light.position.y-1)
}
place(100);for(let i=0;i<180;i++)rig.update(camera,1/60)
assert(rig.slots.every(s=>s.light.intensity<.00001),'distant lamp budget did not fade out')
assert.deepEqual(fixtureRecords,recordCopy,'light selection mutated metadata')
let disposed=0;for(const s of rig.slots){s.light.shadow.map=new THREE.WebGLRenderTarget(8,8);s.light.shadow.map.addEventListener('dispose',()=>disposed++)}
rig.dispose();assert.equal(disposed,2);assert.equal(rig.group.children.length,0)
console.log('PASS: six interior map sets, physical projection/source invariants, palette/cache isolation, patterned floor grids and fixture finishes')
