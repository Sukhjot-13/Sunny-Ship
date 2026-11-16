/** Indexed contacts must be identical to the original full ordered scan. */
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createCollisionIndex} from '../src/systems/collisionIndex.js'
import {resolveList} from '../src/systems/bodyCollision.js'
import {sweepFlight} from '../src/systems/flightCollision.js'
import {stepSupport} from '../src/systems/stepSupport.js'
const R=.34,H=1.75
const make=(name,lo,hi)=>({name,box:new THREE.Box3(new THREE.Vector3(...lo),new THREE.Vector3(...hi))})
let seed=0x43a21
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
/** Frozen original ordered resolver as an independent brute-force oracle. */
function oracle(entries,position,velocity){
 const p=position.clone(),v=velocity.clone();let blocker=null
 for(const item of entries){
  const b=item.box,gap=item.name.startsWith('DOOR_')?.021:0
  const low=[p.x-R,p.y,p.z-R],high=[p.x+R,p.y+H,p.z+R]
  if(high[0]<b.min.x-gap||low[0]>b.max.x+gap||high[1]<b.min.y-.02||low[1]>b.max.y-.02||high[2]<b.min.z-gap||low[2]>b.max.z+gap)continue
  const x=Math.min(high[0]-b.min.x+gap,b.max.x+gap-low[0]),z=Math.min(high[2]-b.min.z+gap,b.max.z+gap-low[2])
  if(x<z){p.x+=(p.x<(b.min.x+b.max.x)/2?-1:1)*x;v.x=0}
  else{p.z+=(p.z<(b.min.z+b.max.z)/2?-1:1)*z;v.z=0}
  blocker=item.name
 }
 return {p,v,blocker}
}
function solve(entries,index,p,v){
 p=p.clone();v=v.clone()
 const low=new THREE.Vector3(p.x-R,p.y,p.z-R),high=new THREE.Vector3(p.x+R,p.y+H,p.z+R)
 const blocker=resolveList(entries,p,v,low,high,R,H,index)
 return {p,v,blocker}
}
const entries=Array.from({length:700},(_,i)=>{
 const lo=[random()*24-12,random()*8-3,random()*24-12]
 return make(i%19?'solid'+i:'DOOR_'+i,lo,lo.map(v=>v+.03+random()*1.8))
})
entries.push(make('large-floor',[-100,-10,-100],[100,-9,100]))
for(let i=0;i<entries.length;i++)entries[i].isFloor=i%3===0
const index=createCollisionIndex(entries)
assert(index.globalCount>0,'large-box fallback is exercised')
let contacts=0
for(let i=0;i<2200;i++){
 const p=new THREE.Vector3(random()*24-12,random()*7-2,random()*24-12),v=new THREE.Vector3(random(),random(),random())
 const reference=oracle(entries,p,v)
 for(const acceleration of [null,index]){
  const actual=solve(entries,acceleration,p,v)
  assert(actual.p.distanceTo(reference.p)<1e-11,'indexed push-out must preserve original pose')
  assert(actual.v.distanceTo(reference.v)<1e-11,'indexed push-out must preserve original velocity')
  assert.equal(actual.blocker,reference.blocker,'original contact order determines the same last blocker')
 }
 if(reference.blocker)contacts++
 const lo=new THREE.Vector3(p.x-R,p.y,p.z-R),hi=new THREE.Vector3(p.x+R,p.y+H,p.z+R)
 const found=new Set(index.query(lo,hi))
 for(const entry of entries){
  const box=entry.box
  if(hi.x>=box.min.x-.025&&lo.x<=box.max.x+.025&&hi.y>=box.min.y-.025&&lo.y<=box.max.y+.025&&hi.z>=box.min.z-.025&&lo.z<=box.max.z+.025)
   assert(found.has(entry),'broad phase cannot omit even a contact-band candidate')
 }
}
assert(contacts>1000,'random differential test must exercise actual contact resolution')
for(let i=0;i<600;i++){
 const p=new THREE.Vector3(random()*24-12,random()*16-12,random()*24-12),v=new THREE.Vector3(random()*76-38,random()*76-38,random()*76-38),dt=1/20
 const end=p.clone().addScaledVector(v,dt)
 const lo=new THREE.Vector3(Math.min(p.x,end.x)-R,Math.min(p.y,end.y),Math.min(p.z,end.z)-R)
 const hi=new THREE.Vector3(Math.max(p.x,end.x)+R,Math.max(p.y,end.y)+H,Math.max(p.z,end.z)+R)
 const a=sweepFlight(entries,p,v,dt,R,H),b=sweepFlight(index.query(lo,hi),p,v,dt,R,H)
 assert(a.position.distanceTo(b.position)<1e-11&&a.velocity.distanceTo(b.velocity)<1e-11,'boosted swept motion must match all-box collision')
 const stepLo=new THREE.Vector3(p.x-R,p.y+.01,p.z-R),stepHi=new THREE.Vector3(p.x+R,p.y+.8,p.z+R)
 assert.equal(stepSupport(entries,p,R,.8),stepSupport(index.query(stepLo,stepHi),p,R,.8),'same full-footprint highest step is retained')
}

const chain=[make('push-across-cells',[-10,-.1,-1],[2.2,2,1]),make('newly-reached-later-box',[2.75,-.1,-1],[4,2,1])]
const chainIndex=createCollisionIndex(chain,{cellSize:.25,maxCells:10000})
const p=new THREE.Vector3(1.9,0,0),v=new THREE.Vector3(1,0,0)
assert(!chainIndex.query(new THREE.Vector3(1.56,0,-R),new THREE.Vector3(2.24,H,R)).includes(chain[1]),'later contact is genuinely absent from the first cells')
assert(Math.abs(solve(chain,chainIndex,p,v).p.x-2.41)<1e-10,'requery after push-out must discover the new later box')
const edge=[make('DOOR_contact-band',[2.019,-.1,-1],[3,2,1])]
const edgeP=new THREE.Vector3(1.659,0,0)
assert.equal(solve(edge,createCollisionIndex(edge,{cellSize:1}),edgeP,v).blocker,'DOOR_contact-band','padding preserves cross-cell moving-door safety contact')
console.log('PASS 2200 full-scan pose/velocity/order comparisons, 600 boosted-flight/step comparisons, conservative contacts, cross-cell push chain and door safety band')
