/** Actual boss/support rays, independently runnable against any published GLB. */
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix} from '../tests/glb.mjs'
const glb=readGLB(process.argv[2]??'public/models/sunny.glb'),parts=new Map()
function visit(i,parent){const n=glb.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined&&/^(?:Circle038|Cylinder05[0-5])(?:\.\d+)?$/.test(n.name)){
  const faces=[]
  for(const p of glb.json.meshes[n.mesh].primitives){const a=readAccessor(glb,p.attributes.POSITION),index=readAccessor(glb,p.indices).data
   for(let k=0;k<index.length;k+=3)faces.push(Array.from(index.slice(k,k+3),v=>new THREE.Vector3(...a.data.slice(v*3,v*3+3)).applyMatrix4(m)))}
  parts.set(n.name,faces)
 }
 for(const c of n.children??[])visit(c,m)}
for(const i of glb.json.scenes[glb.json.scene??0].nodes)visit(i,new THREE.Matrix4())
const shield=[...parts].find(([name])=>name.startsWith('Circle038'))[1],faults=[]
const hits=(faces,y,z)=>{const ray=new THREE.Ray(new THREE.Vector3(-100,y,z),new THREE.Vector3(1,0,0));return faces.flatMap(v=>{const p=ray.intersectTriangle(...v,false,new THREE.Vector3());return p?[p.x]:[]}).sort((a,b)=>a-b)}
for(const [name,faces]of parts){if(!name.startsWith('Cylinder'))continue
 const bb=new THREE.Box3().setFromPoints(faces.flat()),size=bb.getSize(new THREE.Vector3()),centre=bb.getCenter(new THREE.Vector3())
 for(const fraction of [0,.45,.85])for(let k=0;k<(fraction?8:1);k++){
  const angle=k*Math.PI/4,y=centre.y+size.y/2*fraction*Math.sin(angle),z=centre.z+size.z/2*fraction*Math.cos(angle),head=hits(faces,y,z),skin=hits(shield,y,z)
  if(head.length<2||skin.length<2)faults.push({name,fraction,angle,head,skin,y,z})
 }
}
console.log(JSON.stringify({file:process.argv[2]??'public/models/sunny.glb',faults},null,2))
process.exitCode=faults.length?1:0
