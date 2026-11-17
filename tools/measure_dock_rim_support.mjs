import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import * as THREE from 'three'
import {readGLB, readAccessor, nodeMatrix} from '../tests/glb.mjs'

const [model, metadata, output] = process.argv.slice(2)
assert(model && metadata && output, 'Pass the visual GLB, metadata and output JSON')
const glb = readGLB(model)
const meta = JSON.parse(fs.readFileSync(metadata))
const fixed = []
const rims = []
const material = new THREE.MeshBasicMaterial({side:THREE.DoubleSide})

function collect(index, parent) {
  const node = glb.json.nodes[index]
  const world = parent.clone().multiply(nodeMatrix(node))
  if(node.mesh !== undefined && !node.extras?.sunny_dynamic) {
    for(const primitive of glb.json.meshes[node.mesh].primitives) {
      const position = readAccessor(glb, primitive.attributes.POSITION)
      const attribute = new THREE.BufferAttribute(position.data,3)
      const bounds = new THREE.Box3().setFromBufferAttribute(attribute).applyMatrix4(world)
      if(bounds.min.x>13 || bounds.max.x < -12 || bounds.max.y < -59 || bounds.min.y > -32) continue
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position',attribute)
      if(primitive.indices !== undefined) geometry.setIndex(Array.from(readAccessor(glb,primitive.indices).data))
      const mesh = new THREE.Mesh(geometry,material)
      mesh.name = node.name
      mesh.matrixAutoUpdate = false
      mesh.matrixWorld.copy(world)
      if(/^Sunny_Dock1_rim(?:\.\d+)?$/.test(node.name)) rims.push({mesh,bounds})
      else fixed.push({mesh,bounds})
    }
  }
  for(const child of node.children??[]) collect(child,world)
}

for(const index of glb.json.scenes[glb.json.scene??0].nodes) collect(index,new THREE.Matrix4())
const ray = new THREE.Raycaster()
const sides = meta.exterior.mechanisms.dockOpenings.map(opening=>{
  const centre = new THREE.Vector3(opening.centre[0],opening.centre[2],-opening.centre[1])
  const side = opening.side==='port'?1:-1
  const rim = rims.find(entry=>side*entry.bounds.min.z>0)
  assert(rim,opening.side)
  const near = fixed.filter(entry=>side*(side>0?entry.bounds.max.z:entry.bounds.min.z)>side*centre.z-3).map(entry=>entry.mesh)
  const outer = (rim.bounds.max.y-rim.bounds.min.y)/2
  const rimCentre = rim.bounds.getCenter(new THREE.Vector3())
  ray.set(rimCentre,new THREE.Vector3(1,0,0));ray.near=0;ray.far=Infinity
  const inner = ray.intersectObject(rim.mesh)[0]?.distance
  assert(inner>0 && inner<outer)
  const variants = [outer,inner/.8,inner/.75,inner/.7].map(radius=>{
    const samples = Array.from({length:96},(_,index)=>{
      const angle = index/96*Math.PI*2
      const origin = new THREE.Vector3(rimCentre.x+Math.cos(angle)*(radius-.08),rimCentre.y+Math.sin(angle)*(radius-.08),centre.z+side*3)
      ray.set(origin,new THREE.Vector3(0,0,-side));ray.near=0;ray.far=6
      const hit = ray.intersectObjects(near,false)[0]
      return {degrees:index*360/96,position:origin.toArray(),surface:hit?.object.name??null,
        inwardFromShutter:hit?hit.distance-3:null}
    })
    return {radius,openingRatio:inner/radius,aboveLawn:rimCentre.y+radius-meta.interiors.levels.F1,
      supportWithinOneMetre:samples.filter(sample=>sample.inwardFromShutter!==null&&Math.abs(sample.inwardFromShutter)<=1).length,samples}
  })
  return {side:opening.side,centre:centre.toArray(),outer,inner,clearChannelRadius:opening.clearRadius,variants}
})
fs.writeFileSync(output,JSON.stringify({model,modelSha256:crypto.createHash('sha256').update(fs.readFileSync(model)).digest('hex'),sides,
  note:'Visual-triangle support diagnostic only. Rays start outside the shutter and exclude the existing rim and dynamic geometry. A hit measures available backing near the proposed perimeter, not proven structural contact or new clearance.'},null,2)+'\n')
for(const {side,outer,inner,clearChannelRadius,variants} of sides) console.log(side,{outer,inner,clearChannelRadius,
  candidates:variants.map(({radius,openingRatio,aboveLawn,supportWithinOneMetre})=>[radius,openingRatio,aboveLawn,supportWithinOneMetre])})
