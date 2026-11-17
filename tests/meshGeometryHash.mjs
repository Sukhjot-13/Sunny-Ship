/** Actual material/attribute/index/world-pose fingerprints for preservation. */
import crypto from 'node:crypto'
import * as T from 'three'
import {readGLB,readAccessor,nodeMatrix} from './glb.mjs'
export function meshGeometryHashes(file){
 const g=readGLB(file),result={}
 function visit(index,parent){
  const node=g.json.nodes[index],matrix=parent.clone().multiply(nodeMatrix(node))
  if(node.mesh!==undefined){
   const hash=crypto.createHash('sha256');hash.update(JSON.stringify(matrix.elements))
   for(const primitive of g.json.meshes[node.mesh].primitives){
    hash.update(JSON.stringify(g.json.materials[primitive.material]))
    for(const key of Object.keys(primitive.attributes).sort()){
     const a=readAccessor(g,primitive.attributes[key]).data
     hash.update(key);hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength))
    }
    const a=readAccessor(g,primitive.indices).data
    hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength))
   }
   result[node.name]=hash.digest('hex')
  }
  for(const child of node.children??[])visit(child,matrix)
 }
 for(const root of g.json.scenes[g.json.scene??0].nodes)visit(root,new T.Matrix4())
 return result
}
