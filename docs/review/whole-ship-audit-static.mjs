/** Read-only exported triangle probes. Findings, not a test acceptance suite. */
import fs from 'node:fs'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from '../../tests/glb.mjs'
const glb=readGLB('public/models/sunny.glb'),faces=[]
/** Collect exact exported world triangles, material and original mesh identity. */
function visit(i,parent){
 const n=glb.json.nodes[i],m=parent.clone().multiply(nodeMatrix(n))
 if(n.mesh!==undefined)for(const p of glb.json.meshes[n.mesh].primitives){
  const a=readAccessor(glb,p.attributes.POSITION),ix=p.indices!==undefined?readAccessor(glb,p.indices).data:Array.from({length:a.count},(_,i)=>i)
  for(let k=0;k<ix.length;k+=3)faces.push({name:n.name,material:glb.json.materials[p.material]?.name,v:Array.from(ix.slice(k,k+3),j=>new THREE.Vector3(...a.data.slice(j*3,j*3+3)).applyMatrix4(m))})
 }
 for(const child of n.children??[])visit(child,m)
}
for(const i of glb.json.scenes[glb.json.scene??0].nodes)visit(i,new THREE.Matrix4())
/** First independent ray intersections; no collider/AABB pass is implied. */
function hits(origin,direction,include,max=20){
 const ray=new THREE.Ray(new THREE.Vector3(...origin),new THREE.Vector3(...direction)),out=[]
 for(const f of faces){if(!include.test(f.name))continue;const p=ray.intersectTriangle(...f.v,false,new THREE.Vector3());if(p&&p.distanceTo(ray.origin)<max)out.push({name:f.name,material:f.material,distance:p.distanceTo(ray.origin),point:p.toArray()})}
 return out.sort((a,b)=>a.distance-b.distance).filter((v,i,a)=>i===0||v.name!==a[i-1].name||Math.abs(v.distance-a[i-1].distance)>.0001).slice(0,12)
}
const boxes=loadColliders('public/models/sunny.glb')
const probeCannon=prefix=>{
 const barrel=boxes.find(x=>x.name===prefix+'_barrel'),rim=boxes.find(x=>x.name===prefix+'_rim'),c=barrel.min.clone().add(barrel.max).multiplyScalar(.5),side=prefix.endsWith('1')&&!prefix.endsWith('-1')?-1:1
 const origin=[c.x,c.y,side<0?rim.min.z-.003:rim.max.z+.003]
 return {prefix,muzzleOrigin:origin,outward:[0,0,side],structuralHits:hits(origin,[0,0,side],/^(?!Sunny_(?:Quarters_cannon|Womens_cannon))(?:(?:Line|Tube|Box|Circle|NGon)\d|对象|Sunny_(?:ForeF|HullPort|InteriorWall|RoomPartition))/,20)}
}
const lid=boxes.find(x=>x.name==='Sunny_Hatch_SoldierDockHatch_lid')
const rails=boxes.filter(x=>/^Sunny_SoldierDockStair.*rail/.test(x.name)&&x.max.y>lid.max.y&&x.min.x<lid.max.x&&x.max.x>lid.min.x&&x.min.z<lid.max.z&&x.max.z>lid.min.z)
const report={notice:'Exact GLB visual triangle rays plus disclosed AABB candidates. Not continuous walking or proof of all surface fit.',triangleCount:faces.length,
 kotatsuPit:[[-24.26,-3.48],[-25.95,-3.48],[-24.26,-1.80]].map(([x,z])=>({origin:[x,-39.8,z],hits:hits([x,-39.8,z],[0,-1,0],/^(?:Line002|Sunny_(?:InteriorFloor|Kotatsu_sunken_floor|Quarters_kotatsu_well|ForeF1))/,3)})),
 cannonLines:['Sunny_Quarters_cannon1','Sunny_Quarters_cannon-1','Sunny_Womens_cannon1','Sunny_Womens_cannon-1'].map(probeCannon),
 lift:{mast:boxes.filter(x=>x.name==='Sunny_InteriorMainMast').map(x=>({name:x.name,min:x.min.toArray(),max:x.max.toArray()})),components:boxes.filter(x=>/dumbwaiter|mast_cupboard/.test(x.name)).map(x=>({name:x.name,min:x.min.toArray(),max:x.max.toArray()})),verticalStructuralHits:hits([16.05,-39.2,-1.287],[0,1,0],/^Sunny_(?:InteriorFloor|Aquarium_ceiling|AftF2|RoomPartition)/,10)},
 hatch:{lid:{min:lid.min.toArray(),max:lid.max.toArray()},railAABBCandidates:rails.map(x=>({name:x.name,min:x.min.toArray(),max:x.max.toArray(),aboveLid:x.max.y-lid.max.y}))},
 dockApertures:[-1,1].map(side=>({side:side<0?'starboard':'port',origin:[.495,-45.94072,side*25],direction:[0,0,-side],hits:hits([.495,-45.94072,side*25],[0,0,-side],/^(?:Line002|对象|Sunny_InteriorWall|Sunny_RoomPartition)/,25)})),
 lookoutContainedMeshes:boxes.filter(x=>x.min.y>29.1&&x.max.y<34.5&&x.min.x>-18&&x.max.x<-7).map(x=>x.name),
 absentNamedFixtures:['telescope','dumbbell','training','gym','binocular','speaker','capstan'].map(term=>({term,matches:boxes.filter(x=>x.name.toLowerCase().includes(term)).map(x=>x.name)}))}
fs.writeFileSync('docs/review/whole-ship-audit-static.json',JSON.stringify(report,null,2))
console.log(JSON.stringify({cannons:report.cannonLines,liftHits:report.lift.verticalStructuralHits,hatch:report.hatch,absent:report.absentNamedFixtures},null,2))
