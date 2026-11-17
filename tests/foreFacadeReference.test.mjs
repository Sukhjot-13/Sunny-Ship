/** R09 actual fore facade handedness, ports, gallery support and entry clearance. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
import {normalizeClimbs,pointAt} from '../src/systems/climbing.js'
const directory=process.env.REFERENCE_MODELS??'public/models'
const meta=JSON.parse(fs.readFileSync(path.join(directory,'ship-metadata.json'))),glb=readGLB(path.join(directory,'sunny.glb'))
const parts=new Map(),walls=[]
const wallName=name=>/^Sunny_ForeF2_shell/.test(name)||['Line002','Line006','Tube008.001','对象001','对象002'].includes(name)
function visit(index,parent){
 const node=glb.json.nodes[index],matrix=parent.clone().multiply(nodeMatrix(node))
 if(node.mesh!==undefined&&(wallName(node.name)||/^Sunny_ForeFrontPort/.test(node.name))){
  const meshes=[]
  for(const primitive of glb.json.meshes[node.mesh].primitives){
   const geometry=new THREE.BufferGeometry()
   geometry.setAttribute('position',new THREE.BufferAttribute(readAccessor(glb,primitive.attributes.POSITION).data,3))
   if(primitive.indices!==undefined)geometry.setIndex(Array.from(readAccessor(glb,primitive.indices).data))
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))
   mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(matrix);mesh.userData.material=glb.json.materials[primitive.material]?.name;meshes.push(mesh)
  }
  parts.set(node.name,meshes);if(wallName(node.name))walls.push(...meshes)
 }
 for(const child of node.children??[])visit(child,matrix)
}
for(const root of glb.json.scenes[glb.json.scene??0].nodes)visit(root,new THREE.Matrix4())
const ray=(objects,p,distance)=>new THREE.Raycaster(new THREE.Vector3(...p),new THREE.Vector3(-1,0,0),0,distance).intersectObjects(objects)
const cy=meta.interiors.dockCentre[1],entry=meta.interiors.doors.find(d=>d.id==='WomensDoor')
assert(entry.pos[1]>cy,'R09 upper entry belongs on starboard, right viewed from the lawn')
assert.equal(meta.interiors.foreFacade?.ports.length,2,'R09 opposite pair of ports is required')
const visual=loadColliders(path.join(directory,'sunny.glb')),collision=loadColliders(path.join(directory,'sunny-collision.glb'))
const sourcePorts=meta.interiors.foreFacade.ports.map(record=>{
 const pane=visual.find(p=>p.name==='Sunny_'+record.id+'_glass'),rim=visual.find(p=>p.name==='Sunny_'+record.id+'_rim')
 assert(pane&&rim,'source ratio check needs actual exported clear pane and outer rim')
 return{centre:(pane.min.z+pane.max.z)/2,outer:rim.max.z-rim.min.z,clear:pane.max.z-pane.min.z}
})
const spacing=Math.abs(sourcePorts[1].centre-sourcePorts[0].centre),outer=sourcePorts.reduce((n,p)=>n+p.outer/2,0)
assert(spacing/outer>2.0&&spacing/outer<2.3,'actual pair spacing relative to outer circles must match the complete R09 source outlines')
assert(sourcePorts.every(p=>p.clear/p.outer>.52&&p.clear/p.outer<.60),'actual clear/outer circle ratio must retain R09’s broad annular rim')
const panel=visual.find(p=>p.name==='Box070'),panelSpan=panel.max.z-panel.min.z
const pairCentre=sourcePorts.reduce((sum,p)=>sum+p.centre/sourcePorts.length,0),panelFraction=(panel.max.z-pairCentre)/panelSpan
assert(panelFraction>.55&&panelFraction<.68,'source pair belongs over the port gallery panel, not over its stair gap')
assert(sourcePorts.every(p=>p.outer/panelSpan>.115&&p.outer/panelSpan<.15),'source circles retain their observed scale within that panel')
assert(sourcePorts.every(p=>p.centre-p.outer/2>panel.min.z&&p.centre+p.outer/2<panel.max.z),'both actual circles are above the intact gallery guard span')
for(const y of [cy-6-1.18,cy-6+1.18])assert(ray(walls,[-16.35,meta.interiors.levels.F2F+1.45,-y],5).length>0,'old misplaced port bores above the stair gap must be closed')
assert(!visual.some(p=>p.name.startsWith('Sunny_StorageStair')),'unsupported switchback must not protrude through the lawn-side entry')
assert(meta.exterior.mechanisms.climbs.some(p=>p.id==='storage-ladder'),'R09 storage connection is a real registered ladder')
const storage=normalizeClimbs(meta.exterior.mechanisms.climbs).find(p=>p.id==='storage-ladder')
for(let distance=0;distance<=storage.length;distance+=.1){
 const p=pointAt(storage,distance)
 const hit=collision.find(b=>b.name!=='COLL_Hull'&&!b.name.startsWith('COLL_Wall')&&
  p[0]+.34>b.min.x+.02&&p[0]-.34<b.max.x-.02&&p[2]+.34>b.min.z+.02&&p[2]-.34<b.max.z-.02&&p[1]+1.75>b.min.y+.02&&p[1]<b.max.y-.02)
 assert(!hit,'storage ladder full normal-body passage blocked by '+hit?.name)
}
for(const y of [cy-4,cy+4]){
 const hits=ray(parts.get('Line002'),[-12,meta.interiors.levels.F1+1.5,-y],8)
 assert(hits.length&&hits[0].object.userData.material==='Sunny_cream','R09 lower frontage must show cream rather than the old timber covering')
}
for(const record of meta.interiors.foreFacade.ports){
 assert(record.position[1]<cy,'both windows are on the opposite side from the upper entry')
 const name='Sunny_'+record.id+'_glass',pane=visual.find(p=>p.name===name)
 assert(pane&&collision.some(p=>p.name==='COLL_Solid_'+name),'real port pane is physically solid')
 const c=pane.min.clone().add(pane.max).multiplyScalar(.5),h=pane.max.y-pane.min.y,w=pane.max.z-pane.min.z
 assert(Math.abs(w/h-1)<.005,'upper fore port is circular')
 for(let i=0;i<16;i++){
  const a=i*Math.PI/8,p=[record.front+.8,c.y+h*.34*Math.cos(a),c.z+w*.34*Math.sin(a)]
  assert.equal(ray(walls,p,record.front-record.back+1.6).length,0,'actual fore wall layers must be open inside the port')
  assert(ray(parts.get(name),p,record.front-record.back+1.6).length>0,'real pane fills the cut opening')
 }
 assert(ray(walls,[record.front+.8,c.y+h*.46,c.z+w*.46],record.front-record.back+1.6).length>0,'diagonal wall corners survive a real circular cut')
}
assert(ray(walls,[-16.35,entry.pos[2]+.3,-(cy-7.55)],4).length>0,'unsupported old port-side doorway must not remain open below the new round ports')
for(const name of ['ForePortGallery','WomensDoorApproach']){
 const floor=visual.find(p=>p.name==='Sunny_'+name)
 assert(floor&&Math.abs(floor.max.y-meta.interiors.levels.F2F)<.001&&Math.abs(floor.max.y-floor.min.y-.12)<.001,'both real fore gallery strips need retained top/opaque underside')
 assert(name==='ForePortGallery'?floor.min.z>-cy:floor.max.z<-cy,'each gallery strip is on its source side')
 assert(collision.some(p=>p.name.startsWith('COLL_FloorExact_Sunny_'+name)),'exact actual bridge support supplements coarse grid')
}
for(const id of ['ForeDoor','ForeDoorStarboard','WomensDoor']){
 assert.equal(visual.filter(p=>p.name.startsWith('Sunny_ForeFacade'+id+'_')).length,20,'all broad jamb/arch segments must exist')
 const spec=meta.interiors.doors.find(d=>d.id===id)
 const margin=Math.min(.20,spec.width/2-.34-.04)
 const positions=id==='WomensDoor'?Array.from({length:Math.ceil((spec.pos[0]+.3-(meta.interiors.foreFacade.entryPassage.back-.3))/.15)+1},(_,i)=>Math.max(meta.interiors.foreFacade.entryPassage.back-.3,spec.pos[0]+.3-i*.15)):[spec.pos[0]-.3,spec.pos[0],spec.pos[0]+.3]
 for(const across of [-margin,0,margin])for(const x of positions){
  const feet=[x,spec.pos[2],-spec.pos[1]+across]
  const hit=collision.find(b=>b.name!=='COLL_Hull'&&!b.name.startsWith('COLL_Wall')&&b.max.x>feet[0]-.34&&b.min.x<feet[0]+.34&&b.max.z>feet[2]-.34&&b.min.z<feet[2]+.34&&b.max.y>feet[1]+.02&&b.min.y<feet[1]+1.75)
  assert(!hit,id+' normal body corridor blocked by '+hit?.name)
 }
}
console.log('PASS R09 actual upper entry side, paired circular ports, both solid galleries, all arch bands and unchanged normal-body corridor')
