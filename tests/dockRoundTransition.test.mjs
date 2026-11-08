/** Actual C03 rounded outlet shell and retained-mouth transition. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const glb=readGLB('public/models/sunny.glb'),meshes=[]
function visit(i,parent){
 const n=glb.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined&&!n.extras?.sunny_dynamic)for(const p of glb.json.meshes[n.mesh].primitives){
  const a=readAccessor(glb,p.attributes.POSITION),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a.data,3));if(p.indices!==undefined)g.setIndex(Array.from(readAccessor(glb,p.indices).data))
  const box=new THREE.Box3().setFromBufferAttribute(g.attributes.position).applyMatrix4(m)
  if(box.min.x>9||box.max.x< -8||box.min.y> -37||box.max.y< -55)continue
  const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.name=n.name;mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(m);meshes.push(mesh)
 }
 for(const c of n.children??[])visit(c,m)
}
for(const i of glb.json.scenes[glb.json.scene??0].nodes)visit(i,new THREE.Matrix4())
const boxes=loadColliders('public/models/sunny-collision.glb'),cy=meta.interiors.dockCentre[1],cx=meta.interiors.dockCentre[0]
const landings=loadColliders('public/models/sunny.glb').filter(b=>b.name.startsWith('Sunny_Dock_aft_stair_landing'))
assert.equal(landings.length,2,'both retained aft flights have an actual supported lawn approach')
assert(landings.every(b=>Math.abs(b.max.y-meta.interiors.levels.F1)<.02),'aft stair approach remains at the lawn level')
const sorted=[...meta.exterior.mechanisms.dockOpenings].sort((a,b)=>a.centre[1]-b.centre[1]),results=[]
for(const [side,o] of sorted.entries()){
 const shell=meshes.filter(m=>m.name===`Sunny_Dock_outlet${side}_round_shell`)
 assert.equal(shell.length,1,'actual rounded transition shell required')
 const physical=boxes.filter(b=>b.name.includes(`Dock_outlet${side}_round_shell`));assert(physical.length>50,'rounded shell has real sectioned collision')
 const direction=Math.sign(o.centre[1]-cy),start=cy+direction*7.68,end=o.centre[1]-direction*.1
 const measured=[]
 for(const t of [.1,.5,.9,.99]){
  const y=-(start+(end-start)*t),z=o.centre[2]
  const right=new THREE.Raycaster(new THREE.Vector3(cx,z,y),new THREE.Vector3(1,0,0),0,10).intersectObjects(shell)[0]
  const left=new THREE.Raycaster(new THREE.Vector3(cx,z,y),new THREE.Vector3(-1,0,0),0,10).intersectObjects(shell)[0]
  assert(right&&left,`real side shell missing at ${o.side} t=${t}`)
  measured.push({t,left:left.distance,right:right.distance})
 }
 assert(measured.at(-1).right>7.35&&measured.at(-1).left>7.35,'transition opens to nearly the full retained circular mouth')
 assert(measured[2].right>measured[1].right&&measured[1].right>measured[0].right,'real cross-sections widen towards the mouth')
 for(const t of [.25,.5,.75])for(const depth of [.2,.8])for(const sign of [-1,1]){
  const p=new THREE.Vector3(cx,meta.waterLevel-depth,-(start+(end-start)*t)),direction=new THREE.Vector3(sign,0,0)
  const ray=new THREE.Ray(p,direction),hits=physical.map(b=>ray.intersectBox(new THREE.Box3(b.min,b.max),new THREE.Vector3())).filter(Boolean)
  assert(hits.some(hit=>hit.distanceTo(p)<8),`wet rounded shell lacks physical containment ${o.side} t=${t} depth=${depth}`)
 }
 const y=-(start+(end-start)*.99),origin=new THREE.Vector3(cx,o.centre[2],y)
 for(const angle of [0,Math.PI/4,Math.PI/2,3*Math.PI/4,Math.PI,5*Math.PI/4,3*Math.PI/2,7*Math.PI/4]){
  const v=new THREE.Vector3(Math.cos(angle),Math.sin(angle),0),hit=new THREE.Raycaster(origin,v,0,10).intersectObjects(shell)[0]
  assert(hit&&Math.abs(hit.distance-o.clearRadius)<.2,`actual circular transition edge ${o.side} angle ${angle}`)
 }
 // Far-side rays detect the old rectangular walls or other actual static blockers.
 const a=-(start+(end-start)*.78),b=-(start+(end-start)*.98),dir=Math.sign(b-a)
 for(const dx of [-4.25,4.25]){
  const ray=new THREE.Raycaster(new THREE.Vector3(cx+dx,o.centre[2],a),new THREE.Vector3(0,0,dir),0,Math.abs(b-a))
  const hit=ray.intersectObjects(meshes,false)[0]
  assert(!hit,`widened mouth obstructed by ${hit?.object.name} at x ${dx}`)
 }
 for(const dz of [4,5,5.4])for(const dx of [-2,0,2]){
  const ray=new THREE.Raycaster(new THREE.Vector3(cx+dx,o.centre[2]+dz,a),new THREE.Vector3(0,0,dir),0,Math.abs(b-a))
  const hit=ray.intersectObjects(meshes,false)[0]
  assert(!hit,`crown transition obstructed by ${hit?.object.name} at x ${dx}, height ${dz}`)
 }
 const crownStart=-(start+(end-start)*.30),crownEnd=-(start+(end-start)*.80)
 const crownRay=new THREE.Raycaster(new THREE.Vector3(cx,meta.interiors.levels.F1,crownStart),new THREE.Vector3(0,0,Math.sign(crownEnd-crownStart)),0,Math.abs(crownEnd-crownStart))
 const crownHit=crownRay.intersectObjects(meshes,false)[0]
 assert(!crownHit,`lawn-height channel crown obstructed by ${crownHit?.object.name}`)
 results.push({side:o.side,measured,physical:physical.length})
}
console.log('PASS actual rounded channels, circular mouth transitions and wide static rays',JSON.stringify(results))
