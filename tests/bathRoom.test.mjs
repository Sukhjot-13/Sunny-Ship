import assert from 'node:assert/strict'
import fs from 'node:fs'
import {readGLB,loadColliders} from './glb.mjs'
import {interiorSurfaceRole} from '../src/systems/realisticInterior.js'
const directory='public/models'
const meta=JSON.parse(fs.readFileSync(`${directory}/ship-metadata.json`))
const layout=meta.interiors.rooms.find(room=>room.name==='Bath').bathLayout
assert(layout,'Bath must publish its fitted basin')
const visual=loadColliders(`${directory}/sunny.glb`)
const find=label=>{
 const box=visual.find(box=>box.name===`Sunny_${label}`)
 assert(box,label)
 return box
}
const shell=find('Bath_tub_shell'),water=find('Bath_tub_water')
assert(shell.min.y>layout.centre[2]&&shell.min.y<layout.centre[2]+.025,'basin rests on the unchanged slab')
assert(shell.max.y>water.max.y+.22&&Math.abs(water.max.y-layout.waterline)<.001,'the visible waterline is recessed inside the actual rim')
for(const axis of ['x','z'])assert(water.min[axis]>shell.min[axis]+.20&&water.max[axis]<shell.max[axis]-.20,'water remains inside the rounded basin')
assert(find('Bath_wash_basin')&&find('Bath_wash_mirror')&&find('Bath_wash_towel_shelf'))
assert(find('Bath_wc_toilet_bowl')&&find('Bath_wc_book_shelf'))
assert(!visual.some(box=>box.name.startsWith('Sunny_Bath_wash_toilet')))
assert.equal(visual.filter(box=>/^Sunny_Bath_shower_head(?:\.\d+)?$/.test(box.name)).length,2)
assert(visual.filter(box=>/^Sunny_Bath_partition_lattice/.test(box.name)).length>=16)
const {json}=readGLB(`${directory}/sunny.glb`)
const names=key=>{
 const node=json.nodes.find(node=>node.name===`Sunny_${key}`)
 return json.meshes[node.mesh].primitives.map(primitive=>json.materials[primitive.material].name)
}
const floor=names('InteriorFloor_F3_bath')
for(const [material,role] of [['Sunny_bath_stone','bath-stone'],['Sunny_bath_cedar','boards']]){
 assert(floor.includes(material),material);assert.equal(interiorSurfaceRole({name:material}),role)
}
assert(names('Bath_tub_shell').includes('Sunny_bath_porcelain'))
assert.equal(interiorSurfaceRole({name:names('Bath_tub_water')[0]}),'bath-water')
console.log('PASS physical rounded Bath and contained water, separate wet/dry materials, showers and washroom furniture')
