import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import * as THREE from 'three'
import {decodeCollisionBoxes} from '../src/systems/collisionData.js'
import {meshGeometryHashes} from '../tests/meshGeometryHash.mjs'
import {readGLB, readAccessor, nodeMatrix} from '../tests/glb.mjs'

const [candidate,output,live='public/models']=process.argv.slice(2)
assert(candidate&&output,'Pass the isolated room generation and differential JSON path')
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const room=/^Sunny_(?:Aquarium_(?:armchair|bar|banquette|curtain|lounge|mast|panoramic|passage|reef|school|sector|side-?1_|sofa|stool|tank|valance|wine)|AquariumFloor_entry|RoomLamp_Aquarium_Bar)/
const [before,after]=[live,candidate].map(dir=>meshGeometryHashes(path.join(dir,'sunny.glb')))
const updated=Object.keys(after).filter(name=>after[name]!==before[name])
const removed=Object.keys(before).filter(name=>!(name in after))
assert([...updated,...removed].every(name=>name==='Line002'||room.test(name)), 'Only the Aquarium may change')
const metadata=JSON.parse(fs.readFileSync(path.join(candidate,'ship-metadata.json')))
const layout=metadata.interiors.rooms.find(item=>item.name==='Aquarium Bar').lounge
const [axial,transverse,vertical]=layout.entryBay
const clip=new THREE.Box3(new THREE.Vector3(axial[0],vertical[0],-transverse[1]),new THREE.Vector3(axial[1],vertical[1],-transverse[0])).expandByScalar(.035)

function untouchedHull(file){
 const glb=readGLB(file),triangles=[]
 function visit(index,parent){
  const node=glb.json.nodes[index],matrix=parent.clone().multiply(nodeMatrix(node))
  if(node.name==='Line002')for(const primitive of glb.json.meshes[node.mesh].primitives){
   const {data,count}=readAccessor(glb,primitive.attributes.POSITION)
   const indices=primitive.indices===undefined?Array.from({length:count},(_,i)=>i):readAccessor(glb,primitive.indices).data
   const world=Array.from({length:count},(_,i)=>new THREE.Vector3().fromArray(data,i*3).applyMatrix4(matrix))
   for(let i=0;i<indices.length;i+=3){
    const points=[world[indices[i]],world[indices[i+1]],world[indices[i+2]]]
    if(new THREE.Box3().setFromPoints(points).intersectsBox(clip))continue
    triangles.push(points.map(point=>point.toArray().map(value=>Math.round(value*1e5)).join(',')).sort().join('|'))
   }
  }
  for(const child of node.children??[])visit(child,matrix)
 }
 for(const index of glb.json.scenes[glb.json.scene??0].nodes)visit(index,new THREE.Matrix4())
 return triangles.sort()
}

const [oldHull,newHull]=[live,candidate].map(dir=>untouchedHull(path.join(dir,'sunny.glb')))
const firstDifference=oldHull.find((triangle,index)=>triangle!==newHull[index])
const sameHull=oldHull.length===newHull.length&&firstDifference===undefined
const [oldBytes,newBytes]=[live,candidate].map(dir=>fs.readFileSync(path.join(dir,'sunny-collision.glb')))
const [oldBoxes,newBoxes]=[oldBytes,newBytes].map(decodeCollisionBoxes)
const key=entry=>JSON.stringify([entry.isFloor,entry.box.min.toArray(),entry.box.max.toArray()])
const originalCounts=new Map()
for(const entry of oldBoxes){const hash=key(entry);if(!originalCounts.has(hash))originalCounts.set(hash,[]);originalCounts.get(hash).push(entry)}
const added=[]
for(const entry of newBoxes){const previous=originalCounts.get(key(entry));if(previous?.length)previous.pop();else added.push(entry)}
const vanished=[...originalCounts.values()].flat()
const encode=entry=>({name:entry.name,floor:entry.isFloor,min:entry.box.min.toArray(),max:entry.box.max.toArray()})
const record={candidate,unchangedMeshes:Object.keys(before).length-removed.length-updated.filter(name=>before[name]).length,
 hull:{sameHull,untouchedTriangles:[oldHull.length,newHull.length],firstDifference},
 removed:Object.fromEntries(removed.map(name=>[name,before[name]])),
 updated:Object.fromEntries(updated.map(name=>[name,{before:before[name]??null,after:after[name]}])),
 collision:{before:sha(oldBytes),after:sha(newBytes),counts:[oldBoxes.length,newBoxes.length],removed:vanished.map(encode),added:added.map(encode)}}
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n')
assert(sameHull,'Line002 triangles outside the measured interior opening must remain exact')
console.log('PASS actual Aquarium-only mesh differential including',oldHull.length,'untouched hull triangles; collision delta recorded')
