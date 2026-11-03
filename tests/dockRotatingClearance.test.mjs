/** Actual rotating Dock structure clears the fixed perimeter and bay dividers. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix} from './glb.mjs'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')),glb=readGLB('public/models/sunny.glb')
const centre=[meta.interiors.dockCentre[0],meta.interiors.dockCentre[2],-meta.interiors.dockCentre[1]],guides=new Map(),dividers=new Map()
function visit(i,parent){
 const n=glb.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined&&(/^Sunny_Dock_bay\d_guide-?1_\d\d$/.test(n.name)||/^Sunny_Dock_sector\d_wall\d\d$/.test(n.name))){
  const vertices=[]
  for(const p of glb.json.meshes[n.mesh].primitives){const a=readAccessor(glb,p.attributes.POSITION);for(let j=0;j<a.count;j++)vertices.push(new THREE.Vector3(...a.data.slice(j*3,j*3+3)).applyMatrix4(m))}
  ;(n.name.includes('_guide')?guides:dividers).set(n.name,vertices)
 }
 for(const c of n.children??[])visit(c,m)
}
for(const i of glb.json.scenes[glb.json.scene??0].nodes)visit(i,new THREE.Matrix4())
assert.equal(guides.size,120);assert.equal(dividers.size,96)
for(const [name,vertices] of [...guides,...dividers])for(const p of vertices)assert(Math.hypot(p.x-centre[0],p.z-centre[2])<7.71,`${name} intersects the fixed outer wall while rotating`)
for(const [name,vertices] of guides){
 const index=Number(name.match(/^Sunny_Dock_bay(\d)_/)[1]),a=Math.PI/2+index*Math.PI/3
 for(const p of vertices){const x=p.x-centre[0],y=-(p.z-centre[2]),radial=x*Math.cos(a)+y*Math.sin(a),tangent=-x*Math.sin(a)+y*Math.cos(a);assert(radial*.5-Math.abs(tangent)*Math.sqrt(3)/2>.07,`${name} intersects its radial divider`)}
 assert(meta.interiors.dockSolids.some(b=>b.name===name&&!b.isFloor),`${name} lacks physical collision`)
}
assert(!glb.json.nodes.some(n=>/^Sunny_Dock_(?:walk\d|waiting_stair|portal\d_upper_frame)/.test(n.name||'')),'no unsupported spiral, elevated catwalk or second portal tier')
console.log('PASS actual rotating guides and partitions clear their fixed and radial boundaries')
