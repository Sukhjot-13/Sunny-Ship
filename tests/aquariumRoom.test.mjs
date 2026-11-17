import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import {loadColliders, readGLB, readAccessor, nodeMatrix} from './glb.mjs'
import {PLAYER_HEIGHT_M} from '../src/config/shipConfig.js'
import {PLAYER_RADIUS} from '../src/systems/doors.js'

const visual='public/models/sunny.glb'
const {interiors,exterior}=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const layout=interiors.rooms.find(room=>room.name==='Aquarium Bar').lounge
assert(layout,'The Aquarium must publish its actual layout')
const boxes=loadColliders(visual)
const find=name=>{
 const box=boxes.find(box=>box.name===`Sunny_${name}`)
 assert(box,`Missing authored part ${name}`)
 return box
}
const water=find('Aquarium_panoramic_water'), glass=find('Aquarium_panoramic_glass')
const passage=find('Aquarium_passage_underwater_glass'),mast=find('InteriorMainMast'),table=find('Aquarium_mast_table_deck')
const treads=boxes.filter(box=>/^Sunny_EnergyStair_tread\d+$/.test(box.name))
assert(treads.length>25)
assert(water.max.x<Math.min(...treads.map(box=>box.min.x))-.15,'Panoramic glass and its habitat leave the actual Energy shaft open')
assert(table.max.x<glass.max.x&&table.min.x<mast.min.x,'Ring table surrounds the real mast without hitting aquarium glass')
assert(passage.min.y-interiors.levels.F1>PLAYER_HEIGHT_M+.50,'Water ceiling leaves standing headroom')
const [ladderLower]=exterior.mechanisms.climbs.find(climb=>climb.id==='aquarium-ladder').points
assert(glass.min.x-ladderLower[0]>PLAYER_RADIUS+.28,'Panoramic wings are beyond the verified ladder route')
const doorway=interiors.doors.find(door=>door.id==='AquariumDoor')
const bay=layout.entryBay
assert(bay[0][0]>doorway.pos[0]+.7&&bay[1][1]-bay[1][0]>doorway.width,'The cleared bulkhead is inside the installed door, across its full width')
const collision=loadColliders('public/models/sunny-collision.glb')
const bulkhead=(start,end,mid)=>collision.filter(box=>/^COLL_Rail_Line002_/.test(box.name)&&
 box.max.x>start&&box.min.x<end&&box.max.z>mid-PLAYER_RADIUS&&box.min.z<mid+PLAYER_RADIUS&&
 box.max.y>interiors.levels.F1+.019&&box.min.y<interiors.levels.F1+PLAYER_HEIGHT_M)
for(const offset of [-.8,0,.8])assert.deepEqual(bulkhead(bay[0][0],bay[0][1],-doorway.pos[1]+offset),[],
 'The actual inherited collider must clear a full body at the inner entry')
for(const index of [0,1])for(const part of ['plinth','seat','back']) {
 const box=find(`Aquarium_banquette${index}_${part}`)
 assert(box.min.x<layout.centre[0]&&box.max.x<glass.max.x,`${part} curves around the lounge in front of the tank`)
}
assert.equal(boxes.filter(box=>/^Sunny_Aquarium_valance(?:\.\d+)?$/.test(box.name)).length,9)
assert.equal(boxes.filter(box=>/^Sunny_Aquarium_mast_sconce_glow(?:\.\d+)?$/.test(box.name)).length,3)
assert.equal(boxes.filter(box=>/^Sunny_Aquarium_wine_bottle(?:\.\d+)?$/.test(box.name)).length,18)

const glb=readGLB(visual),geometry=new Map()
function collect(index,parent){
 const node=glb.json.nodes[index],world=parent.clone().multiply(nodeMatrix(node))
 const role=node.extras?.sunny_aquarium_surface
 if(node.mesh!==undefined&&role){
  const vertices=glb.json.meshes[node.mesh].primitives.flatMap(primitive=>{
   const values=readAccessor(glb,primitive.attributes.POSITION)
   return Array.from({length:values.count},(_,i)=>new THREE.Vector3().fromArray(values.data,i*3).applyMatrix4(world))
  })
  geometry.set(node.name,{vertices,role,tags:node.extras})
 }
 for(const child of node.children??[])collect(child,world)
}
for(const index of glb.json.scenes[glb.json.scene??0].nodes)collect(index,new THREE.Matrix4())
const schools=[...geometry.entries()].filter(([,item])=>item.role==='fish')
assert.equal(schools.length,16,'Highlighted fish are real batched meshes in both tanks')
for(const [name,{vertices,tags}] of schools){
 const volume=name.includes('_passage_')?find('Aquarium_passage_ceiling_water'):water
 assert(tags.sunny_aquarium_swim?.length===2&&tags.sunny_obstacle!==true,name)
 assert(vertices.length>400&&vertices.every(point=>point.y>volume.min.y+.07&&point.y<volume.max.y-.07),`${name}: fish stay at real depths while swimming`)
}
assert.equal(geometry.get('Sunny_Aquarium_reef_display').role,'reef','Reef is batched without static obstacle properties')
console.log('PASS Aquarium glass, seating, water ceiling, fish depths, wine wall and unchanged body clearances')
