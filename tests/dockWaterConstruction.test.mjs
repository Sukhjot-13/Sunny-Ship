/** Actual exported C03 bed/water samples; no claim about vehicle controls. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
import {sweepFlight} from '../src/systems/flightCollision.js'

const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
assert.equal(meta.exterior.experienceScale,2.2,'intentional ship enlargement remains unchanged')
const glb=readGLB('public/models/sunny.glb'),meshes=[]
function visit(i,parent){
 const n=glb.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined&&!n.extras?.sunny_dynamic)for(const p of glb.json.meshes[n.mesh].primitives){
  const a=readAccessor(glb,p.attributes.POSITION),g=new THREE.BufferGeometry()
  g.setAttribute('position',new THREE.BufferAttribute(a.data,3))
  if(p.indices!==undefined)g.setIndex(Array.from(readAccessor(glb,p.indices).data))
  const b=new THREE.Box3().setFromBufferAttribute(g.attributes.position).applyMatrix4(m)
  if(b.min.x>9||b.max.x< -8||b.min.z>21||b.max.z< -22||b.max.y< -57||b.min.y> -38)continue
  const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))
  mesh.name=n.name;mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(m);meshes.push(mesh)
 }
 for(const c of n.children??[])visit(c,m)
}
for(const i of glb.json.scenes[glb.json.scene??0].nodes)visit(i,new THREE.Matrix4())
const cx=meta.interiors.dockCentre[0],cz=-meta.interiors.dockCentre[1],water=meta.interiors.dockWaterLevel
assert.equal(water,meta.waterLevel,'ocean and Dock use one actual water level')
const waterMeshes=meshes.filter(m=>/^Sunny_Dock_(?:water_chamber|outlet\d_water)$/.test(m.name))
const beds=meshes.filter(m=>/^Sunny_Dock_(?:water_bed|outlet\d_bed)$/.test(m.name))
assert.equal(waterMeshes.length,3,'one chamber and two real water volumes')
assert.equal(beds.length,3,'one chamber and two real supporting beds')
const samples=[]
for(const side of [-1,1])for(const radius of [3,5,7,7.5,8,10,12,14,16,18]){
 const z=cz+side*radius,ray=new THREE.Raycaster(new THREE.Vector3(cx,water+.15,z),new THREE.Vector3(0,-1,0),0,4)
 const surface=ray.intersectObjects(waterMeshes)[0],bottom=ray.intersectObjects(beds)[0]
 assert(surface&&Math.abs(surface.point.y-water)<.02,`water surface absent at ${z}`)
 assert(bottom&&water-bottom.point.y>1.2&&water-bottom.point.y<1.4,`unsupported or shallow bed at ${z}`)
 samples.push({z,water:surface.point.y,bed:bottom.point.y})
}
for(const mouth of meta.exterior.mechanisms.dockOpenings){
 const z=water-mouth.centre[2],halfWidth=Math.sqrt(mouth.clearRadius**2-z**2)
 assert(halfWidth>2.4,'water crosses the retained clear mouth wider than the actual tunnel')
 assert(water-(mouth.centre[2]-mouth.clearRadius)>1.2,'clear throat is substantially submerged')
}
// Ocean.jsx discards water inside the interpolated hull profile. The actual
// channel water must extend beyond that boundary to overlap visible ocean.
const profile=meta.oceanHullProfile
for(const x of [cx-1,cx,cx+1]){
 const i=profile.findIndex((p,j)=>j+1<profile.length&&x>=p[0]&&x<=profile[j+1][0])
 assert(i>=0,'ocean profile covers the wet outlet')
 const a=profile[i],b=profile[i+1],t=(x-a[0])/(b[0]-a[0])
 const low=a[1]+t*(b[1]-a[1]),high=a[2]+t*(b[2]-a[2])
 const port=meta.exterior.mechanisms.dockOpenings.find(m=>m.side==='port').centre[1]
 const starboard=meta.exterior.mechanisms.dockOpenings.find(m=>m.side==='starboard').centre[1]
 assert(low-port>.1&&starboard-high>.1,'channel water overlaps the non-discarded ocean on both sides')
}
const boxes=loadColliders('public/models/sunny-collision.glb')
assert(boxes.some(b=>b.name.includes('Dock_outlet0_wall'))&&boxes.some(b=>b.name.includes('Dock_outlet1_wall')),'both outlet walls have real physical collision')
const actual=loadColliders('public/models/sunny.glb')
const roof=actual.find(o=>o.name==='Sunny_B1_ceiling')
const dividers=actual.filter(o=>/^Sunny_Dock_sector\d_wall\d\d$/.test(o.name))
assert(roof&&dividers.length===96,'actual ceiling and six segmented bay partitions')
assert(dividers.every(o=>Math.abs(o.max.y-roof.max.y)<.02),'radial partitions meet the real ceiling plane')
const perimeter=actual.filter(o=>o.name.startsWith('Sunny_Dock_outer_wall'))
const stairPassage=new Set([29,30,31,32,33].map(i=>`Sunny_Dock_outer_wall${i}`))
assert(perimeter.filter(o=>!stairPassage.has(o.name)).every(o=>Math.abs(o.max.y-roof.max.y)<.02),'outer walls outside the retained stair passage meet the real ceiling plane')
assert([...stairPassage].every(n=>perimeter.some(o=>o.name===n)),'water-bearing bases remain under all five actual stair-passage wall sections')
const gates=actual.filter(o=>/^Sunny_Dock_inner_gate\d_\d\d$/.test(o.name))
const guides=actual.filter(o=>/^Sunny_Dock_bay\d_guide-?1_\d\d$/.test(o.name))
const outletGuides=actual.filter(o=>/^Sunny_Dock_outlet\d_guide-?1$/.test(o.name))
assert.equal(guides.length,120,'all six bays have two segmented guide rails')
assert.equal(outletGuides.length,4,'both outer tunnels have paired guide rails')
assert(guides.every(g=>meta.interiors.dockSolids.some(b=>b.name===g.name&&!b.isFloor)),'every moving guide has physical collision')
assert(outletGuides.every(g=>boxes.some(b=>b.name.includes(g.name))),'every fixed guide has physical collision')
const waiting=actual.find(o=>o.name==='Sunny_Dock_turntable_deck')
assert.equal(gates.length,84,'six actual fourteen-slat inner shutters')
assert(waiting&&Math.abs(waiting.max.y-(water+.45))<.02,'waiting floor stands just above water')
assert(gates.every(g=>g.min.y>=waiting.max.y+.08&&g.max.y<=waiting.max.y+2.97),'inner shutters stand at the water-level waiting room')
assert(!actual.some(o=>/^Sunny_Dock_(?:walk\d|waiting_stair|portal\d_upper_frame)/.test(o.name)),'reference waiting room has no spiral, second portal tier or radial catwalks')
const ladder=meta.exterior.mechanisms.climbs.find(p=>p.id==='dock-waiting-ladder')
const hatch=meta.interiors.doors.find(d=>d.id==='DockLadderHatch')
assert(ladder?.hatch==='DockLadderHatch'&&hatch?.kind==='hatch','central ladder has a registered actual lawn hatch')
assert(actual.filter(o=>/^Sunny_DockLadder_rail/.test(o.name)).length===2&&actual.filter(o=>/^Sunny_DockLadder_rung/.test(o.name)).length>=30,'visible physical ladder rails and rungs span the levels')
const [bottom,top,exit]=ladder.points.map(([x,y,z])=>new THREE.Vector3(x,z,-y))
assert(Math.abs(bottom.y-waiting.max.y)<.02&&Math.abs(top.y-meta.interiors.levels.F1)<.02,'actual ladder connects the waiting floor to lawn level')
const staticBodies=boxes.map(b=>({name:b.name,box:new THREE.Box3(b.min,b.max)}))
for(const [a,b] of [[bottom,top],[top,exit]]){
 const start=a.clone().add(new THREE.Vector3(0,.02,0)),delta=b.clone().sub(a)
 const moved=sweepFlight(staticBodies,start,delta,1,.34,1.75)
 assert(moved.position.distanceTo(start.clone().add(delta))<.03,'actual ladder shaft and exit clear the full normal body')
}
const stairWall=boxes.filter(b=>b.name.includes('Dock_outlet1_wall-1_upper_')||b.name.includes('Dock_outer_wall')).map(b=>({name:b.name,box:new THREE.Box3(b.min,b.max)}))
const dockStair=actual.filter(o=>/^Sunny_SoldierDockStair_(?:up|over)_tread\d+$/.test(o.name))
assert(stairWall.length>0&&dockStair.length>0,'retained Dock stair and cut wall have physical sections')
const wallX=cx-2.48,crossing=dockStair.filter(t=>t.min.x<wallX+1&&t.max.x>wallX-1.5)
assert(crossing.length>0,'actual stair crosses the new wall')
assert(crossing.some(t=>t.name.includes('_up_'))&&crossing.some(t=>t.name.includes('_over_')),'both retained switchback flights meet the new wall')
for(const tread of crossing){
 const z=(tread.min.z+tread.max.z)/2,start=new THREE.Vector3(tread.min.x-.36,tread.max.y,z),end=tread.max.x+.36
 const moved=sweepFlight(stairWall,start,new THREE.Vector3(end-start.x,0,0),1,.34,1.75)
 assert(moved.position.x>end-.02,`normal full body clears stair opening at ${tread.name}: ${JSON.stringify({start:start.toArray(),end,actual:moved.position.toArray()})}`)
}
const testTread=crossing.find(t=>t.name.includes('_up_')),negativeStart=new THREE.Vector3(wallX-.8,testTread.max.y,testTread.min.z-1.5)
const blocked=sweepFlight(stairWall,negativeStart,new THREE.Vector3(1.6,0,0),1,.34,1.75)
assert(blocked.position.x<wallX,'negative control: retained wall still blocks outside the stair cut')
const outerWalls=meshes.filter(m=>m.name.startsWith('Sunny_Dock_outer_wall'))
const centreWalls=meshes.filter(m=>m.name==='Sunny_Dock_centre_wall')
const centreCollision=boxes.filter(b=>b.name.includes('Dock_centre_wall'))
assert(outerWalls.length>70&&centreWalls.length===1,'actual fixed perimeter and sealed waiting-room base')
assert(centreCollision.length>64,'central retaining shell has sectioned physical collision')
for(let i=0;i<96;i++){
 const angle=(i+.5)*Math.PI*2/96,dir=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle))
 const origin=new THREE.Vector3(cx,water-.5,cz),centreRay=new THREE.Raycaster(origin,dir,0,3)
 const centreHit=centreRay.intersectObjects(centreWalls)[0]
 assert(centreHit&&centreHit.distance>2.05&&centreHit.distance<2.35,'waiting-room base contains water at every sampled angle')
 const centrePhysical=new THREE.Ray(origin,dir)
 const distances=centreCollision.map(b=>centrePhysical.intersectBox(new THREE.Box3(b.min,b.max),new THREE.Vector3())).filter(Boolean).map(p=>p.distanceTo(origin))
 assert(distances.some(d=>d>2&&d<2.45),'retaining shell has physical containment at each sampled angle')
 if(Math.abs(Math.cos(angle))*7.8<2.55)continue // real outlet gaps, not omitted wall failures
 const outsideRay=new THREE.Raycaster(origin.clone().addScaledVector(dir,3),dir,0,6)
 const wall=outsideRay.intersectObjects(outerWalls)[0]
 assert(wall&&wall.distance>4.5&&wall.distance<5.1,`perimeter contains water at angular sample ${i}`)
}
// A water surface or AABB alone cannot show a clear tunnel. Probe the actual
// static triangles along each wet outlet below the real water surface.
const dryMeshes=meshes.filter(m=>!waterMeshes.includes(m))
for(const mouth of meta.exterior.mechanisms.dockOpenings){
 const outer=-mouth.centre[1],direction=Math.sign(outer-cz)
 for(const dx of [-2,-1,0,1,2])for(const depth of [.15,.55,1.05]){
  const origin=new THREE.Vector3(cx+dx,water-depth,cz+direction*6.3)
  const ray=new THREE.Raycaster(origin,new THREE.Vector3(0,0,direction),0,Math.abs(outer-cz)-6.3+.2)
  const hit=ray.intersectObjects(dryMeshes)[0]
  assert(!hit,`wet tunnel blocked by ${hit?.object.name} on ${mouth.side} at depth ${depth}`)
  const physicalRay=new THREE.Ray(origin,new THREE.Vector3(0,0,direction)),end=ray.far
  for(const b of boxes){
   const hitPoint=physicalRay.intersectBox(new THREE.Box3(b.min,b.max),new THREE.Vector3())
   assert(!hitPoint||hitPoint.distanceTo(origin)>end,`wet tunnel collision blocked by ${b.name} on ${mouth.side} at depth ${depth}`)
  }
 }
}
assert(!(water<=meta.exterior.mechanisms.dockOpenings[0].centre[2]-meta.exterior.mechanisms.dockOpenings[0].clearRadius),'negative control: water below the throat must fail')
console.log('PASS sampled actual water surfaces, wet mouth depth and supporting outlet beds',JSON.stringify(samples))
