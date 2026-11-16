/** Actual garden cavity/support, planting arrangement and rounded crown evidence. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
const dir=process.env.REFERENCE_MODELS??'public/models'
const meta=JSON.parse(fs.readFileSync(path.join(dir,'ship-metadata.json'))),glb=readGLB(path.join(dir,'sunny.glb'))
const parts=new Map(),bounds=loadColliders(path.join(dir,'sunny.glb')),floor=meta.interiors.levels.F3G
function visit(index,parent){
 const node=glb.json.nodes[index],matrix=parent.clone().multiply(nodeMatrix(node))
 if(node.mesh!==undefined&&(/Sunny_(RobinGarden|PopGreens)_(planter|soil)$/.test(node.name)||['Sunny_GardenDeck','Tube006'].includes(node.name))){
  const objects=[]
  for(const primitive of glb.json.meshes[node.mesh].primitives){
   const geometry=new THREE.BufferGeometry()
   geometry.setAttribute('position',new THREE.BufferAttribute(readAccessor(glb,primitive.attributes.POSITION).data,3))
   if(primitive.indices!==undefined)geometry.setIndex(Array.from(readAccessor(glb,primitive.indices).data))
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))
   mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(matrix);objects.push(mesh)
  }
  parts.set(node.name,objects)
 }
 for(const child of node.children??[])visit(child,matrix)
}
for(const index of glb.json.scenes[glb.json.scene??0].nodes)visit(index,new THREE.Matrix4())
const down=(name,p)=>new THREE.Raycaster(new THREE.Vector3(...p),new THREE.Vector3(0,-1,0),0,1).intersectObjects(parts.get(name))[0]
const beds=meta.exterior.mechanisms.vegetation?.beds
assert.equal(beds?.length,2,'each physical bed has one metadata record')
const actual=[]
for(const bed of beds){
 const name='Sunny_'+bed.id+'_planter',box=bounds.find(b=>b.name===name),soil=bounds.find(b=>b.name==='Sunny_'+bed.id+'_soil')
 assert(box&&soil,'both physical bed and actual soil are required')
 assert(Math.abs(box.min.y-floor)<.001&&Math.abs(box.max.y-floor-.5)<.001,'bed stands on the garden without floating')
 assert(Math.abs(soil.max.y-floor-.46)<.001&&Math.abs(soil.min.y-floor-.08)<.001,'soil rests on the real base below the rim')
 assert(Math.abs(down(name,[bed.position[0],floor+.6,-bed.position[1]]).point.y-floor-.08)<.001,'actual exported shell has an open cavity rather than a competing solid top')
 for(const dx of [-1.13,1.13])for(const dy of [-.48,.48]){
  const x=bed.position[0]+dx*Math.cos(bed.rotation)-dy*Math.sin(bed.rotation)
  const z=-bed.position[1]-dx*Math.sin(bed.rotation)-dy*Math.cos(bed.rotation)
  assert(down('Sunny_GardenDeck',[x,floor+.05,z]),'every bed corner needs the real visual garden floor')
 }
 const eye=new THREE.Vector3(15.8,floor+1.7,-8.5),target=new THREE.Vector3(bed.position[0],floor+.8,-bed.position[1])
 assert.equal(new THREE.Raycaster(eye,target.clone().sub(eye).normalize(),0,eye.distanceTo(target)).intersectObjects(parts.get('Tube006')).length,0,'native guard must not hide the inboard planting from the actual eye view')
 actual.push(box)
}
assert(Math.abs(Math.cos(beds[0].rotation-beds[1].rotation))<.001,'R15 neighbouring beds form an L')
assert(actual.every(b=>b.min.x>16&&b.max.z<-3),'beds are together inside the mast-side deck, not on opposite perimeter edges')
const mast=bounds.find(b=>b.name==='Sunny_InteriorMainMast')
for(const b of actual){
 const dx=Math.max(mast.min.x-b.max.x,b.min.x-mast.max.x,0),dz=Math.max(mast.min.z-b.max.z,b.min.z-mast.max.z,0)
 assert(Math.hypot(dx,dz)>.68,'planting preserves a full normal-body corridor beside the real mast')
}
for(let i=0;i<3;i++){
 const leaves=bounds.filter(b=>b.name.startsWith('Sunny_Mikan'+i+'_leaves_batch'))
 assert.equal(leaves.length,2,'foliage keeps two bounded material batches')
 const low=Math.min(...leaves.map(b=>b.min.y)),high=Math.max(...leaves.map(b=>b.max.y))
 assert(high-low>1.3&&high-floor>3&&high-floor<3.5,'actual small-tree crowns are rounded through depth within the disclosed height envelope')
}
console.log('PASS actual R15 inboard beds, real cavities/soil/floor support, clear guard/mast approaches and layered bounded mikan crowns')
