/** Actual rounded lawn crowns with exact preservation of all other geometry. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import * as T from 'three'
import {meshGeometryHashes} from './meshGeometryHash.mjs'
import {loadColliders,readGLB,readAccessor,nodeMatrix} from './glb.mjs'
const dir=process.env.REFERENCE_MODELS??'public/models'
const baseline=JSON.parse(fs.readFileSync('tests/fixtures/lawn-crown-preservation.json'))
const meta=JSON.parse(fs.readFileSync(path.join(dir,'ship-metadata.json')))
if(meta.interiors.rooms.find(room=>room.name==='Aquarium Bar')?.lounge?.entryBay){
 const roomPatch=JSON.parse(fs.readFileSync('tests/fixtures/aquarium-room-delta.json'))
 for(const [name,hash] of Object.entries(roomPatch.removed)){
  assert.equal(baseline.meshes[name],hash,name+' previous fixture')
  delete baseline.meshes[name]
 }
 for(const [name,patch] of Object.entries(roomPatch.updated)){
  assert.equal(baseline.meshes[name]??null,patch.before,name+' previous fixture')
  baseline.meshes[name]=patch.after
 }
 baseline.collisionSha256=roomPatch.collisionSha256
}
const hashes=meshGeometryHashes(path.join(dir,'sunny.glb'))
const canopy=name=>/^Sunny_ShadeTree_(?:port|starboard)_(?:leaves|branch|twig)_batch/.test(name)
const retained=Object.keys(hashes).filter(name=>!canopy(name))
assert.equal(retained.length,Object.keys(baseline.meshes).length,'all unrelated meshes must survive')
for(const name of retained)assert.equal(hashes[name],baseline.meshes[name],name+' geometry/pose/materials/normals/UVs must remain exactly unchanged')
const collision=crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'sunny-collision.glb'))).digest('hex')
assert.equal(collision,baseline.collisionSha256,'every physical collider must remain byte-identical')
const bounds=loadColliders(path.join(dir,'sunny.glb'))
const glb=readGLB(path.join(dir,'sunny.glb'))
const roots=new Map()
function visit(index,parent){
 const node=glb.json.nodes[index],matrix=parent.clone().multiply(nodeMatrix(node))
 if(node.mesh!==undefined&&/^Sunny_ShadeTree_(?:port|starboard)_trunk$/.test(node.name)){
  const points=new Map()
  for(const primitive of glb.json.meshes[node.mesh].primitives){
   const a=readAccessor(glb,primitive.attributes.POSITION).data
   for(let i=0;i<a.length;i+=3){const p=new T.Vector3(...a.slice(i,i+3)).applyMatrix4(matrix);points.set(p.toArray().map(v=>v.toFixed(5)).join(','),p)}
  }
  // A leaning cylindrical trunk has a tilted cap. Its endpoint is the
  // centre of the lowest fourteen-vertex ring, not its lowest rim vertex.
  const ring=[...points.values()].sort((a,b)=>a.y-b.y).slice(0,14)
  assert.equal(ring.length,14)
  roots.set(node.name,ring.reduce((sum,p)=>sum.add(p),new T.Vector3()).multiplyScalar(1/14))
 }
 for(const child of node.children??[])visit(child,matrix)
}
for(const root of glb.json.scenes[glb.json.scene??0].nodes)visit(root,new T.Matrix4())
for(const side of ['port','starboard']){
 const prefix='Sunny_ShadeTree_'+side
 const trunk=bounds.find(b=>b.name===prefix+'_trunk')
 assert(Math.abs(roots.get(trunk.name).y-meta.interiors.levels.F1)<.001,'real trunk endpoint remains rooted on the actual lawn')
 const leaves=bounds.filter(b=>b.name.startsWith(prefix+'_leaves_batch'))
 assert.equal(leaves.length,2,'actual leaf geometry retains two material batches per tree')
 const low=leaves[0].min.clone(),high=leaves[0].max.clone()
 for(const b of leaves){low.min(b.min);high.max(b.max)}
 const ratio=(high.y-low.y)/Math.max(high.x-low.x,high.z-low.z)
 assert(ratio>.8&&ratio<1.2,'actual reconstructed crown retains rounded vertical depth')
 assert(glb.json.nodes.find(n=>n.name===prefix+'_trunk')?.extras?.sunny_crown_reference,'crown reconstruction/source limit remains recorded')
}
console.log('PASS two deep actual lawn crowns;',retained.length,'other meshes and the collision asset match the approved checkpoint fingerprints')
