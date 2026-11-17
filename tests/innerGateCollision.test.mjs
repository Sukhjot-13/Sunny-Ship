/** Real slat coverage during motion and the independently observed Dock phantom. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix} from './glb.mjs'
import {innerGateSections} from '../src/systems/innerGateCollision.js'
import {shutterPose} from '../src/systems/navigation.js'
const glb=readGLB('public/models/sunny.glb'),meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')),gates=[]
function visit(index,parent){
 const node=glb.json.nodes[index],matrix=parent.clone().multiply(nodeMatrix(node))
 if(node.mesh!==undefined&&node.extras?.sunny_inner_gate){
  const points=[],triangles=[]
  for(const primitive of glb.json.meshes[node.mesh].primitives){
   const values=readAccessor(glb,primitive.attributes.POSITION).data,base=points.length
   for(let i=0;i<values.length;i+=3)points.push(new THREE.Vector3(...values.slice(i,i+3)).applyMatrix4(matrix))
   const ids=primitive.indices===undefined?Array.from({length:values.length/3},(_,i)=>i):readAccessor(glb,primitive.indices).data
   for(let i=0;i<ids.length;i+=3)triangles.push([0,1,2].map(k=>points[base+ids[i+k]]))
  }
  gates.push({name:node.name,tags:node.extras,points,triangles,box:new THREE.Box3().setFromPoints(points)})
 }
 for(const child of node.children??[])visit(child,matrix)
}
for(const index of glb.json.scenes[glb.json.scene??0].nodes)visit(index,new THREE.Matrix4())
assert.equal(gates.length,84,'all six fourteen-slat shutters are required')
const centre=new THREE.Vector3(meta.interiors.dockCentre[0],meta.interiors.dockCentre[2],-meta.interiors.dockCentre[1])
let samples=0
for(const gate of gates){
 const sections=innerGateSections(gate.points.map(p=>p.toArray()),gate.tags.sunny_inner_angle)
 assert(sections.length>=2&&sections.length<=11,'physical tangent sections stay bounded')
 for(const angle of [0,Math.PI/3,.37])for(const progress of [0,.2,.5,.9,1]){
  const pivot=gate.box.getCenter(new THREE.Vector3()),radial=new THREE.Vector3(Math.cos(gate.tags.sunny_inner_angle),0,-Math.sin(gate.tags.sunny_inner_angle))
  const tangent=new THREE.Vector3(radial.z,0,-radial.x)
  const pose=shutterPose([0,pivot.y,0],gate.tags.sunny_roll_top,gate.tags.sunny_roll_radius,gate.tags.sunny_roll_travel,progress,'port')
  const tilt=new THREE.Quaternion().setFromAxisAngle(tangent,pose.angle),yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle)
  const shift=radial.clone().multiplyScalar(pose.centre[2]);shift.y=pose.centre[1]-pivot.y
  const transform=p=>p.clone().sub(pivot).applyQuaternion(tilt).add(pivot).add(shift).sub(centre).applyQuaternion(yaw).add(centre)
  const boxes=sections.map(s=>new THREE.Box3().setFromPoints(s.map(p=>transform(new THREE.Vector3(...p)))).expandByScalar(1e-6))
  for(const triangle of gate.triangles)for(const point of [...triangle,triangle[0].clone().add(triangle[1]).add(triangle[2]).multiplyScalar(1/3)]){
   assert(boxes.some(b=>b.containsPoint(transform(point))),gate.name+' proxy omits actual moving wood');samples++
  }
 }
}
const feet=new THREE.Vector3(1.8,meta.interiors.dockWaterLevel+.45,-1.8),body=new THREE.Box3(feet.clone().add(new THREE.Vector3(-.34,.02,-.34)),feet.clone().add(new THREE.Vector3(.34,1.75,.34)))
assert(!gates.some(g=>g.triangles.some(t=>body.intersectsTriangle(new THREE.Triangle(...t)))),'the observed excursion pose is independently clear of the actual shutter triangles')
assert(gates.some(g=>body.intersectsBox(g.box)),'the prior whole-slat AABB reproduces the phantom obstruction')
assert(!gates.some(g=>innerGateSections(g.points.map(p=>p.toArray()),g.tags.sunny_inner_angle).some(s=>body.intersectsBox(new THREE.Box3().setFromPoints(s.map(p=>new THREE.Vector3(...p)))))),'new complete conservative sections preserve the physically clear excursion')
assert.throws(()=>innerGateSections([],0));assert.throws(()=>innerGateSections([[0,0,NaN]],0))
console.log('PASS all84 actual inner slats,',samples,'moving surface samples, and independently clear Dock excursion with no omitted wood')
