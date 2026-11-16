/** R04/R14: one round lawn opening, a central ladder and uninterrupted lawn. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')),gltf=readGLB('public/models/sunny.glb')
const meshes=[]
function visit(i,parent){const n=gltf.json.nodes[i],matrix=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined&&(/Sunny_Lawn(?:$|\.)|Sunny_Hatch_DockLadderHatch_lid|Sunny_Dock_outlet\d_round_shell/.test(n.name))){
  for(const p of gltf.json.meshes[n.mesh].primitives){const a=readAccessor(gltf,p.attributes.POSITION),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a.data,3));if(p.indices!==undefined)g.setIndex(Array.from(readAccessor(gltf,p.indices).data))
   const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.name=n.name;m.matrixAutoUpdate=false;m.matrixWorld.copy(matrix);meshes.push(m)}
 }
 for(const child of n.children??[])visit(child,matrix)}
for(const i of gltf.json.scenes[gltf.json.scene??0].nodes)visit(i,new THREE.Matrix4())
assert(!gltf.json.nodes.some(n=>/SoldierDockStair|SoldierDockHatch|Dock_stairwell_screen/.test(n.name)),'no unsourced duplicate stair, lid or screen')
const h=meta.interiors.doors.find(d=>d.id==='DockLadderHatch')
assert.equal(h?.shape,'round','actual central opening must be circular as R14')
assert(!meta.interiors.doors.some(d=>d.id==='SoldierDockHatch'))
assert.equal(meta.exterior.mechanisms.climbs.filter(p=>p.id==='dock-waiting-ladder'&&p.hatch===h.id).length,1)
const lawn=meshes.filter(m=>m.name==='Sunny_Lawn'),lid=meshes.filter(m=>m.name===h.node)
assert(lawn.length&&lid.length,'actual grass and moving round lid exist')
const height=meta.interiors.levels.F1
const down=(x,z,targets,top=height+.03,far=.40)=>new THREE.Raycaster(new THREE.Vector3(x,top,z),new THREE.Vector3(0,-1,0),0,far).intersectObjects(targets)[0]
// The old long rectangular opening/handrails are replaced by real original lawn.
const oldSlot=[]
for(const x of [-5.4,-4.5,-3.5,-2.5,-1.6])for(const z of [-8.3,-8.8,-9.3]){
 const hit=down(x,z,lawn);assert(hit&&Math.abs(hit.point.y-height)<.02,'old stair slot must be continuous grass at '+[x,z]);oldSlot.push([x,z])
}
const [x,y,z]=h.pos,r=h.width/2
for(let i=0;i<32;i++){
 const angle=i*Math.PI/16,dx=Math.cos(angle),dz=Math.sin(angle)
 assert(down(x+r*.95*dx,-y+r*.95*dz,lid),'solid lid closes circular bore')
 assert(!down(x+r*.65*dx,-y+r*.65*dz,lawn),'real circular aperture through lawn')
 assert(down(x+(r+.11)*dx,-y+(r+.11)*dz,lawn),'grass outside round coaming is retained')
}
assert(!down(x+r*.85,-y+r*.85,lid),'round lid cannot be a decorated rectangle')
assert(down(x+r*1.02,-y+r*1.02,lawn),'diagonal lawn corners are retained')
// Timber channel crowns cannot protrude through R04's lawn before the outboard flare.
const shells=meshes.filter(m=>m.name.includes('_round_shell'))
for(const x of [-2,0,2])for(const z of [-10,-8,8,10]){
 const hit=down(x,z,shells,height+2,1.97)
 assert(!hit,'channel roof must remain below grass in the lawn footprint '+[x,z])
}
console.log('PASS R14 single circular hatch/ladder, 15 restored lawn samples, real disc/shaft and below-deck channel crowns')
