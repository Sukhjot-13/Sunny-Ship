/** Exported-triangle C01 regression, independent of source station-strip cuts. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB, readAccessor, nodeMatrix, loadColliders} from '/Users/sukhjot/.codex/worktrees/c01-c02-completion/test/tests/glb.mjs'

const meta = JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const volumes = meta.interiors.foreTrimVolumes
assert.deepEqual(volumes.map(v => v.level), ['B1', 'F1', 'F2F'])
// Float32 export at 40m has roughly 4 micrometre quantization.
const epsilon = 2e-5

/** Resolve indexed triangles through the complete exported node hierarchy. */
function triangles(file, predicate) {
  const gltf = readGLB(file), result = []
  function visit(index, parent) {
    const node = gltf.json.nodes[index]
    const matrix = parent.clone().multiply(nodeMatrix(node))
    if (node.mesh !== undefined && predicate(node.name)) {
      for (const primitive of gltf.json.meshes[node.mesh].primitives) {
        const positions = readAccessor(gltf, primitive.attributes.POSITION)
        const indices = primitive.indices === undefined
          ? Array.from({length: positions.count}, (_, i) => i)
          : readAccessor(gltf, primitive.indices).data
        for (let i = 0; i < indices.length; i += 3) {
          result.push([0, 1, 2].map(j => {
            const start = indices[i+j]*3
            const p = new THREE.Vector3(...positions.data.slice(start, start+3)).applyMatrix4(matrix)
            return new THREE.Vector3(p.x, -p.z, p.y) // Blender Z-up
          }))
        }
      }
    }
    for (const child of node.children || []) visit(child, matrix)
  }
  for (const root of gltf.json.scenes[gltf.json.scene ?? 0].nodes) visit(root, new THREE.Matrix4())
  return result
}

/** Measure actual 3D polygon area after intersection with convex half-spaces. */
function intersectionArea(triangle, planes) {
  let polygon = triangle
  for (const [normal, offset] of planes) {
    const clipped = []
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i+1)%polygon.length]
      const da = normal.dot(a)-offset, db = normal.dot(b)-offset
      if (da >= 0) clipped.push(a)
      if ((da >= 0) !== (db >= 0)) clipped.push(a.clone().lerp(b, da/(da-db)))
    }
    polygon = clipped
    if (polygon.length < 3) return 0
  }
  let area = 0
  for (let i = 1; i < polygon.length-1; i++) {
    area += polygon[i].clone().sub(polygon[0])
      .cross(polygon[i+1].clone().sub(polygon[0])).length()/2
  }
  return area
}

/** Earcut uses the complete outline, independently of source station strips. */
function prisms(volume) {
  const ring = volume.outline.map(p => new THREE.Vector2(...p))
  return THREE.ShapeUtils.triangulateShape(ring, []).map(indices => {
    const points = indices.map(i => ring[i])
    const turn = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]))
    if (turn < 0) points.reverse()
    return [
      ...points.map((a, i) => {
        const b = points[(i+1)%3]
        const normal = new THREE.Vector3(a.y-b.y, b.x-a.x, 0).normalize()
        const separation = Math.abs(ring.indexOf(a)-ring.indexOf(b))
        const boundary = separation === 1 || separation === ring.length-1
        // Only the actual outer construction boundary gets export clearance.
        // Internal earcut seams must remain covered even for vertical faces.
        return [normal, normal.x*a.x+normal.y*a.y+(boundary ? epsilon : 0)]
      }),
      [new THREE.Vector3(0, 0, 1), volume.bottom+epsilon],
      [new THREE.Vector3(0, 0, -1), -volume.top+epsilon],
    ]
  })
}

for (const enclosure of meta.interiors.foreEnclosures) {
  assert.deepEqual(volumes.find(v => v.level === enclosure.level).outline, enclosure.outline,
    'test volume must equal the existing physical fore outline')
}

const source = process.argv[2] || 'public/models/sunny.glb'
const shield = triangles(source, name => /^Circle038(?:\.|$)/.test(name))
assert(shield.length > 100, 'original useful shield remains exported')
const results = volumes.map(volume => {
  const cells = prisms(volume)
  const minX = Math.min(...volume.outline.map(p => p[0]))
  const maxX = Math.max(...volume.outline.map(p => p[0]))
  let area = 0, hits = 0
  for (const triangle of shield) {
    if (Math.max(...triangle.map(p => p.x)) < minX || Math.min(...triangle.map(p => p.x)) > maxX
      || Math.max(...triangle.map(p => p.z)) < volume.bottom
      || Math.min(...triangle.map(p => p.z)) > volume.top) continue
    let overlap = 0
    for (const planes of cells) overlap += intersectionArea(triangle, planes)
    if (overlap > 1e-7) { hits++; area += overlap; console.log('RESIDUAL',volume.level,overlap,JSON.stringify(triangle.map(p=>p.toArray()))) }
  }
  return {level: volume.level, hits, areaM2: area}
})
console.log('C01 exported shield / construction overlap:', JSON.stringify({source, results}))
assert(results.every(r => r.hits === 0),
  'no shield triangle may enter any fore floor/wall/ceiling construction volume')

// Box118 is the independently attributed low storage protrusion. Both imported
// dark bands retain their outboard/Dock surfaces; only fore B1 air is checked.
const bands = triangles(source, name => /^Box11[89](?:\.|$)/.test(name))
assert(bands.length > 100, 'useful original dark hull bands remain exported')
const storageCells = prisms(volumes[0]).map(p => [...p, [new THREE.Vector3(-1,0,0),9]])
let bandHits = 0, bandArea = 0
for (const triangle of bands) {
  if (Math.min(...triangle.map(p=>p.x)) > -9 || Math.max(...triangle.map(p=>p.z)) < volumes[0].bottom
      || Math.min(...triangle.map(p=>p.z)) > volumes[0].top) continue
  const area = storageCells.reduce((sum,p)=>sum+intersectionArea(triangle,p),0)
  if (area > 1e-7) { bandHits++; bandArea += area }
}
console.log('C01 exported dark bands / fore storage overlap:', JSON.stringify({bandHits,bandArea}))
assert.equal(bandHits, 0, 'no imported dark band may enter actual forward storage construction')

const colliders = loadColliders('public/models/sunny-collision.glb')
for (const level of ['F1', 'F2']) {
  assert(colliders.some(c => c.name.includes('Fore'+level+'_shell')), 'physical '+level+' lining retained')
}
assert(colliders.some(c => c.name.includes('InteriorWall_B1')), 'physical B1 lining retained')
for (const name of ["Men's Quarters", "Women's Quarters", 'Storage Room',
  'Men Starboard Cannon Closet', 'Men Port Cannon Closet',
  'Women Starboard Cannon Closet', 'Women Port Cannon Closet']) {
  assert(meta.interiors.rooms.some(r => r.name === name), 'room programme retained: '+name)
}
console.log('PASS C01: B1/F1/F2 envelopes clear; seven rooms and physical linings retained')
