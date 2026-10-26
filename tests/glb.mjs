/**
 * Robust glTF accessor reader for the test harness.
 * Handles all component types + normalisation.
 */
import fs from 'node:fs'
import * as THREE from 'three'

const COMP_INFO = {
  5120: { Ctor: Int8Array, size: 1, get: (b, o) => b.readInt8(o) },
  5121: { Ctor: Uint8Array, size: 1, get: (b, o) => b.readUInt8(o) },
  5122: { Ctor: Int16Array, size: 2, get: (b, o) => b.readInt16LE(o) },
  5123: { Ctor: Uint16Array, size: 2, get: (b, o) => b.readUInt16LE(o) },
  5125: { Ctor: Uint32Array, size: 4, get: (b, o) => b.readUInt32LE(o) },
  5126: { Ctor: Float32Array, size: 4, get: (b, o) => b.readFloatLE(o) },
}
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 }

export function readGLB(path) {
  const buf = fs.readFileSync(path)
  if (buf.slice(0, 4).toString() !== 'glTF') throw new Error('not a GLB')
  const jsonLen = buf.readUInt32LE(12)
  const jsonType = buf.readUInt32LE(16)
  if (jsonType !== 0x4e4f534a) throw new Error('missing JSON chunk')
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'))
  const binHeader = 20 + jsonLen
  const binLen = buf.readUInt32LE(binHeader)
  const bin = buf.slice(binHeader + 8, binHeader + 8 + binLen)
  return { json, bin }
}

export function readAccessor(gltf, index) {
  const { json, bin } = gltf
  const acc = json.accessors[index]
  const bv = json.bufferViews[acc.bufferView]
  const info = COMP_INFO[acc.componentType]
  const n = NUM[acc.type]
  const stride = bv.byteStride || info.size * n
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0)
  const out = new Float32Array(acc.count * n)
  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < n; c++) {
      const v = info.get(bin, base + i * stride + c * info.size)
      if (acc.normalized) {
        if (acc.componentType === 5120) v = Math.max(v / 127, -1)
        else if (acc.componentType === 5121) v = v / 255
        else if (acc.componentType === 5122) v = Math.max(v / 32767, -1)
        else if (acc.componentType === 5123) v = v / 65535
      }
      out[i * n + c] = v
    }
  }
  return { data: out, count: acc.count, type: acc.type, n }
}

export function nodeMatrix(node) {
  if (node.matrix) return new THREE.Matrix4().fromArray(node.matrix)
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...(node.translation || [0, 0, 0])),
    new THREE.Quaternion(...(node.rotation || [0, 0, 0, 1])),
    new THREE.Vector3(...(node.scale || [1, 1, 1]))
  )
}

/** Load every mesh in a GLB as an axis-aligned world box. */
export function loadColliders(path) {
  const gltf = readGLB(path)
  const out = []

  const walk = (nodeIndex, parentMatrix, inheritedName) => {
    const node = gltf.json.nodes[nodeIndex]
    const m = new THREE.Matrix4().multiplyMatrices(parentMatrix, nodeMatrix(node))
    const name = node.name || inheritedName || 'node'

    if (node.mesh !== undefined) {
      const mesh = gltf.json.meshes[node.mesh]
      const mn = new THREE.Vector3(Infinity, Infinity, Infinity)
      const mx = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
      let tris = 0
      for (const prim of mesh.primitives) {
        if (prim.attributes.POSITION === undefined) continue
        const pos = readAccessor(gltf, prim.attributes.POSITION)
        for (let i = 0; i < pos.count; i++) {
          const v = new THREE.Vector3(
            pos.data[i * pos.n],
            pos.data[i * pos.n + 1],
            pos.data[i * pos.n + 2]
          ).applyMatrix4(m)
          mn.min(v)
          mx.max(v)
        }
        tris += prim.indices !== undefined
            ? gltf.json.accessors[prim.indices].count / 3
            : pos.count / 3
      }
      if (Number.isFinite(mn.x)) out.push({name,min:mn,max:mx,tris})
    }
    for (const child of node.children || []) walk(child, m, name)
  }

  const scene = gltf.json.scenes[gltf.json.scene ?? 0]
  const identity = new THREE.Matrix4()
  for (const root of scene.nodes) walk(root, identity, null)

  return out
}
