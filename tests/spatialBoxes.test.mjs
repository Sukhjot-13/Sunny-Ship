/** Broad phase may add candidates but must never miss any exact body overlap. */
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {spatialBoxes} from './spatialBoxes.mjs'
let state=1234567
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296}
const boxes=Array.from({length:250},(_,i)=>{const min=new THREE.Vector3(...Array.from({length:3},()=>random()*20-10));return {name:String(i),min,max:min.clone().add(new THREE.Vector3(...Array.from({length:3},()=>.01+random()*3)))}})
const query=spatialBoxes(boxes)
let overlaps=0
for(let i=0;i<1500;i++){
 const p=new THREE.Vector3(...Array.from({length:3},()=>random()*24-12)),candidates=new Set(query(p))
 for(const b of boxes)for(const rise of [0,.4,.8]){
  const hit=p.x+.34>=b.min.x&&p.x-.34<=b.max.x&&p.z+.34>=b.min.z&&p.z-.34<=b.max.z&&p.y+rise+1.75>=b.min.y&&p.y+rise+.04<=b.max.y
  if(hit){overlaps++;assert(candidates.has(b),'missed exact contact at '+p.toArray())}
 }
}
assert(overlaps>1000);console.log('PASS conservative spatial broad phase retains',overlaps,'exact overlaps, including step/head clearances')
