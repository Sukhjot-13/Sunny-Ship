/** Package a verified lawn-only visual edit with its unchanged physical proxy.
 * Run from repo root: node tools/preserve_cosmetic_collision.mjs STAGE EVIDENCE
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import {meshGeometryHashes} from '../tests/meshGeometryHash.mjs'
import {readGLB} from '../tests/glb.mjs'
import {decodeCollisionBoxes} from '../src/systems/collisionData.js'
const [stage,evidence]=process.argv.slice(2)
assert(stage&&evidence,'stage and evidence directories required')
const source='public/models',baseline=JSON.parse(fs.readFileSync('tests/fixtures/lawn-crown-preservation.json'))
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex')
const hashes=meshGeometryHashes(path.join(stage,'sunny.glb'))
const canopy=name=>/^Sunny_ShadeTree_(?:port|starboard)_(?:leaves|branch|twig)_batch/.test(name)
assert.equal(Object.keys(hashes).filter(n=>!canopy(n)).length,Object.keys(baseline.meshes).length)
for(const [name,want] of Object.entries(baseline.meshes))assert.equal(hashes[name],want,name)
for(const node of readGLB(path.join(stage,'sunny.glb')).json.nodes.filter(n=>canopy(n.name)))
 assert(!node.extras?.sunny_walkable&&!node.extras?.sunny_obstacle&&!node.extras?.sunny_dynamic,'changed crowns must have no physical ownership')
const original=fs.readFileSync(path.join(source,'sunny-collision.glb'))
assert.equal(sha(original),baseline.collisionSha256,'source physics must match the frozen applied checkpoint')
const raw=fs.readFileSync(path.join(stage,'sunny-collision.glb'))
const oldBoxes=decodeCollisionBoxes(original),newBoxes=decodeCollisionBoxes(raw)
const key=o=>JSON.stringify([o.isFloor,o.box.min.toArray(),o.box.max.toArray()])
const remaining=new Map()
for(const box of oldBoxes){const k=key(box);if(!remaining.has(k))remaining.set(k,[]);remaining.get(k).push(box)}
const added=[]
for(const box of newBoxes){const rows=remaining.get(key(box));if(rows?.length)rows.pop();else added.push(box)}
const removed=[...remaining.values()].flat()
// This packaging operation is limited to the diagnosed single planar-row
// split. It cannot conceal a missing wall, altered step or new physical tree.
assert.equal(removed.length,1);assert.equal(added.length,3)
assert(removed[0].isFloor&&added.every(b=>b.isFloor))
const old=removed[0].box;added.sort((a,b)=>a.box.min.x-b.box.min.x)
let edge=old.min.x
const quantizedTop=Math.round(old.max.y*1e4)
for(const {box} of added){
 assert.equal(box.min.x,edge);edge=box.max.x
 assert.equal(box.min.z,old.min.z);assert.equal(box.max.z,old.max.z)
 assert([quantizedTop-1,quantizedTop,quantizedTop+1].some(q=>Math.fround(q/1e4)===box.max.y),'only existing four-decimal floor sampling variation is allowed in the raw diagnosis')
 assert.equal(Math.round((box.max.y-box.min.y)*1e4),Math.round((old.max.y-old.min.y)*1e4))
}
assert.equal(edge,old.max.x,'raw floor pieces cover the same complete row')
const oldSolid=oldBoxes.filter(b=>!b.isFloor),newSolid=newBoxes.filter(b=>!b.isFloor)
assert.deepEqual(newSolid.map(b=>[b.name,key(b)]),oldSolid.map(b=>[b.name,key(b)]),'all solids/guards keep exact geometry and order')
fs.mkdirSync(evidence,{recursive:true})
const rawCollision=path.join(evidence,'raw-builder-collision.glb')
assert(!fs.existsSync(rawCollision),'preserve prior raw evidence')
fs.writeFileSync(rawCollision,raw)
const metaFile=path.join(stage,'ship-metadata.json'),meta=JSON.parse(fs.readFileSync(metaFile))
fs.copyFileSync(metaFile,path.join(evidence,'raw-builder-metadata.json'))
meta.collision=JSON.parse(fs.readFileSync(path.join(source,'ship-metadata.json'))).collision
fs.writeFileSync(path.join(stage,'sunny-collision.glb'),original)
fs.writeFileSync(metaFile,JSON.stringify(meta,null,2))
const receipt={protectedMeshes:Object.keys(baseline.meshes).length,originalColliders:oldBoxes.length,
 rawBuilderColliders:newBoxes.length,rawBuilderSha256:sha(raw),retainedPhysicalSha256:sha(original),
 rawDifference:{removed:removed.map(key),added:added.map(key)},
 note:'Only nonphysical lawn crowns change. All other actual visual geometry is exact. Raw ray-cast floor sampling splits one unchanged row by one four-decimal quantization step; package the previously verified complete physical proxy unchanged, including its matching metadata counts. No controller/body/support tolerances change.'}
fs.writeFileSync(path.join(evidence,'physical-preservation.json'),JSON.stringify(receipt,null,2)+'\n')
console.log('PASS retained exact verified physical proxy after proving all',receipt.protectedMeshes,'support/solid/unrelated meshes unchanged; original raw builder evidence preserved')
