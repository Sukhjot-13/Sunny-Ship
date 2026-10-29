/** Independent downward triangle samples through the current Dock and hull. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix} from '../../../tests/glb.mjs'

const file='public/models/sunny.glb', glb=readGLB(file), meshes=[]
function visit(i,parent){
 const n=glb.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined&&!n.extras?.sunny_dynamic)for(const p of glb.json.meshes[n.mesh].primitives){
  const a=readAccessor(glb,p.attributes.POSITION),geo=new THREE.BufferGeometry()
  geo.setAttribute('position',new THREE.BufferAttribute(a.data,3))
  if(p.indices!==undefined)geo.setIndex(Array.from(readAccessor(glb,p.indices).data))
  const box=new THREE.Box3().setFromBufferAttribute(geo.attributes.position).applyMatrix4(m)
  if(box.min.x>9||box.max.x< -8||box.min.z>20||box.max.z< -21||box.max.y< -60||box.min.y> -46)continue
  const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))
  mesh.name=n.name;mesh.matrixWorld.copy(m);mesh.matrixAutoUpdate=false;meshes.push(mesh)
 }
 for(const c of n.children??[])visit(c,m)
}
for(const i of glb.json.scenes[glb.json.scene??0].nodes)visit(i,new THREE.Matrix4())
const samples=[]
for(const x of [-2,0.495,3])for(const z of [-17,-15,-13,-11,-8,-5,-1.287,3,6,9,12,14,16]){
 const ray=new THREE.Raycaster(new THREE.Vector3(x,-46.8,z),new THREE.Vector3(0,-1,0),0,13)
 const hits=ray.intersectObjects(meshes).filter((h,i,a)=>i===0||h.object.name!==a[i-1].object.name||Math.abs(h.distance-a[i-1].distance)>.001)
 samples.push({x,z,hits:hits.slice(0,10).map(h=>({name:h.object.name,height:+h.point.y.toFixed(4)}))})
}
const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
fs.writeFileSync('docs/review/c03-20261029/floor-probe.json',JSON.stringify({notice:'Downward static triangle samples only; not a complete hull or collision survey.',source:file,sha256:hash,samples},null,2))
console.log(`Sampled ${samples.length} positions in ${file}`)
