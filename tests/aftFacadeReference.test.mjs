/** R13 facade topology and real apertures in an actual exported candidate. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
const directory=process.env.REFERENCE_MODELS??'public/models'
const meta=JSON.parse(fs.readFileSync(path.join(directory,'ship-metadata.json')))
const glb=readGLB(path.join(directory,'sunny.glb')),parts=new Map()
const relevant=name=>name==='对象003'||name==='Line002'||name==='Tube008.001'||/^对象00[12]$/.test(name)||
 /^Sunny_(?:AftFrontOrnament|AquariumFrontPort|RoomPartition_aqua_fwd|Aquarium_shell|Door_AftEntrance)/.test(name)
function visit(index,parent){
 const node=glb.json.nodes[index],matrix=parent.clone().multiply(nodeMatrix(node))
 if(node.mesh!==undefined&&relevant(node.name)){
  const meshes=[]
  for(const primitive of glb.json.meshes[node.mesh].primitives){
   const geometry=new THREE.BufferGeometry()
   geometry.setAttribute('position',new THREE.BufferAttribute(readAccessor(glb,primitive.attributes.POSITION).data,3))
   if(primitive.indices!==undefined)geometry.setIndex(Array.from(readAccessor(glb,primitive.indices).data))
   const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))
   mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(matrix);meshes.push(mesh)
  }
  parts.set(node.name,{node,meshes})
 }
 for(const child of node.children??[])visit(child,matrix)
}
for(const root of glb.json.scenes[glb.json.scene??0].nodes)visit(root,new THREE.Matrix4())
const ray=(meshes,position,distance=2)=>new THREE.Raycaster(new THREE.Vector3(...position),new THREE.Vector3(1,0,0),0,distance).intersectObjects(meshes)
const doors=meta.interiors.doors,entry=doors.find(d=>d.id==='AftEntrance'),cy=meta.interiors.dockCentre[1]
assert(entry,'one central upper entrance is required')
assert(!doors.some(d=>['DiningEntrance','KitchenEntrance','DiningDoor'].includes(d.id)),'unsupported separated entrances/dividing-wall door must be removed')
assert.equal(doors.filter(d=>d.kind==='door'&&Math.abs(d.pos[0]-12.3)<.05).length,1)
assert(Math.abs(entry.pos[1]-cy)<.001,'upper entrance is on the centreline')
const story=meta.interiors.levels.F3G-meta.interiors.levels.F2A
assert(entry.height/story>.60&&entry.height/story<.80,'reference entry occupies most of the storey, rather than a tiny generic door')
const wall=parts.get('对象003').meshes
for(const across of [-.34,0,.34])for(const height of [.1,.9,1.75]){
 assert.equal(ray(wall,[entry.pos[0]-.8,entry.pos[2]+height,-entry.pos[1]+across],1.6).length,0,'actual entry wall is clear for the ordinary body')
}
const bounds=loadColliders(path.join(directory,'sunny.glb'))
assert(!bounds.some(b=>/^Sunny_(?:DiningWindow|AquariumWindow)_/.test(b.name)),'generic front sashes must not remain')
const motifs=bounds.filter(b=>/^Sunny_AftFrontOrnament[01]_glass$/.test(b.name))
assert.equal(motifs.length,2,'paired tall motifs around central entrance')
for(const motif of motifs){
 const c=motif.min.clone().add(motif.max).multiplyScalar(.5),h=motif.max.y-motif.min.y
 assert(h/story>.65&&h/story<.80,'tall facade silhouette follows the drawing')
 const record=meta.interiors.aftFacade.ornaments.find(r=>motif.name==='Sunny_'+r.id+'_glass')
 assert(record)
 const base=record.position[2],r=meta.interiors.aftFacade.ornamentRadius,lr=meta.interiors.aftFacade.lobeRadius
 for(const horizontal of [0,-r-lr*.55,r+lr*.55]){
  const origin=[12.3-.8,base+meta.interiors.aftFacade.lobeHeight,-record.position[1]+horizontal]
  assert.equal(ray(wall,origin,1.6).length,0,'actual round side lobes/main opening are cut')
  assert(ray(parts.get(motif.name).meshes,origin,1.6).length>0,'actual motif aperture is glazed')
 }
 const corner=[12.3-.8,base+h-.04,c.z+r*.9]
 assert(ray(wall,corner,1.6).length>0,'wall survives above the curved crown corners')
}
const lowerWalls=[...parts.entries()].filter(([name])=>name!=='对象003'&&
 (name==='Line002'||name==='Tube008.001'||/^对象00[12]$/.test(name)||/^Sunny_(?:RoomPartition_aqua_fwd|Aquarium_shell)/.test(name))).flatMap(([,p])=>p.meshes)
const ports=bounds.filter(b=>/^Sunny_AquariumFrontPort[0-3]_glass$/.test(b.name))
assert.equal(ports.length,4,'four round lower facade ports')
for(const port of ports){
 const c=port.min.clone().add(port.max).multiplyScalar(.5),width=port.max.z-port.min.z,height=port.max.y-port.min.y
 assert(Math.abs(width/height-1)<.005,'front port is round, not an arch')
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6,origin=[c.x-.65,c.y+height*.34*Math.cos(a),c.z+width*.34*Math.sin(a)]
  assert.equal(ray(lowerWalls,origin,1.3).length,0,'round port cuts all actual front layers')
  assert(ray(parts.get(port.name).meshes,origin,1.3).length>0,'real port pane fills its bore')
 }
 assert(ray(lowerWalls,[c.x-.65,c.y+height*.46,c.z+width*.46],1.3).length>0,'diagonal wall corners survive the circular opening')
}
console.log('PASS R13 single central upper entrance, two tall lobed motifs and four real circular lower ports',directory)
