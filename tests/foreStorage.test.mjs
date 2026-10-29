/** C01 real storage enclosure: actual visual first hits and matching physical wall tops. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
const source=process.argv[2]||'public/models/sunny.glb'
const collision=process.argv[3]||'public/models/sunny-collision.glb'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const gltf=readGLB(source),meshes=[],walls=[]
/** Resolve visual triangles and actual world bounds; retain all fore storage occluders. */
function visit(index,parent){
 const n=gltf.json.nodes[index],world=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined)for(const prim of gltf.json.meshes[n.mesh].primitives){
  const a=readAccessor(gltf,prim.attributes.POSITION),g=new THREE.BufferGeometry()
  g.setAttribute('position',new THREE.BufferAttribute(a.data,3))
  if(prim.indices!==undefined)g.setIndex(Array.from(readAccessor(gltf,prim.indices).data))
  const bounds=new THREE.Box3().setFromBufferAttribute(g.attributes.position).applyMatrix4(world)
  if(bounds.max.x < -37 || bounds.min.x > -9 || bounds.max.y < -48 || bounds.min.y > -39){g.dispose();continue}
  const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.name=n.name;mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(world)
  meshes.push(mesh)
  if(n.name.startsWith('Sunny_InteriorWall_B1_')&&bounds.max.x < -9.03)walls.push({name:n.name,bounds})
 }
 for(const c of n.children??[])visit(c,world)
}
for(const i of gltf.json.scenes[gltf.json.scene??0].nodes)visit(i,new THREE.Matrix4())
const ceiling=meta.interiors.levels.F1-.36
assert(walls.length>80,'actual fore storage perimeter retained')
for(const w of walls)assert(Math.abs(w.bounds.max.y-ceiling)<.002,`${w.name} must meet actual B1 ceiling`)
const physical=loadColliders(collision).filter(c=>c.name.includes('InteriorWall_B1_')&&c.max.x < -9.03)
assert(physical.length>=walls.length,'physical storage perimeter retained')
for(const w of physical)assert(Math.abs(w.max.y-ceiling)<.002,`${w.name} physical wall must meet ceiling`)
const camera=new THREE.PerspectiveCamera(62,1440/900,.08,800);camera.position.set(-15,-45.451,-1.287);camera.lookAt(-23,-46.301,4);camera.updateMatrixWorld(true)
const ray=new THREE.Raycaster(),results=[]
for(const [x,y] of [[112,105],[100,117],[676,165],[688,165],[700,177],[514,444],[500,460],[530,460],[520,452]]){
 ray.setFromCamera(new THREE.Vector2(x/1440*2-1,1-y/900*2),camera)
 const h=ray.intersectObjects(meshes,false)[0]
 assert(h,`storage pixel ${x},${y} retains a real surface`)
 assert(!/^(Circle038|Line004|Box118|Box119)(\.|$)/.test(h.object.name),`external trim remains visible at ${x},${y}: ${h.object.name}`)
 results.push({pixel:[x,y],name:h.object.name,point:h.point.toArray()})
}
// Extra sidewall/ceiling views independently exposed Line004 and the Lawn
// underside that the original main camera did not include.
for (const {eye,target,pixels} of [
 {eye:[-19,-45.451,8],target:[-19,-40.9,14],pixels:[[100,100]]},
 {eye:[-25,-45.451,5],target:[-25,-46.65,10.6],pixels:[[100,300],[200,200]]},
 {eye:[-19,-45.451,-9],target:[-19,-40.9,-16],pixels:[[1340,100]]},
]) {
 camera.position.fromArray(eye);camera.lookAt(...target);camera.updateMatrixWorld(true)
 for(const [x,y] of pixels){
  ray.setFromCamera(new THREE.Vector2(x/1440*2-1,1-y/900*2),camera)
  const h=ray.intersectObjects(meshes,false)[0]
  assert(h,'extra storage junction retains a real surface')
  assert(!/^(Circle038|Line004|Line007|Box118|Box119)(\.|$)/.test(h.object.name)&&h.object.name!=='Sunny_Lawn',`unresolved storage junction: ${h.object.name}`)
  results.push({eye,pixel:[x,y],name:h.object.name,point:h.point.toArray()})
 }
}
console.log('PASS C01 storage wall/ceiling visual and physical join, and attributed fragment pixels',JSON.stringify({source,ceiling,walls:walls.length,physical:physical.length,results}))
