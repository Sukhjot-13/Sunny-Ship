/** Preserve independently recorded original bow shield first-hit positions and paint. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix} from './glb.mjs'
const baseline=JSON.parse(fs.readFileSync('tests/fixtures/fore-exterior-rays.json'))
const gltf=readGLB(process.argv[2]||'public/models/sunny.glb'),faces=[]
/** Resolve actual original shield triangles in Blender coordinates with their materials. */
function visit(index,parent){
 const n=gltf.json.nodes[index],m=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined&&/^Circle038(?:\.|$)/.test(n.name))for(const p of gltf.json.meshes[n.mesh].primitives){
  const a=readAccessor(gltf,p.attributes.POSITION),ids=p.indices===undefined?Array.from({length:a.count},(_,i)=>i):readAccessor(gltf,p.indices).data
  for(let i=0;i<ids.length;i+=3)faces.push({v:[0,1,2].map(j=>{const q=new THREE.Vector3(...a.data.slice(ids[i+j]*3,ids[i+j]*3+3)).applyMatrix4(m);return new THREE.Vector3(q.x,-q.z,q.y)}),material:gltf.json.materials[p.material]?.name})
 }
 for(const c of n.children??[])visit(c,m)
}
for(const i of gltf.json.scenes[gltf.json.scene??0].nodes)visit(i,new THREE.Matrix4())
assert(faces.length>100,'original shield retained')
/** Closest triangle surface on each frozen exterior ray; 1mm export allowance. */
function firstHit(origin,direction){
 const ray=new THREE.Ray(new THREE.Vector3(...origin),new THREE.Vector3(...direction)),point=new THREE.Vector3();let closest=null
 for(const f of faces)if(ray.intersectTriangle(...f.v,false,point)){const distance=point.distanceTo(ray.origin);if(!closest||distance<closest.distance)closest={distance,material:f.material}}
 return closest
}
for(const {origin,direction,hit} of baseline.rays){
 const actual=firstHit(origin,direction)
 assert.equal(!!actual,!!hit,'original exterior coverage retained')
 if(hit){assert(Math.abs(actual.distance-hit.distance)<=.001,`original exterior changed at ${origin}`);assert.equal(actual.material,hit.material,'original red/white paint ownership retained')}
}
console.log(`PASS C01 original exterior shield: ${baseline.rays.length} unchanged first-hit positions/materials`)

/** Read actual world-space retained hull primitives; no labels used as a visibility mask. */
function hull(file){
 const gltf=readGLB(file),meshes=[]
 function visit(i,parent){const n=gltf.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n));if(n.mesh!==undefined&&n.extras?.sunny_part==='hull')for(const p of gltf.json.meshes[n.mesh].primitives){const a=readAccessor(gltf,p.attributes.POSITION),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a.data,3));if(p.indices!==undefined)g.setIndex(Array.from(readAccessor(gltf,p.indices).data));g.computeBoundingSphere();const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.name=n.name;mesh.userData.material=gltf.json.materials[p.material]?.name;mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(m);meshes.push(mesh)}for(const c of n.children??[])visit(c,m)}
 for(const i of gltf.json.scenes[gltf.json.scene??0].nodes)visit(i,new THREE.Matrix4());return meshes
}
/** Nearest actual hull triangle hit with source material identity. */
function hit(meshes,o,d){const ray=new THREE.Raycaster(new THREE.Vector3(...o),new THREE.Vector3(...d));const h=ray.intersectObjects(meshes,false)[0];return h?{distance:h.distance,material:h.object.userData.material,name:h.object.name}:null}

const hullBaseline=JSON.parse(fs.readFileSync('tests/fixtures/fore-hull-rays.json'))
const hullMeshes=hull(process.argv[2]||'public/models/sunny.glb')
for(const r of hullBaseline.rays){
 const actual=hit(hullMeshes,r.origin,r.direction)
 assert.equal(!!actual,!!r.hit,'original fore hull/band coverage retained')
 if(actual){assert(Math.abs(actual.distance-r.hit.distance)<=.001,`fore hull/band exterior changed at ${r.origin}`);assert.equal(actual.material,r.hit.material,'original hull/band paint retained')}
}
console.log(`PASS C01 original fore hull/bands: ${hullBaseline.rays.length} unchanged first-hit positions/materials`)
