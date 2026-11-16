/** Diagnostic only: actual exported jaw clearance across candidate hinge angles. */
import * as THREE from 'three'
import fs from 'node:fs'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from '../tests/glb.mjs'
const glb=readGLB('public/models/sunny.glb'),parts=[]
function visit(i,parent){const n=glb.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined&&n.extras?.sunny_jaw)for(const p of glb.json.meshes[n.mesh].primitives){
  const geometry=new THREE.BufferGeometry(),pos=readAccessor(glb,p.attributes.POSITION).data
  geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));if(p.indices!==undefined)geometry.setIndex(Array.from(readAccessor(glb,p.indices).data))
  geometry.applyMatrix4(m);parts.push({name:n.name,geometry,tags:n.extras})
 }
 for(const c of n.children??[])visit(c,m)}
for(const i of glb.json.scenes[glb.json.scene??0].nodes)visit(i,new THREE.Matrix4())
const head=loadColliders('public/models/sunny.glb').find(o=>o.name==='Sphere001'),centre=head.min.clone().add(head.max).multiplyScalar(.5),radius=(head.max.z-head.min.z)/2
for(const degrees of [65,68,70,72,75,80]){
 const meshes=parts.map(part=>{const pivot=part.tags.sunny_pivot,p=new THREE.Vector3(pivot[0],pivot[2],-pivot[1]),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),degrees*Math.PI/180)
  const matrix=new THREE.Matrix4().makeTranslation(...p.toArray()).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(...p.clone().negate().toArray()))
  const mesh=new THREE.Mesh(part.geometry.clone().applyMatrix4(matrix),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.name=part.name;return mesh})
 let hits=0
 for(const height of [-.34,-.46,-.58,-.70,-.78,-.84])for(const side of [-.22,-.15,0,.15,.22]){
  const ray=new THREE.Raycaster(new THREE.Vector3(head.min.x-radius*3,centre.y+height*radius,centre.z+side*radius),new THREE.Vector3(1,0,0),0,30)
  if(ray.intersectObjects(meshes).length)hits++
 }
 const box=new THREE.Box3();for(const mesh of meshes)box.expandByObject(mesh)
 console.log(JSON.stringify({degrees,occludedSamples:hits,belowFaceRadii:(head.min.y-box.min.y)/radius}))
}
