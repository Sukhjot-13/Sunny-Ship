import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import * as THREE from 'three'
import {loadColliders} from '../tests/glb.mjs'

const [model, output, ...fits] = process.argv.slice(2)
assert(model && output && fits.length, 'Pass the visual GLB, output JSON, and fitted camera reports')
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const bounds = loadColliders(model)
const vertical = new THREE.Vector3(0, 1, 0)
const rig = [
  {name:'fore', yard:'Cylinder004', mast:'Cylinder003'},
  {name:'main', yard:'Cylinder010', mast:'Cylinder007'},
].map(({name, yard, mast}) => {
  const spar = bounds.find(box => box.name === yard)
  const trunk = bounds.find(box => box.name === mast)
  assert(spar && trunk)
  const pivot = trunk.min.clone().lerp(trunk.max, .5)
  pivot.y = (spar.min.y + spar.max.y) / 2
  const centre = spar.min.clone().lerp(spar.max, .5)
  return {name, pivot, ends:[centre.clone().setZ(spar.min.z), centre.clone().setZ(spar.max.z)]}
})

function measureView(fit) {
  const {width, height, parameters, source, sourceSha256} = fit
  assert.equal(sha(source), sourceSha256, 'Drawing must match the original fit input')
  const camera = new THREE.PerspectiveCamera(parameters.fov, width / height, .1, 2000)
  camera.position.set(...parameters.position)
  camera.lookAt(...parameters.target)
  camera.rotateZ(parameters.roll)
  camera.updateMatrixWorld()
  const project = world => {
    const ndc = world.clone().project(camera)
    return new THREE.Vector2((ndc.x + 1) * width / 2, (1 - ndc.y) * height / 2)
  }
  const rows = rig.map(({name, pivot, ends}) => {
    const inferred = fit.inferredRig[`${name}Yard`]
    const sourceAxis = new THREE.Vector3(...inferred.worldOnMastPlane)
    const sourceShift = sourceAxis.sub(pivot)
    return { name, pivot:pivot.toArray(), span:ends[0].distanceTo(ends[1]), variants:[-75,-60,-45,-30,-15,0,15,30,45,60,75,90].map(degrees => {
      const angle = THREE.MathUtils.degToRad(degrees)
      const points = ends.map(end => end.clone().sub(pivot).applyAxisAngle(vertical, angle).add(pivot))
      const describe = positions => {
        const [first,last] = positions.map(project)
        return {ends:[first.toArray(),last.toArray()], horizontalPixels:Math.abs(last.x-first.x),
          slope:(last.y-first.y)/(last.x-first.x), lengthPixels:first.distanceTo(last)}
      }
      return {degrees, retainedHeight:describe(points),
        atInferredSourceJunction:describe(points.map(point => point.clone().add(sourceShift)))}
    })}
  })
  return {source, sourceSha256, camera:parameters, fitModelSha256:fit.modelSha256, rows}
}

const report = {model, modelSha256:sha(model), views:fits.map(file => measureView(JSON.parse(fs.readFileSync(file)))),
  note:'Axis-only sensitivity study using actual bounding sections and disclosed camera fits. Inferred junction is only a second projection origin. No mesh pose, attachment, or proposed canon angle is implied.'}
fs.writeFileSync(output, JSON.stringify(report,null,2)+'\n')
for(const view of report.views) for(const row of view.rows) {
  console.log(view.source,row.name,row.variants.map(variant=>`${variant.degrees}°:${variant.retainedHeight.horizontalPixels.toFixed(0)} px`).join(' '))
}
