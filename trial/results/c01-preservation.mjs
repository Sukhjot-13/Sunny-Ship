/** Per-node non-target geometry/material and exported collision preservation evidence. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import {readGLB,readAccessor,loadColliders} from '../../tests/glb.mjs'
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
function signatures(file){const g=readGLB(file),out={};for(const n of g.json.nodes){if(n.mesh===undefined||/^Circle038(?:\.|$)/.test(n.name))continue;const mesh=g.json.meshes[n.mesh];out[n.name]=sha(JSON.stringify({transform:[n.matrix,n.translation,n.rotation,n.scale],primitives:mesh.primitives.map(p=>({material:g.json.materials[p.material],attributes:Object.fromEntries(Object.entries(p.attributes).map(([key,index])=>[key,Array.from(readAccessor(g,index).data)])),indices:p.indices===undefined?null:Array.from(readAccessor(g,p.indices).data)}))}))}return out}
/** Preserve the complete retained shield extent and original material definitions. */
function shieldState(file){
 const g=readGLB(file),node=g.json.nodes.find(n=>n.name==='Circle038.001')
 assert(node,'original named shield remains')
 const box=loadColliders(file).find(n=>n.name===node.name)
 return {bounds:[box.min.toArray(),box.max.toArray()],materials:g.json.meshes[node.mesh].primitives.map(p=>g.json.materials[p.material])}
}
const shieldBefore=shieldState('trial/results/before-sunny.glb'),shieldAfter=shieldState('public/models/sunny.glb')
assert.deepEqual(shieldAfter,shieldBefore,'retained shield keeps complete exterior extent and palette')
const before=signatures('trial/results/before-sunny.glb'),after=signatures('public/models/sunny.glb'),changed=Object.keys(before).filter(k=>before[k]!==after[k]),added=Object.keys(after).filter(k=>!before[k])
const collisionBefore=sha(fs.readFileSync('trial/results/before-collision.glb')),collisionAfter=sha(fs.readFileSync('public/models/sunny-collision.glb'))
const oldMeta=JSON.parse(fs.readFileSync('trial/results/before-metadata.json')),meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const receipt={shieldBefore,shieldAfter,nonTargetNodes:Object.keys(before).length,changed,added,collisionBefore,collisionAfter,sourceFBX:sha(fs.readFileSync('stuff/1.FBX')),assets:Object.fromEntries(['sunny.glb','sunny-collision.glb','ship-metadata.json'].map(n=>[n,sha(fs.readFileSync('public/models/'+n))])),master:sha(fs.readFileSync('assets/sunny-master.blend'))}
fs.writeFileSync('trial/results/c01-preservation.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt))
assert.equal(changed.length,0,'all non-target exported geometry, normals, UVs and materials preserved');assert.equal(added.length,0,'no covering mesh added');assert.equal(collisionBefore,collisionAfter,'no collision workaround');assert.deepEqual(meta.interiors.rooms,oldMeta.interiors.rooms);assert.deepEqual(meta.interiors.doors,oldMeta.interiors.doors);assert.deepEqual(meta.interiors.foreEnclosures,oldMeta.interiors.foreEnclosures);assert.equal(receipt.sourceFBX,'8a770f19926e304cce1839fde4797fc1d98db5a49814f7b049e5a83be69cec10');console.log('PASS non-target geometry, physical collision, rooms, doors and source preserved')
