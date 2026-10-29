/** Attribute visible remaining C01 pixels to actual exported mesh triangles. */
import fs from 'node:fs'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix} from '../../../tests/glb.mjs'
const gltf=readGLB('public/models/sunny.glb'),meshes=[]
/** Build only potentially visible fore/B1 triangles with original transforms. */
function visit(index,parent){
 const n=gltf.json.nodes[index],world=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined)for(const prim of gltf.json.meshes[n.mesh].primitives){
  const a=readAccessor(gltf,prim.attributes.POSITION),geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.BufferAttribute(a.data,3))
  if(prim.indices!==undefined)geometry.setIndex(Array.from(readAccessor(gltf,prim.indices).data))
  const box=new THREE.Box3().setFromBufferAttribute(geometry.attributes.position).applyMatrix4(world)
  if(box.max.x< -37||box.min.x> -9||box.max.y< -48||box.min.y> -39){geometry.dispose();continue}
  const label=gltf.json.materials[prim.material]?.name??'',material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide})
  const mesh=new THREE.Mesh(geometry,material);mesh.name=n.name;mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(world);mesh.userData={label,tags:n.extras??{}}
  meshes.push(mesh)
 }
 for(const c of n.children??[])visit(c,world)
}
for(const n of gltf.json.scenes[gltf.json.scene??0].nodes)visit(n,new THREE.Matrix4())
const pose=process.argv[3]?JSON.parse(process.argv[3]):{eye:[-15,-45.451,-1.287],target:[-23,-46.301,4]};const camera=new THREE.PerspectiveCamera(62,1440/900,.08,800);camera.position.fromArray(pose.eye);camera.lookAt(...pose.target);camera.updateMatrixWorld(true)
const ray=new THREE.Raycaster(),hits={}
const pixels=process.argv[2]?JSON.parse(process.argv[2]):Array.from({length:26},(_,j)=>45+j*12).flatMap(y=>Array.from({length:114},(_,i)=>[40+i*12,y]))
for(const [x,y] of pixels){
 ray.setFromCamera(new THREE.Vector2(x/1440*2-1,1-y/900*2),camera)
 const h=ray.intersectObjects(meshes,false)[0]
 if(!h||(!process.argv[3]&&!['Sunny_red','Sunny_white','Sunny_black'].includes(h.object.userData.label)))continue
 const key=h.object.name+':'+h.object.userData.label
 const row=hits[key]??={name:h.object.name,material:h.object.userData.label,pixels:0,samples:[],tags:h.object.userData.tags};row.pixels++
 if(row.samples.length<5)row.samples.push({pixel:[x,y],point:h.point.toArray(),distance:h.distance})
}
const result={notice:'Offline fixed-camera triangle attribution only; no geometry/material changes or walking claims.',meshes:meshes.length,eye:camera.position.toArray(),hits:Object.values(hits)}
fs.writeFileSync(`docs/review/post-comparison-c01/storage-attribution${process.argv[4]?'-'+process.argv[4]:process.argv[2]?'-selected':''}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
