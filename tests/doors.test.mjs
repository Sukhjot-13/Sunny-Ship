import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createDoorSystem, normalizeDoor, doorMotion} from '../src/systems/doors.js'
import * as THREE from 'three'
import {loadColliders} from './glb.mjs'
import {resolveList} from '../src/systems/collision.js'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const meshes=loadColliders('public/models/sunny.glb')
for(const raw of meta.interiors.doors){
 const system=createDoorSystem([raw]),d=normalizeDoor(raw),m=meshes.find(m=>m.name===raw.node)
 assert(m,`missing leaf ${raw.id}`)
 const closed=system.update(0,null).colliders[0]
 const axes=['x','y','z']
 for(let i=0;i<3;i++)for(const edge of ['min','max'])assert(Math.abs(closed[edge][i]-m[edge][axes[i]])<0.015,`${raw.id}: closed visual/collision ${edge} ${axes[i]}`)
 if(d.kind==='door'){
  const approach=[d.pos[0]+d.ey[0]*2,d.pos[1],d.pos[2]+d.ey[2]*2]
  for(let i=0;i<60;i++)system.update(1/60,approach)
  assert.equal(system.states[d.id].openness,1,`${raw.id} opens on approach`)
  // Remain in the opening for longer than the close time: it cannot shut on us.
  for(let i=0;i<90;i++)system.update(1/60,d.pos)
  assert.equal(system.states[d.id].openness,1)
  for(let i=0;i<90;i++)system.update(1/60,[d.pos[0]+20,d.pos[1],d.pos[2]+20])
  assert.equal(system.states[d.id].openness,0,`${raw.id} closes when clear`)
 }else{
  assert.equal(closed.isFloor,true,`${raw.id}: closed lid supports feet`)
  const nearEdge=[d.pos[0]+d.ex[0]*(d.hW+.6),d.pos[1],d.pos[2]+d.ex[2]*(d.hW+.6)]
  const outOfReach=[d.pos[0]+d.ex[0]*(d.hW+2.1),d.pos[1],d.pos[2]+d.ex[2]*(d.hW+2.1)]
  assert.equal(system.nearestInteraction(nearEdge)?.id,d.id,`${raw.id}: reachable from actual landing edge`)
  assert.equal(system.nearestInteraction(outOfReach),null,`${raw.id}: remote edge remains out of reach`)
  system.toggleHatch(d.id)
  for(let i=0;i<60;i++)system.update(1/60,[d.pos[0],d.pos[1]-2.0,d.pos[2]])
  assert.equal(system.states[d.id].openness,1)
  const box=system.getColliders()[0]
  assert(!(d.pos[0]>box.min[0]&&d.pos[0]<box.max[0]&&d.pos[2]>box.min[2]&&d.pos[2]<box.max[2]),`${raw.id}: open lid clears shaft`)
 }
}
// A short stair approach can reach a leaf before it fully opens. The actual
// walking resolver and moving-door safety band must permit opening from rest.
for(const rot of [0,Math.PI/2])for(const side of [-1,1]){
 const raw={id:'contact-door',kind:'door',mode:'slide',pos:[0,0,0],rot,width:1,height:2.1,thickness:.075,
  slide:[1.2*Math.cos(rot),1.2*Math.sin(rot),0]}
 const sys=createDoorSystem([raw]),d=sys.doors[0],closed=sys.update(0,null).colliders[0]
 const p=new THREE.Vector3(d.ey[0]*side*(.34+.0375),0,d.ey[2]*side*(.34+.0375)),v=new THREE.Vector3()
 const item={name:closed.name,box:new THREE.Box3(new THREE.Vector3(...closed.min),new THREE.Vector3(...closed.max))}
 resolveList([item],p,v,new THREE.Vector3(p.x-.34,p.y,p.z-.34),new THREE.Vector3(p.x+.34,p.y+1.75,p.z+.34),.34,1.75)
 for(let i=0;i<60;i++)sys.update(1/60,p.toArray())
 assert.equal(d.state.openness,1,'a door opens beside a stationary person at real walking contact')
 assert.equal(d.state.blocked,false,'ordinary sliding contact has no opening deadlock')
}
const swing=createDoorSystem([{id:'safe-swing',pos:[0,0,0],width:1.1,height:2.2,mode:'swing',hinge:[-.55,0],angle:Math.PI/2}])
for(let i=0;i<120;i++){
 const player=[-.6,0,.5]
 swing.update(1/60,player)
 const b=swing.getColliders()[0]
 assert(!(b.max[0]>player[0]-.34&&b.min[0]<player[0]+.34&&b.max[2]>player[2]-.34&&b.min[2]<player[2]+.34),'swing never sweeps the player')
}
// A real deck lid rotates upward about its edge, rather than parking across
// another doorway. Independently transformed corners must match its collider.
for(const rot of [0,Math.PI/2]){
 const raw={id:'ladder-lid',kind:'hatch',mode:'lift',pos:[0,0,0],rot,width:1.4,depth:1.35,thickness:.09,baseOffset:-.045,hinge:[.7,0],angle:Math.PI/2}
 const sys=createDoorSystem([raw]),d=sys.doors[0]
 for(let i=0;i<=90;i++){
  d.state.openness=i/90
  const box=sys.update(0,[10,0,10]).colliders[0],motion=doorMotion(d,i/90,[])
  const yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rot)
  const lift=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...d.ey),motion[3])
  const visual=new THREE.Box3()
  for(const x of [-.7,.7])for(const y of [-.045,.045])for(const z of [-.675,.675])
   visual.expandByPoint(new THREE.Vector3(x,y,z).applyQuaternion(yaw).applyQuaternion(lift).add(new THREE.Vector3(motion[0],-.045+motion[1],motion[2])))
  for(let axis=0;axis<3;axis++)for(const edge of ['min','max'])assert(Math.abs(box[edge][axis]-visual[edge].getComponent(axis))<1e-10,'lift collider encloses independently transformed lid')
 }
 sys.reset();sys.toggleHatch(d.id)
 const onLid=[0,.002,0]
 for(let i=0;i<60;i++)sys.update(1/60,onLid)
 assert(d.state.blocked&&d.state.openness<.05,'upward hinged lid cannot lift through supported feet')
 for(let i=0;i<60;i++)sys.update(1/60,[10,0,10])
 assert.equal(d.state.openness,1,'hinged lid opens after person steps clear')
 sys.toggleHatch(d.id)
 const body=[0,-.5,0]
 for(let i=0;i<90;i++){
  const b=sys.update(1/60,body).colliders[0]
  assert(!(b.max[0]>.34*-1&&b.min[0]<.34&&b.max[1]>-.5&&b.min[1]<1.25&&b.max[2]>-.34&&b.min[2]<.34),'hinged closing lid never intersects shaft occupant')
 }
 assert(d.state.blocked&&d.state.openness>0,'occupied ladder shaft stops closing lid')
}
const lookout=meta.interiors.doors.find(d=>d.id==='CrowNestHatch'),lid=createDoorSystem([lookout]),h=lid.doors[0]
const feet=[h.pos[0],h.centreY+h.hU+.002,h.pos[2]]
lid.toggleHatch(h.id)
for(let i=0;i<60;i++)lid.update(1/60,feet)
assert.equal(lid.states[h.id].openness,1,'flat lookout lid can withdraw beneath a climber resting above it')
lid.toggleHatch(h.id)
const inShaft=[feet[0],feet[1]-.5,feet[2]]
for(let i=0;i<90;i++){
 lid.update(1/60,inShaft)
 const b=lid.getColliders()[0]
 assert(!(b.max[0]>inShaft[0]-.34&&b.min[0]<inShaft[0]+.34&&b.max[1]>inShaft[1]&&b.min[1]<inShaft[1]+1.75&&b.max[2]>inShaft[2]-.34&&b.min[2]<inShaft[2]+.34),'closing hatch never crosses a body in its shaft')
}
assert(lid.states[h.id].blocked,'occupied shaft prevents closing')
console.log(`PASS: ${meta.interiors.doors.length} moving openings match GLB and safely open/close`)
