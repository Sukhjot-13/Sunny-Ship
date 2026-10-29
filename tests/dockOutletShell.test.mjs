/** C02 actual exported mouth-shell closure, clear full-body throat and physical containment. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
import {sweepFlight} from '../src/systems/flightCollision.js'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')),gltf=readGLB('public/models/sunny.glb'),meshes=[],shells=[]
/** Read every static actual local mesh, without a named-lining-only visibility filter. */
function visit(i,parent){
 const n=gltf.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined&&!n.extras?.sunny_dynamic)for(const p of gltf.json.meshes[n.mesh].primitives){
  const a=readAccessor(gltf,p.attributes.POSITION),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a.data,3));if(p.indices!==undefined)g.setIndex(Array.from(readAccessor(gltf,p.indices).data))
  const box=new THREE.Box3().setFromBufferAttribute(g.attributes.position).applyMatrix4(m)
  if(box.min.x>9||box.max.x< -8||box.max.y< -55||box.min.y> -37){g.dispose();continue}
  const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.name=n.name;mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(m);meshes.push(mesh)
  if(n.extras?.sunny_aperture_shell){assert.equal(n.extras.sunny_feature,'Dock1','mouth shares existing realistic exterior timber dispatch');assert.equal(n.extras.sunny_uv_space,'metres','new real reveal uses physical-scale existing UV finish');shells.push(mesh)}
 }
 for(const c of n.children??[])visit(c,m)
}
for(const i of gltf.json.scenes[gltf.json.scene??0].nodes)visit(i,new THREE.Matrix4())
const boxes=loadColliders('public/models/sunny-collision.glb').map(b=>({name:b.name,box:new THREE.Box3(b.min,b.max)})),floor=meta.interiors.levels.B1,records=[]
assert.deepEqual(meta.exterior.mechanisms.dockOpenings.map(o=>o.side).sort(),['port','starboard'])
for(const o of meta.exterior.mechanisms.dockOpenings){
 const shell=shells.filter(s=>s.name===o.outletShell);assert.equal(shell.length,1,'exactly one real mouth shell per side')
 const mesh=shell[0],positions=mesh.geometry.attributes.position,ids=mesh.geometry.index?.array??Array.from({length:positions.count},(_,i)=>i),edges=new Map()
 /** Weld only exported UV/material splits at10µm to count actual surface-edge incidence. */
 const vertex=i=>new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).toArray().map(v=>Math.round(v*1e5)).join(',')
 for(let i=0;i<ids.length;i+=3)for(let j=0;j<3;j++){const a=vertex(ids[i+j]),b=vertex(ids[i+(j+1)%3]);if(a===b)continue;const key=[a,b].sort().join('|');edges.set(key,(edges.get(key)||0)+1)}
 assert([...edges.values()].every(v=>v===2),'actual exported annular shell must be closed')
 const physical=boxes.filter(b=>b.name.includes(o.outletShell));assert(physical.length>100,'real mouth shell has matching face collision')
 const port=o.side==='port',side=port?1:-1,x=o.centre[0],outer=-o.centre[1],inner=port?13.8:-16.3,mid=(inner+outer)/2,centreY=o.centre[2]
 // Every angle retains a real radial shell and a blocking physical section.
 const radial=[]
 for(let i=0;i<96;i++){
  const angle=(i+.37)*Math.PI*2/96,dir=new THREE.Vector3(Math.cos(angle),Math.sin(angle),0),origin=new THREE.Vector3(x,centreY,mid),ray=new THREE.Raycaster(origin,dir)
  const hit=ray.intersectObjects(shell,false)[0];assert(hit&&Math.abs(hit.distance-o.clearRadius)<.01,'continuous real circular reveal')
  const p=new THREE.Vector3(x-.025,centreY-.025,mid),r=sweepFlight(physical,p,dir.clone().multiplyScalar(12),1,.025,.05)
  assert(Math.hypot(r.position.x-x,r.position.y-centreY)<8.1,'closed real shell must contain collision-enabled body at every angle')
  radial.push(hit.distance)
 }
 // Full normal body passes the complete local mouth thickness. Flight avoids
 // claiming the still-missing C03 water-bearing support/channel as a walkway.
 const feet=floor+2.5,start=new THREE.Vector3(x,feet,inner),end=outer+side*.7,velocity=new THREE.Vector3(0,0,end-inner)
 const moved=sweepFlight(boxes,start,velocity,1,.34,1.75)
 assert(Math.abs(moved.position.z-end)<.01,`all-layer physical mouth blocked on ${o.side}`)
 const rayHits=[]
 for(const dx of [-.34,0,.34])for(const dy of [.03,.875,1.72]){
  const ray=new THREE.Raycaster(new THREE.Vector3(x+dx,feet+dy,inner),new THREE.Vector3(0,0,side),0,Math.abs(end-inner))
  const hit=ray.intersectObjects(meshes,false)[0];assert(!hit,`actual static mesh blocks mouth ${o.side}: ${hit?.object.name}`)
  rayHits.push([dx,dy])
 }
 records.push({side:o.side,closedEdges:edges.size,physicalSections:physical.length,radialSamples:radial.length,fullBody:{radius:.34,height:1.75,start:start.toArray(),end:moved.position.toArray()},visualBodyRays:rayHits.length})
}
console.log('PASS C02 exported closed reveals, all-angle physical containment and all-static full-body mouth clearance',JSON.stringify(records))

const outside=JSON.parse(fs.readFileSync('tests/fixtures/dock-outside-rays.json'))
assert(outside.rays.length>100,'outside-mouth preservation baseline must be nonempty')
const lining=meshes.filter(m=>m.name.startsWith('Sunny_InteriorWall_B1_'))
for(const r of outside.rays){
 const origin=new THREE.Vector3(...r.origin),direction=new THREE.Vector3(...r.direction),ray=new THREE.Raycaster(origin,direction,0,15),hit=ray.intersectObjects(lining,false)[0]
 assert(hit&&Math.abs(hit.distance-r.distance)<.001,'original B1 shell outside actual aperture retained')
 const p=new THREE.Vector3(...r.origin),actual=new THREE.Ray(p,direction),physical=boxes.filter(b=>b.name.includes('InteriorWall_B1_')).map(b=>actual.intersectBox(b.box,new THREE.Vector3())).filter(Boolean).map(v=>v.distanceTo(p)).filter(d=>d<15)
 assert(physical.some(d=>Math.abs(d-r.distance)<.15),'retained outside-mouth lining keeps corresponding collision')
}
console.log('PASS C02 retained original lining outside both mouth cuts',outside.rays.length)
