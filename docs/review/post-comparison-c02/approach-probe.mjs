/** Attribute the failed pre-mouth flight leg using the actual published static/rotating boxes. */
import fs from 'node:fs';import * as THREE from 'three';import {loadColliders} from '../../../tests/glb.mjs';import {sweepFlight} from '../../../src/systems/flightCollision.js';import {dockBounds} from '../../../src/systems/navigation.js'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')),boxes=loadColliders('public/models/sunny-collision.glb').map(b=>({name:b.name,box:new THREE.Box3(b.min,b.max)})),centre=meta.interiors.dockCentre
for(const b of dockBounds(meta.interiors.dockSolids.map(b=>({...b,min:[b.min[0],b.min[2],-b.max[1]],max:[b.max[0],b.max[2],-b.min[1]]})),[centre[0],centre[2],-centre[1]],0))boxes.push({name:b.name,box:new THREE.Box3(new THREE.Vector3(...b.min),new THREE.Vector3(...b.max))})
let position=new THREE.Vector3(-5.189260213547394,meta.interiors.levels.B1+2.75,.7999734672613443);const target=new THREE.Vector3(.495,position.y,10.513),records=[]
for(let i=0;i<500&&position.distanceTo(target)>.15;i++){
 const v=target.clone().sub(position).normalize().multiplyScalar(4),next=sweepFlight(boxes,position,v,.05,.34,1.75)
 if(next.position.distanceTo(position)<.001){const nearby=boxes.filter(b=>b.box.max.x>=position.x-.36&&b.box.min.x<=position.x+.36&&b.box.max.z>=position.z-.36&&b.box.min.z<=position.z+.36&&b.box.max.y>=position.y&&b.box.min.y<=position.y+1.75).map(b=>({name:b.name,min:b.box.min.toArray(),max:b.box.max.toArray()}));records.push({stalled:true,position:position.toArray(),nearby});break}
 position=next.position
}
const result={position:position.toArray(),target:target.toArray(),distance:position.distanceTo(target),records};fs.writeFileSync('docs/review/post-comparison-c02/approach-probe.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result))
