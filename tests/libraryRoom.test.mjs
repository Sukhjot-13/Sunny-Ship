import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import {loadColliders, readGLB} from './glb.mjs'
import {decodeCollisionBoxes} from '../src/systems/collisionData.js'
import {normalizeClimbs,pointAt} from '../src/systems/climbing.js'
import {PLAYER_HEIGHT_M} from '../src/config/shipConfig.js'
import {PLAYER_RADIUS} from '../src/systems/doors.js'
import {interiorSurfaceRole} from '../src/systems/realisticInterior.js'

const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const {libraryLayout}=meta.interiors.rooms.find(room=>room.name==='Library')
const boxes=loadColliders('public/models/sunny.glb'),glb=readGLB('public/models/sunny.glb').json
assert(libraryLayout&&libraryLayout.cases.length===8)
const finds=name=>boxes.find(box=>box.name===`Sunny_${name}`)
const panes=boxes.filter(box=>box.name.startsWith('Sunny_Library_lining_glass'))
for(const {caseIndex,bookcase,bay,boundVolumes} of libraryLayout.cases){
 assert.equal(bay%6,3,'cases align with opaque sections between original glass bays')
 const books=glb.nodes.find(node=>node.name===`Sunny_${bookcase}_bound_volumes`)
 assert.equal(books.extras.sunny_library_books,boundVolumes,caseIndex)
 assert(boundVolumes>=30,bookcase)
 const finishes=new Set(glb.meshes[books.mesh].primitives.map(p=>glb.materials[p.material].name))
 assert(finishes.has('Sunny_paper_library')&&[...finishes].filter(name=>interiorSurfaceRole({name})==='bookcloth').length>=4,bookcase)
 const back=finds(bookcase+'_back')
 assert(back&&back.max.y<=meta.interiors.levels.F3B-.17)
 const intersection=new THREE.Box3(back.min,back.max)
 assert(!panes.some(pane=>intersection.intersectsBox(new THREE.Box3(pane.min,pane.max))),bookcase+' must not blank a visible window')
}
for(const index of [0,1])for(const part of ['back','seat','plinth'])assert(finds(`Library_bench${index}_${part}`))
assert(finds('Library_survey_chart')&&finds('Library_central_table_marquetry'))
assert(!boxes.some(box=>box.name.startsWith('Sunny_BathStair')),'remove the long exterior-style stair from the Library')
const hatch=meta.interiors.doors.find(door=>door.id==='BathLadderHatch')
assert(hatch&&hatch.mode==='lift')
const path=normalizeClimbs(meta.exterior.mechanisms.climbs).find(path=>path.id==='library-bath-ladder')
assert.equal(path.hatch,hatch.id)
const [lower,upper]=[pointAt(path,0),pointAt(path,path.length)]
assert.equal(Math.round((upper[1]-lower[1])*100),305)
const collision=decodeCollisionBoxes(fs.readFileSync('public/models/sunny-collision.glb')).filter(({box})=>
 box.max.x>lower[0]-1&&box.min.x<upper[0]+1&&box.max.z>lower[2]-.85&&box.min.z<lower[2]+.85&&
 box.max.y>lower[1]-.3&&box.min.y<upper[1]+PLAYER_HEIGHT_M)
for(let sample=0;sample<=Math.ceil(path.length/.055);sample++){
 const [x,y,z]=pointAt(path,sample*.055)
 const blocker=collision.find(({box})=>box.max.x>x-PLAYER_RADIUS+.002&&box.min.x<x+PLAYER_RADIUS-.002&&
  box.max.z>z-PLAYER_RADIUS+.002&&box.min.z<z+PLAYER_RADIUS-.002&&box.max.y>y+.018&&box.min.y<y+PLAYER_HEIGHT_M)
 assert(!blocker,`${[x,y,z]} blocked by ${blocker?.name}`)
}
for(const [x,y,z] of [lower,upper])assert(collision.some(({isFloor,box})=>isFloor&&box.min.x<x&&box.max.x>x&&
 box.min.z<z&&box.max.z>z&&Math.abs(box.max.y-y)<.025),'Both ladder endpoints need actual walking support')
console.log('PASS fitted Library cases and bindings, two supported benches and full real Bath ladder clearance')
