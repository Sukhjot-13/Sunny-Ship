/** Actual exported reference refinements: physical openings and moving hardware. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
const glb=readGLB('public/models/sunny.glb'),meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const objects=new Map(),parents=new Map()
function visit(index,parent){
 const node=glb.json.nodes[index],matrix=parent.clone().multiply(nodeMatrix(node))
 if(node.mesh!==undefined){
  const group=new THREE.Group();group.name=node.name
  for(const primitive of glb.json.meshes[node.mesh].primitives){
   const p=readAccessor(glb,primitive.attributes.POSITION),geometry=new THREE.BufferGeometry()
   geometry.setAttribute('position',new THREE.BufferAttribute(p.data,3))
   if(primitive.indices!==undefined)geometry.setIndex(Array.from(readAccessor(glb,primitive.indices).data))
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))
   mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(matrix);group.add(mesh)
  }
  objects.set(node.name,{group,node,index})
  if(node.extras?.sunny_reference_porthole)for(const primitive of glb.json.meshes[node.mesh].primitives){
   const uv=readAccessor(glb,primitive.attributes.TEXCOORD_0).data,pos=readAccessor(glb,primitive.attributes.POSITION).data
   for(let k=0;k<uv.length/2;k++){
    const point=new THREE.Vector3(...pos.slice(k*3,k*3+3)).applyMatrix4(matrix)
    assert(Math.abs(uv[k*2]-point.y)<.0001,'door grain must follow actual vertical planks')
   }
  }
 }
 for(const child of node.children??[]){parents.set(child,index);visit(child,matrix)}
}
for(const index of glb.json.scenes[glb.json.scene??0].nodes)visit(index,new THREE.Matrix4())
const ids=['ForeDoor','ForeDoorStarboard','WomensDoor','AquariumDoor','DiningEntrance','KitchenEntrance','LibraryDoor','PantryOutsideDoor','SickOutsideDoor']
const results=[]
for(const id of ids){
 const spec=meta.interiors.doors.find(d=>d.id===id);assert(spec,id+' metadata')
 const leaf=objects.get(spec.node);assert(leaf?.node.extras.sunny_door_arch,id+' has actual arched leaf')
 assert(leaf.node.extras.sunny_reference_porthole,id+' actual glazed porthole tag')
 const [x,y,z]=spec.pos,angle=spec.rot,r=leaf.node.extras.sunny_reference_porthole_radius
 const centre=new THREE.Vector3(x,z+spec.height*.73,-y)
 const normal=new THREE.Vector3(-Math.sin(angle),0,-Math.cos(angle))
 const lateral=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle))
 for(const dx of [-.5,0,.5]){
  const origin=centre.clone().addScaledVector(lateral,dx*r).addScaledVector(normal,-.25)
  const ray=new THREE.Raycaster(origin,normal,0,.5)
  assert.equal(ray.intersectObjects(leaf.group.children).length,0,id+' porthole must be cut through real leaf')
  const panes=[...objects.values()].filter(o=>o.node.name.startsWith('Sunny_'+id+'_porthole_glass'))
  assert(panes.length===1&&ray.intersectObjects(panes[0].group.children).length>0,id+' real aperture is glazed')
 }
 const hardware=[...objects.values()].filter(o=>o.node.extras.sunny_door_hardware===id)
 assert(hardware.length>=20,id+' two complete porthole rims/bolts and straps')
 for(const part of hardware){
  let parent=parents.get(part.index)
  while(parent!==undefined&&parent!==leaf.index)parent=parents.get(parent)
  assert.equal(parent,leaf.index,id+' fittings inherit the actual moving leaf transform')
 }
 const crown=objects.get('Sunny_'+id+'_frame_head');assert(crown?.node.extras.sunny_door_arch_frame,id+' real fixed arch crown')
 results.push({id,hardware:hardware.length,openingRadius:r})
}
const actual=loadColliders('public/models/sunny.glb'),head=actual.find(o=>o.name==='Sphere001')
const depth=(head.max.x-head.min.x)/(head.max.z-head.min.z)
assert(depth>.64&&depth<.72,'rounded profile retains reference reconstruction envelope, not flat source disk')
assert.equal(actual.filter(o=>/^Rectangle00[2-8](?:\.\d+)?$/.test(o.name)).length,7,'seven retained mane blades')
assert(actual.some(o=>o.name.startsWith('Sunny_Usopp_office_sketch')),'actual branch-office drawing details')
console.log('PASS exported rounded lion, nine arched glazed doors and attached moving fittings',JSON.stringify({depth,doors:results}))
