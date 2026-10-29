/** Independent exported-mesh and collision probes through the dock openings. */
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
const gltf=readGLB('public/models/sunny.glb'), triangles=[]
function walk(i,parent){
 const n=gltf.json.nodes[i],m=new THREE.Matrix4().multiplyMatrices(parent,nodeMatrix(n))
 if(n.mesh!==undefined && n.name?.startsWith('Sunny_InteriorWall_B1_')){
  for(const p of gltf.json.meshes[n.mesh].primitives){
   const pos=readAccessor(gltf,p.attributes.POSITION),idx=p.indices===undefined?null:readAccessor(gltf,p.indices).data
   const count=idx?.length??pos.count
   const v=j=>new THREE.Vector3(...pos.data.slice(j*3,j*3+3)).applyMatrix4(m)
   for(let k=0;k<count;k+=3) triangles.push([v(idx?idx[k]:k),v(idx?idx[k+1]:k+1),v(idx?idx[k+2]:k+2)])
  }
 }
 for(const c of n.children||[])walk(c,m)
}
for(const i of gltf.json.scenes[gltf.json.scene??0].nodes)walk(i,new THREE.Matrix4())
assert(triangles.length>0,'B1 lining must remain present')
const boxes=loadColliders('public/models/sunny-collision.glb').filter(b=>b.name.includes('Sunny_InteriorWall_B1_'))
assert(boxes.length>0,'B1 lining must retain physical collision')
for(const side of [-1,1]){
 let rays=0
 for(let dx=-7;dx<=7;dx++)for(let dy=-7;dy<=7;dy++){
  if(dx*dx+dy*dy>49)continue
  const origin=new THREE.Vector3(.495+dx,-45.94072+dy,side*25),dir=new THREE.Vector3(0,0,-side),ray=new THREE.Ray(origin,dir)
  const hit=triangles.some(t=>{const p=ray.intersectTriangle(...t,false,new THREE.Vector3());return p&&Math.abs(p.z)<25&&p.z*side>=0})
  assert(!hit,`visual lining blocks ${side} at ${dx},${dy}`)
  const blocked=boxes.some(b=>origin.x>b.min.x&&origin.x<b.max.x&&origin.y>b.min.y&&origin.y<b.max.y&&b.max.z>=Math.min(0,side*25)&&b.min.z<=Math.max(0,side*25))
  assert(!blocked,`collision lining blocks ${side} at ${dx},${dy}`)
  rays++
 }
 console.log(`PASS ${rays} visual/collision lining rays on side ${side}`)
}
