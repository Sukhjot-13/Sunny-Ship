/** Independent actual hull first-hit guard covering the C01 white/black band stations. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix} from '../../../tests/glb.mjs'
/** Read actual world-space retained hull primitives; no labels used as a visibility mask. */
function hull(file){
 const gltf=readGLB(file),meshes=[]
 function visit(i,parent){const n=gltf.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n));if(n.mesh!==undefined&&n.extras?.sunny_part==='hull')for(const p of gltf.json.meshes[n.mesh].primitives){const a=readAccessor(gltf,p.attributes.POSITION),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a.data,3));if(p.indices!==undefined)g.setIndex(Array.from(readAccessor(gltf,p.indices).data));g.computeBoundingSphere();const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.name=n.name;mesh.userData.material=gltf.json.materials[p.material]?.name;mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(m);meshes.push(mesh)}for(const c of n.children??[])visit(c,m)}
 for(const i of gltf.json.scenes[gltf.json.scene??0].nodes)visit(i,new THREE.Matrix4());return meshes
}
/** Nearest actual hull triangle hit with source material identity. */
function hit(meshes,o,d){const ray=new THREE.Raycaster(new THREE.Vector3(...o),new THREE.Vector3(...d));const h=ray.intersectObjects(meshes,false)[0];return h?{distance:h.distance,material:h.object.userData.material,name:h.object.name}:null}
const file='docs/review/post-comparison-c01/exterior-band-rays.json'
if(process.argv[2]==='baseline'){
 const meshes=hull('/Users/sukhjot/codes/test/public/models/sunny.glb'),rays=[]
 for(const side of [-1,1])for(let x=-34;x<=-10;x+=.8)for(let y=-47;y<=-33;y+=.7){const origin=[x,y,side*35],direction=[0,0,-side];rays.push({origin,direction,hit:hit(meshes,origin,direction)})}
 fs.writeFileSync(file,JSON.stringify({notice:'Frozen original actual hull first hits at fore B1/F1/F2 band stations before integration; 1mm export allowance.',rays}));console.log('Stored original hull band guard',rays.length)
}else{
 const baseline=JSON.parse(fs.readFileSync(file)),meshes=hull('public/models/sunny.glb'),changed=[]
 for(const r of baseline.rays){const a=hit(meshes,r.origin,r.direction);if(!!a!==!!r.hit||(a&&(Math.abs(a.distance-r.hit.distance)>.001||a.material!==r.hit.material)))changed.push({...r,actual:a})}
 fs.writeFileSync('docs/review/post-comparison-c01/exterior-bands-check.json',JSON.stringify({rays:baseline.rays.length,changed},null,2));assert.equal(changed.length,0,'C01 retained hull/band exterior first hits');console.log('PASS C01 actual fore hull/band first-hit position and material guard',baseline.rays.length)
}
