import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {meshGeometryHashes} from '../tests/meshGeometryHash.mjs'
import {decodeCollisionBoxes} from '../src/systems/collisionData.js'

const [previous,next,output]=process.argv.slice(2)
assert(previous&&next&&output,'Pass the previous models directory, staged directory and output JSON')
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const [before,after]=[previous,next].map(directory=>meshGeometryHashes(path.join(directory,'sunny.glb')))
const [oldBytes,newBytes]=[previous,next].map(directory=>fs.readFileSync(path.join(directory,'sunny-collision.glb')))
const [oldBoxes,newBoxes]=[oldBytes,newBytes].map(decodeCollisionBoxes)
const fingerprint=box=>JSON.stringify([box.isFloor,box.box.min.toArray(),box.box.max.toArray()])
const original=new Map()
for(const box of oldBoxes){
 const id=fingerprint(box)
 if(!original.has(id))original.set(id,[])
 original.get(id).push(box)
}
const added=[]
for(const box of newBoxes){
 const match=original.get(fingerprint(box))
 if(match?.length)match.pop()
 else added.push(box)
}
const removed=[...original.values()].flat()
const describe=({name,isFloor,box})=>({name,isFloor,min:box.min.toArray(),max:box.max.toArray()})
const report={
 visual:{unchanged:Object.keys(before).filter(name=>after[name]===before[name]).length,
   removed:Object.fromEntries(Object.keys(before).filter(name=>!(name in after)).map(name=>[name,before[name]])),
   updated:Object.fromEntries(Object.keys(after).filter(name=>before[name]!==after[name]).map(name=>[name,{before:before[name]??null,after:after[name]}]))},
 collision:{sha256:[sha(oldBytes),sha(newBytes)],counts:[oldBoxes.length,newBoxes.length],removed:removed.map(describe),added:added.map(describe)},
}
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n')
console.log('Visual meshes:',report.visual.unchanged,'unchanged;',Object.keys(report.visual.removed).length,'removed;',Object.keys(report.visual.updated).length,'updated/added')
console.log('Collision shapes:',removed.length,'removed;',added.length,'added')
