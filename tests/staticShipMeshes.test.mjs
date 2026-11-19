import assert from 'node:assert/strict'
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Raycaster,Vector3} from 'three'
import {batchStaticShipMeshes} from '../src/systems/staticShipMeshes.js'

const root=new Group(),deck=new Group(),oak=new MeshStandardMaterial()
root.add(deck)
deck.position.set(1,2,3)
function fitting(name,x,material=oak){
 const mesh=new Mesh(new BoxGeometry(.6,.5,.5),material)
 mesh.name=name
 mesh.userData.sunny_authored=true
 mesh.position.set(x,1,1)
 mesh.rotation.y=.43
 mesh.scale.set(1,.85,1)
 mesh.castShadow=mesh.receiveShadow=true
 deck.add(mesh)
 return mesh
}
const pieces=[fitting('rail one',1),fitting('rail two',2),fitting('rail three',3)]
const glass=fitting('window',4,new MeshStandardMaterial({transparent:true,opacity:.2}))
const shutter=fitting('moving shutter',5)
shutter.userData.sunny_dock_shutter='port'
const door=fitting('door leaf',6)
door.userData.sunny_door=true
root.updateMatrixWorld(true)

const [merged]=batchStaticShipMeshes(root)
assert(merged)
root.updateMatrixWorld(true)
const batch=deck.getObjectByName('Static ship fittings')
assert.equal(batch.geometry,merged)
assert.equal(batch.material,oak)
assert(batch.castShadow&&batch.receiveShadow)
const points=merged.getAttribute('position'),uvs=merged.getAttribute('uv')
let offset=0
for(const piece of pieces){
 assert.equal(root.getObjectByName(piece.name),piece)
 assert.equal(piece.parent.visible,false)
 const source=piece.geometry.getAttribute('position'),sourceUV=piece.geometry.getAttribute('uv')
 for(let i=0;i<source.count;i++,offset++){
  const expected=new Vector3().fromBufferAttribute(source,i).applyMatrix4(piece.matrixWorld)
  const actual=new Vector3().fromBufferAttribute(points,offset).applyMatrix4(batch.matrixWorld)
  assert(actual.distanceTo(expected)<.00001)
  assert.equal(uvs.getX(offset),sourceUV.getX(i))
  assert.equal(uvs.getY(offset),sourceUV.getY(i))
 }
}
assert.equal(offset,points.count)
assert(glass.parent===deck&&shutter.parent===deck&&door.parent===deck)
const eye=new Vector3().setFromMatrixPosition(pieces[0].matrixWorld).add(new Vector3(0,0,4))
const [hit]=new Raycaster(eye,new Vector3(0,0,-1)).intersectObject(root,true)
assert.equal(hit.object,pieces[0])
console.log('PASS static batches preserve transforms, material, UVs, picking and independent moving or transparent objects')
