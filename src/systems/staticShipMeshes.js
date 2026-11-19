import {Box3,Group,Mesh,Vector3} from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {isMovingShipNode} from './shipMotion.js'

function attributeLayout(geometry){
 return Object.entries(geometry.attributes).sort(([a],[b])=>a.localeCompare(b))
  .map(([name,attribute])=>`${name}:${attribute.array.constructor.name}:${attribute.itemSize}:${attribute.normalized}`)
  .join(',')
}

function isStaticMesh(mesh,root){
 if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.isInstancedMesh||mesh.isBatchedMesh||
  mesh.children.length||mesh.morphTargetInfluences)return false
 const {material,geometry}=mesh
 if(!material?.isMeshStandardMaterial||!material.visible||material.transparent||
  material.transmission>0||material.alphaTest>0||!material.depthWrite)return false
 if(geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity||
  Object.values(geometry.attributes).some(attribute=>!attribute.isBufferAttribute))return false
 if(!(mesh.userData.sunny_authored||mesh.parent.userData.sunny_authored))return false
 for(let node=mesh;node!==root;node=node.parent){
  if(!node.visible||node.layers.mask!==1||node.renderOrder!==0||node.userData.sunny_dynamic||
   node.userData.sunny_aquarium_surface||isMovingShipNode(node))return false
 }
 return mesh.matrix.determinant()>0
}

/** Merge nearby opaque fittings into render meshes with their existing materials. */
export function batchStaticShipMeshes(root){
 const groups=new Map(),sources=new Map(),batchGeometries=[]
 const bounds=new Box3(),center=new Vector3(),size=new Vector3()
 root.traverse(mesh=>{
  if(!isStaticMesh(mesh,root))return
  const {geometry,material,parent,castShadow,receiveShadow}=mesh
  if(!geometry.boundingBox)geometry.computeBoundingBox()
  bounds.copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld)
  bounds.getSize(size)
  if(Math.max(size.x,size.y,size.z)>12)return
  bounds.getCenter(center)
  const cell=[Math.floor(center.x/12),Math.floor(center.y/6),Math.floor(center.z/12)]
  const key=[parent.id,material.id,castShadow,receiveShadow,...cell,!!geometry.index,attributeLayout(geometry)].join('|')
  if(!groups.has(key))groups.set(key,[])
  groups.get(key).push(mesh)
 })

 for(const meshes of groups.values()){
  if(meshes.length<3)continue
  const copies=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrix))
  const geometry=mergeGeometries(copies)
  for(const copy of copies)copy.dispose()
  if(!geometry)continue

  const {parent,material,castShadow,receiveShadow}=meshes[0]
  const batch=new Mesh(geometry,material)
  batch.name='Static ship fittings'
  batch.castShadow=castShadow
  batch.receiveShadow=receiveShadow
  // Named source objects still provide the exact geometry for picking.
  batch.raycast=()=>{}
  parent.add(batch)
  batchGeometries.push(geometry)

  if(!sources.has(parent)){
   const group=new Group()
   group.name='Static source objects'
   group.visible=false
   parent.add(group)
   sources.set(parent,group)
  }
  sources.get(parent).add(...meshes)
 }
 return batchGeometries
}
