/** Real reference-scale artifacts must match this exact working generation. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {loadColliders} from './glb.mjs'
const receipt=JSON.parse(fs.readFileSync('assets/reference/dimensions.json'))
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
assert.equal(receipt.sourceSha256,sha('assets/sunny-master.blend'),'reference master must derive from current working master')
assert.equal(receipt.workingVisualSha256,sha('public/models/sunny.glb'),'reference copy must match the actual current web model')
assert.equal(receipt.workingScale,2.2);assert.equal(receipt.referenceScale,1)
const source=loadColliders('public/models/sunny.glb'),reference=new Map(loadColliders('assets/reference/sunny-reference.glb').map(o=>[o.name,o]))
assert.equal(reference.size,source.length,'all reference geometry is retained')
for(const original of source){
 const scaled=reference.get(original.name);assert(scaled,original.name+' must survive normalization')
 for(const edge of ['min','max'])assert(scaled[edge].distanceTo(original[edge].clone().multiplyScalar(1/2.2))<.0001,original.name+' must have one uniform reversible scale')
}
assert(Math.abs(receipt.referenceBoundsBlender.size[0]-39)<.02)
assert(Math.abs(receipt.referenceBoundsBlender.size[2]-56)<.001)
console.log('PASS exact working/reference asset hashes and uniform 1/2.2 transform across',source.length,'real exported meshes')
