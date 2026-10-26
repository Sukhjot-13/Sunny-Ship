/** Physical exterior data, scope isolation and reflection resource/state guards. */
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {realisticTextureSet,realisticExteriorMaterial,usesRealisticExterior} from '../src/systems/realisticExterior.js'
import {exteriorMaterial} from '../src/systems/exteriorMaterials.js'
import {makeSailMaterial} from '../src/systems/sails.js'
import {createOceanReflection} from '../src/systems/oceanReflection.js'

for(const role of ['boards','grain','paintedBoards','paint','bark','metal','iron','rope','lawn','leaf','fruit','pot','soil','canvas','roof']){
 const set=realisticTextureSet(role)
 assert.equal(realisticTextureSet(role),set,'shared immutable maps must be cached')
 for(const [key,t] of Object.entries({map:set.map,normalMap:set.normalMap,roughnessMap:set.roughnessMap})){
  assert.equal(t.wrapS,THREE.RepeatWrapping);assert.equal(t.wrapT,THREE.RepeatWrapping)
  assert.equal(t.minFilter,THREE.LinearMipmapLinearFilter);assert(t.generateMipmaps&&t.anisotropy>=8)
  assert.equal(t.colorSpace,key==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace)
  assert.equal(t.repeat.x,1/set.period[0]);assert.equal(t.repeat.y,1/set.period[1])
  assert.equal(t.image.data.length,set.size*set.size*4)
 }
 let roughMin=255,roughMax=0
 for(let i=0;i<set.normalMap.image.data.length;i+=4*97){
  const n=Array.from(set.normalMap.image.data.slice(i,i+3),v=>v/255*2-1)
  assert(Math.abs(Math.hypot(...n)-1)<.014,`${role}: encoded normal is not unit length`)
  assert(n[2]>0,`${role}: invalid tangent normal`)
  const r=set.roughnessMap.image.data[i+1];roughMin=Math.min(r,roughMin);roughMax=Math.max(r,roughMax)
  assert.equal(set.map.image.data[i+3],255,'opaque finish must not conceal geometry')
 }
 assert(roughMin>=40&&roughMax<=255,`${role}: roughness outside supported range`)
 if(role!=='lawn'&&role!=='soil')assert(roughMax>roughMin,`${role}: missing surface variation`)
}
assert.throws(()=>realisticTextureSet('missing'))
const timber=new THREE.MeshStandardMaterial({name:'Sunny_timber',color:'#956140'})
const source=timber.toJSON(),outside=realisticExteriorMaterial(timber,{wood:'boards'}),inside=exteriorMaterial(timber,{wood:'boards'})
assert.deepEqual(timber.toJSON(),source,'exterior finish mutated the source material')
assert(outside.isMeshPhysicalMaterial&&outside!==inside)
assert.equal(outside.color.getHex(),timber.color.getHex(),'source palette changed')
assert.equal(outside.opacity,1);assert(!outside.transparent)
assert.equal(realisticExteriorMaterial(timber,{wood:'boards'}),outside)
assert.notEqual(realisticExteriorMaterial(timber,{wood:'grain'}),outside)
assert.notEqual(realisticExteriorMaterial(new THREE.MeshStandardMaterial({name:'Sunny_timber',color:'#ffffff'}),{wood:'boards'}),outside)
const uv={sunny_uv_space:'metres'}
assert(usesRealisticExterior(uv,'NativeHull'))
assert(usesRealisticExterior({...uv,sunny_feature:'Helm'},'Sunny_Helm_wheel'))
assert(usesRealisticExterior(uv,'Sunny_Library_lining_glass0'))
for(const name of ['Sunny_InteriorMainMast','Sunny_ForeF1_lining','Sunny_Dining_table_top','Sunny_Womens_bed_frame'])assert(!usesRealisticExterior(uv,name),`${name}: room scope changed`)
assert(!usesRealisticExterior({},'NativeHull'),'unmapped meshes must retain original path')
const bounds=new THREE.Box3(new THREE.Vector3(-1,0,-3),new THREE.Vector3(2,5,4))
const sail=makeSailMaterial({bounds,authoredUV:true,design:'hat'})
assert.deepEqual(sail.uniforms.uClothMetres.value.toArray(),[7,5])
assert.equal(sail.uniforms.uFabricMap.value,realisticTextureSet('canvas').map)
assert.equal(sail.uniforms.uAuthoredUV.value,1);assert.equal(sail.uniforms.uDesign.value,1)
assert.equal(sail.side,THREE.DoubleSide);sail.dispose()

// Exercise the real Reflector camera math without needing a GPU for state guards.
const reflection=createOceanReflection(-10),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.1,1000)
camera.position.set(0,2,15);camera.lookAt(0,-10,0);camera.updateMatrixWorld(true)
const near=new THREE.Mesh(),far=new THREE.Mesh();far.visible=false
let target=null,calls=0,mainHooks=0,throwRender=false,clearAlpha=1
const before=()=>mainHooks++;scene.onBeforeRender=before
const gl={extensions:{has:()=>true},xr:{enabled:true},shadowMap:{autoUpdate:true},autoClear:true,
 state:{buffers:{depth:{setMask(){}}}},getRenderTarget:()=>target,setRenderTarget:t=>{target=t},getClearAlpha:()=>clearAlpha,setClearAlpha:a=>{clearAlpha=a},
 render(renderScene,mirror){
  calls++;assert.equal(near.visible,false);assert.equal(far.visible,false)
  assert.equal(this.xr.enabled,false);assert.equal(this.shadowMap.autoUpdate,false)
  assert.equal(clearAlpha,0,'unrendered sky pixels must fall back to analytical sky')
  assert(Math.abs(mirror.position.y+22)<.00001,'camera is not mirrored across the actual water level')
  assert(mirror.projectionMatrix.elements.every(Number.isFinite))
  renderScene.onBeforeRender(this,renderScene,mirror);assert.equal(mainHooks,0)
  if(throwRender)throw Error('fixture render failure')
 }}
assert(reflection.update({gl,scene,camera},[near,far]));assert.equal(calls,1);assert.equal(reflection.frames,1)
assert(reflection.ready&&reflection.matrix.elements.every(Number.isFinite))
for(let i=0;i<3;i++)assert(!reflection.update({gl,scene,camera},[near,far]))
throwRender=true;assert.throws(()=>reflection.update({gl,scene,camera},[near,far]),/fixture render failure/)
assert.equal(scene.onBeforeRender,before);assert.equal(near.visible,true);assert.equal(far.visible,false)
assert.equal(target,null);assert(gl.xr.enabled&&gl.shadowMap.autoUpdate)
assert.equal(clearAlpha,1)
throwRender=false
camera.position.set(0,2,0);camera.lookAt(0,2,-15);camera.updateMatrixWorld(true)
assert(!reflection.update({gl,scene,camera},[near,far],{hullProfile:[[-5,-5,5],[5,-5,5]]}),'level view from inside the hull wastes a planar pass')
assert(!reflection.ready,'a skipped view must use analytic sky, not a stale camera image')
camera.position.set(0,2,15);camera.lookAt(0,-10,0);camera.updateMatrixWorld(true)
assert(reflection.update({gl,scene,camera},[near,far]),'visible water must receive a fresh reflection immediately')
camera.lookAt(0,2,0);camera.updateMatrixWorld(true)
assert(!reflection.update({gl,scene,camera},[near,far],{hullProfile:[[-20,-3,3],[20,-3,3]],yaw:Math.PI/2}),'inside-hull budget must rotate with ship yaw')
assert(!reflection.ready)
assert(reflection.update({gl,scene,camera},[near,far],{hullProfile:[[-20,-3,3],[20,-3,3]],yaw:0}),'outside-hull view must resume immediately')
camera.position.y=-11;assert(!reflection.update({gl,scene,camera},[near,far]))
reflection.dispose();timber.dispose()
console.log('PASS: 15 physical exterior finishes, source/room isolation, canvas metre UVs, mirrored camera and render-state restoration')
