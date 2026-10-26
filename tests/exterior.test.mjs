/** Exported geometry regression: exterior walking surfaces must not overlap. */
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {readGLB,readAccessor,nodeMatrix,loadColliders} from './glb.mjs'
import {stepSupport} from '../src/systems/stepSupport.js'
const glb=readGLB('public/models/sunny.glb'),triangles=[],planeFaces=[]
const foreSurfaces=[],hullTriangles=[],foreRimPoints=[],foreContents=[]
const containerFaces=[],slideEnvelopeFaces=[]
const balconyRailPoints=new Map()
const maneFaces=new Map(),lionPoints=[]
const mouthParts=new Map()
const lionFeatures=new Map()
const fittingFaces=new Map(),sailHeadPoints=new Map()
const bowMountParts=new Map()
const bowShieldParts=new Map()
const lookoutParts=new Map()
const aftParts=new Map(),aftFloorFaces=[],aftTreads=new Map()
const exteriorLintelFaces=new Map()
const aftDoorArchParts=new Map()
const aquariumLowerParts=new Map()
const hullPortParts=new Map(),hullPortWallFaces=[]
const riggingFaces=new Map(),riggingPoints=new Map(),riggingTags=new Map()
const anchorParts=new Map()
const gaffTieParts=new Map()
const helmGuardPoints=[];let spareHelmPole=false,oldHelmGuard=false
const hatches=JSON.parse((await import('node:fs')).readFileSync('public/models/ship-metadata.json')).interiors.doors.filter(d=>d.kind==='hatch')
function visit(i,parent,inherited){
 const node=glb.json.nodes[i],matrix=parent.clone().multiply(nodeMatrix(node)),name=node.name||inherited
 if(node.mesh!==undefined)for(const p of glb.json.meshes[node.mesh].primitives){
  const pos=readAccessor(glb,p.attributes.POSITION),indices=p.indices!==undefined?readAccessor(glb,p.indices).data:Array.from({length:pos.count},(_,i)=>i)
  const riggingPart=/^(?:Cylinder00[3478]|Cylinder01[0-4]|Cylinder056|Plane00[4-8]|Sunny_MastPlatform_brace_|Sunny_Lookout_rope_yard_tie)/.test(name)
  if(riggingPart){
   const uv=p.attributes.TEXCOORD_0!==undefined?readAccessor(glb,p.attributes.TEXCOORD_0):null
   if(!riggingPoints.has(name))riggingPoints.set(name,[])
   riggingTags.set(name,node.extras??{})
   for(let k=0;k<pos.count;k++)riggingPoints.get(name).push({point:new THREE.Vector3(...pos.data.slice(k*3,k*3+3)).applyMatrix4(matrix),uv:uv?Array.from(uv.data.slice(k*2,k*2+2)):null})
  }
  if(name==='Plane004'||name==='Plane005'){
   const uv=p.attributes.TEXCOORD_0!==undefined?readAccessor(glb,p.attributes.TEXCOORD_0):null
   if(!sailHeadPoints.has(name))sailHeadPoints.set(name,[])
   if(uv)for(let k=0;k<pos.count;k++)if(Math.abs(uv.data[k*2+1])<1e-6)
    sailHeadPoints.get(name).push(new THREE.Vector3(...pos.data.slice(k*3,k*3+3)).applyMatrix4(matrix))
  }
  for(let k=0;k<indices.length;k+=3){
   const v=Array.from(indices.slice(k,k+3),i=>new THREE.Vector3(...pos.data.slice(i*3,i*3+3)).applyMatrix4(matrix))
   const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]))
   // Closed-body topology must include every exported triangle. The generic
   // normal filter below serves orientation/raycast classification and would
   // otherwise discard real 23–70 µm Boolean seam triangles from this skin.
   if(name==='对象003'||/^Sunny_AftF2_ceiling$/.test(name)||node.extras?.sunny_aft_window_id||/^Sunny_(?:DiningWindow\d+|AftSideWindow|AftRearWindow)/.test(name)){
    if(!aftParts.has(name))aftParts.set(name,{tags:node.extras??{},faces:[]})
    aftParts.get(name).faces.push({v,material:glb.json.materials[p.material]?.name})
   }
   if(/^Sunny_(?:Door_(?:DiningEntrance|KitchenEntrance)_leaf|(?:DiningEntrance|KitchenEntrance)_frame_|(?:DiningEntrance|KitchenEntrance)_handle)/.test(name)){
    if(!aftDoorArchParts.has(name))aftDoorArchParts.set(name,{tags:node.extras??{},faces:[]})
    aftDoorArchParts.get(name).faces.push(v)
   }
   if(name==='Line002'||name.startsWith('Sunny_Aquarium_shell_')||node.extras?.sunny_aquarium_window_id||/^Sunny_Aquarium(?:Side|Rear)Window/.test(name)){
    if(!aquariumLowerParts.has(name))aquariumLowerParts.set(name,{tags:node.extras??{},faces:[]})
    aquariumLowerParts.get(name).faces.push({v,material:glb.json.materials[p.material]?.name})
   }
   if(normal.length()<1e-7)continue
   normal.normalize()
   if(/^Sunny_RoomPartition_(?:aqua_fwd|DiningEntrance|KitchenEntrance)_lintel0$/.test(name)){
    if(!exteriorLintelFaces.has(name))exteriorLintelFaces.set(name,[])
    exteriorLintelFaces.get(name).push({normal:normal.clone(),material:glb.json.materials[p.material]?.name})
   }
   if(name==='Cylinder013'||/^Sunny_(?:MainGaff_roof_tie|LibraryRoof_toprim)(?:\.\d+)?$/.test(name)){
    if(!gaffTieParts.has(name))gaffTieParts.set(name,[])
    gaffTieParts.get(name).push(v)
   }
   if(/^(?:Sphere00[69]|NGon00[7]|NGon01[3489]|NGon020|Circle038(?:\.\d+)?|Sunny_Anchor_)/.test(name)){
    if(!anchorParts.has(name))anchorParts.set(name,{faces:[],tags:node.extras??{}})
    anchorParts.get(name).faces.push(v)
   }
   if(/^Sunny_HullPort\d+_(?:port|starboard)_(?:bore(?:_rear)?|frame|inner)$/.test(name)){
    if(!hullPortParts.has(name))hullPortParts.set(name,{tags:node.extras??{},faces:[]})
    hullPortParts.get(name).faces.push(v)
   }
   if(['Tube005','Tube009','Line004','Line007','Line002','Box118','Box119','Box121'].includes(name))hullPortWallFaces.push({name,v})
   if(/^(?:Box00[23]|Circle0(?:0[2-9]|1[0-8]))(?:\.\d+)?$/.test(name)){
    if(!bowMountParts.has(name))bowMountParts.set(name,{faces:[]})
    bowMountParts.get(name).faces.push({v,material:glb.json.materials[p.material]?.name})
   }
   if(/^Sunny_(?:InteriorFloor_F2_aft|InteriorFloor_F2_service|AftEntryDeck)$/.test(name)&&normal.y>.99)aftFloorFaces.push(v)
   if(/^Sunny_GardenStair_tread/.test(name)){
    if(!aftTreads.has(name))aftTreads.set(name,[]);aftTreads.get(name).push(v)
   }
   if(name==='Cylinder006'||name==='Sunny_Lookout_floor'||/^Sunny_Lookout_(?:pane\d+$|wall_)/.test(name)){
    if(!lookoutParts.has(name))lookoutParts.set(name,{tags:node.extras??{},faces:[]})
    lookoutParts.get(name).faces.push({v,material:glb.json.materials[p.material]?.name})
   }
   if(riggingPart){if(!riggingFaces.has(name))riggingFaces.set(name,[]);riggingFaces.get(name).push(v)}
   if(/^(?:Cylinder00[145]|Cylinder010|Sunny_SailTie_Plane00[45]\d+)$/.test(name)){
    if(!fittingFaces.has(name))fittingFaces.set(name,[])
    fittingFaces.get(name).push(v)
   }
   if(/^(?:Circle038|Cylinder05[0-5])(?:\.\d+)?$/.test(name)){
    if(!bowShieldParts.has(name))bowShieldParts.set(name,{faces:[]})
    bowShieldParts.get(name).faces.push({v,material:glb.json.materials[p.material]?.name})
   }
   if(/^Sunny_Mikan[0-2]_(?:pot|soil|rim)$/.test(name))containerFaces.push({name,v,normal})
   if(/^Sunny_(?:Slide_chute$|Slide_support(?:\.\d+)?$|AftEntryDeck$|Aquarium_ceiling$|Aquarium_shell_)/.test(name))slideEnvelopeFaces.push({name,v,normal})
   if(/^Sunny_SternBalcony_(?:rail|post)(?:\.\d+)?$/.test(name)){
    if(!balconyRailPoints.has(name))balconyRailPoints.set(name,[])
    balconyRailPoints.get(name).push(...v)
   }
   if(name==='Sphere001')lionPoints.push(...v)
   if(name==='Sphere005'||name.startsWith('Sunny_LionEye_')){
    if(!lionFeatures.has(name))lionFeatures.set(name,[])
    lionFeatures.get(name).push(v)
   }
   if(name==='Sphere001'||name==='Sphere002'||/^Sunny_Gaon_/.test(name)){
    if(!mouthParts.has(name))mouthParts.set(name,{tags:node.extras??{},faces:[]})
    mouthParts.get(name).faces.push({v,material:glb.json.materials[p.material]?.name})
   }
   if(/^Rectangle00[2-8](?:\.\d+)?$/.test(name)){if(!maneFaces.has(name))maneFaces.set(name,[]);maneFaces.get(name).push(v)}
   if(name==='Line002')hullTriangles.push(v)
   if(name==='Line006')foreRimPoints.push(...v)
   if(name==='Cylinder044')spareHelmPole=true
   if(name==='Box122')oldHelmGuard=true
   if(name==='Box122'||name==='Sunny_Helm_guard')helmGuardPoints.push(...v)
   if(/^Sunny_(?:Quarters_chest|RoomPartition_[qw]_cannon)/.test(name))foreContents.push({name,v})
   if(/^Sunny_ForeF[12]_(?:shell|ceiling)/.test(name))foreSurfaces.push({name,v,normal})
   const axis=[0,1,2].sort((a,b)=>Math.abs(normal.getComponent(b))-Math.abs(normal.getComponent(a)))[0]
   if(Math.abs(normal.getComponent(axis))<.9999)continue
   const projection=[0,1,2].filter(i=>i!==axis),points=v.map(p=>projection.map(i=>p.getComponent(i)))
   const face={name,axis,sign:Math.sign(normal.getComponent(axis)),height:v.reduce((s,p)=>s+p.getComponent(axis),0)/3,v:points,bounds:[Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[1]))]}
   planeFaces.push(face)
   if(axis===1)triangles.push(face)
  }
 }
 for(const c of node.children||[])visit(c,matrix,name)
}
for(const i of glb.json.scenes[glb.json.scene||0].nodes)visit(i,new THREE.Matrix4(),'')
function intersectionArea(subject,mask){
 let polygon=subject
 const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
 const sign=Math.sign(cross(mask[0],mask[1],mask[2]))
 for(let i=0;i<3;i++){
  const a=mask[i],b=mask[(i+1)%3],out=[]
  for(let j=0;j<polygon.length;j++){
   const p=polygon[j],q=polygon[(j+1)%polygon.length],dp=sign*cross(a,b,p),dq=sign*cross(a,b,q)
   if(dp>=0)out.push(p)
   if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t])}
  }
  polygon=out;if(polygon.length<3)return 0
 }
 return Math.abs(polygon.reduce((s,p,i)=>{const q=polygon[(i+1)%polygon.length];return s+p[0]*q[1]-q[0]*p[1]},0))/2
}
const exterior=/^Sunny_(?:Lawn(?:\.\d+)?$|GardenDeck(?:\.\d+)?$|ForedeckSupport|ForeLanding|ForeUpperLanding|AftEntryDeck|LawnSidewalk|ForeDoorApproach|ForeStarboardDoorApproach|AquariumDoorApproach|WomensDoorApproach|SternAccess_(?:floor|neck)(?:\.\d+)?$|SternBalcony_(?:floor|access)(?:\.\d+)?$|InteriorFloor_F3_library(?:\.\d+)?$)/
const buckets=new Map()
for(const t of triangles){const k=Math.round(t.height/.01);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(t)}
const overlaps=new Map()
for(const t of triangles.filter(t=>exterior.test(t.name))){
 const k=Math.round(t.height/.01)
 for(const o of [k-1,k,k+1].flatMap(k=>buckets.get(k)||[])){
  if(t.name===o.name||Math.abs(t.height-o.height)>.003)continue
  if(Math.min(t.bounds[1],o.bounds[1])-Math.max(t.bounds[0],o.bounds[0])<.0001||Math.min(t.bounds[3],o.bounds[3])-Math.max(t.bounds[2],o.bounds[2])<.0001)continue
  const area=intersectionArea(t.v,o.v)
  if(area>.0001){const key=[t.name,o.name].sort().join(' <> ');overlaps.set(key,(overlaps.get(key)||0)+area)}
 }
}
assert.equal(overlaps.size,0,'coplanar exterior area remains: '+JSON.stringify([...overlaps]))
console.log('PASS exported exterior has no coplanar overlap above 1 cm² within 3 mm of walking planes')

// Room floors need the same physical ownership rule as the outside decks.
// Check actual exported top triangles, including tiled material partitions;
// hidden opposing bottoms of solid furnishings are not competing floor tops.
const roomFloor=/^Sunny_(?:InteriorFloor_|AquariumFloor_)/
const interiorTop=triangles.filter(t=>t.sign>0&&roomFloor.test(t.name))
const interiorOverlap=new Map()
for(const t of interiorTop){
 const k=Math.round(t.height/.01)
 for(const o of [k-1,k,k+1].flatMap(k=>buckets.get(k)||[])){
  if(t.name===o.name||o.sign<0||Math.abs(t.height-o.height)>.003)continue
  if(!(roomFloor.test(o.name)||exterior.test(o.name)||o.name==='Line002'))continue
  if(Math.min(t.bounds[1],o.bounds[1])-Math.max(t.bounds[0],o.bounds[0])<.0001||Math.min(t.bounds[3],o.bounds[3])-Math.max(t.bounds[2],o.bounds[2])<.0001)continue
  const area=intersectionArea(t.v,o.v)
  if(area>.0001){const key=[t.name,o.name].sort().join(' <> ');interiorOverlap.set(key,(interiorOverlap.get(key)||0)+area)}
 }
}
assert.equal(interiorOverlap.size,0,'competing interior floor tops: '+JSON.stringify([...interiorOverlap]))
console.log('PASS all room floor tops have one physical surface owner, including tiled service and Aquarium floors')

// Inspect the visible tops and inner walls of every real hatch coaming.
// Its outer wall touches the surrounding floor and is buried in that join;
// the inner wall must have one visible owner, including from below the lid.
const rimFaces=planeFaces.filter(t=>{
 const d=hatches.find(d=>t.name.startsWith(`Sunny_Hatch_${d.id}_frame_`));if(!d)return false
 if(t.axis===1)return true
 const xFrame=t.name.includes('_frame_x'),direction=xFrame?[Math.cos(d.rot),-Math.sin(d.rot)]:[Math.sin(d.rot),Math.cos(d.rot)]
 const axis=Math.abs(direction[0])>.9999?0:Math.abs(direction[1])>.9999?2:-1
 const centre=axis===0?d.pos[0]:-d.pos[1],half=(xFrame?d.width:d.depth)/2
 return t.axis===axis&&Math.abs(Math.abs(t.height-centre)-half)<.003
})
assert(rimFaces.filter(t=>t.axis!==1).length>=hatches.length*8,'every hatch needs four exported inner coaming walls')
const planes=new Map(),rimOverlaps=new Map()
for(const t of planeFaces){const k=`${t.axis}:${Math.round(t.height/.01)}`;if(!planes.has(k))planes.set(k,[]);planes.get(k).push(t)}
for(const t of rimFaces)for(const o of [-1,0,1].flatMap(d=>planes.get(`${t.axis}:${Math.round(t.height/.01)+d}`)||[])){
 // Opposing faces meet inside a sealed solid join (lid/rim or bar/bar).
 // Equal-facing surfaces compete for the same externally visible pixels.
 if(t.name===o.name||t.sign!==o.sign||Math.abs(t.height-o.height)>.003)continue
 if(Math.min(t.bounds[1],o.bounds[1])-Math.max(t.bounds[0],o.bounds[0])<.0001||Math.min(t.bounds[3],o.bounds[3])-Math.max(t.bounds[2],o.bounds[2])<.0001)continue
 const area=intersectionArea(t.v,o.v)
 if(area>.0001){const key=[t.name,o.name].sort().join(' <> ');rimOverlaps.set(key,(rimOverlaps.get(key)||0)+area)}
}
assert.equal(rimOverlaps.size,0,'visible hatch coaming faces overlap: '+JSON.stringify([...rimOverlaps]))
console.log('PASS all five hatch coaming tops and inner walls have one visible surface owner')

// The shared Library ceiling / Bath floor is visible from below and above.
// Check both faces against the entire export; embedded, opposite-facing solid
// joins are allowed, but two surfaces facing the same observer are not.
const sharedCabin=triangles.filter(t=>/^Sunny_(?:Library_ceiling|InteriorFloor_F3_bath)$/.test(t.name))
const cabinOverlaps=new Map()
for(const t of sharedCabin){
 const k=Math.round(t.height/.01)
 for(const o of [k-1,k,k+1].flatMap(k=>buckets.get(k)||[])){
  if(t.name===o.name||t.sign!==o.sign||Math.abs(t.height-o.height)>.003)continue
  if(Math.min(t.bounds[1],o.bounds[1])-Math.max(t.bounds[0],o.bounds[0])<.0001||Math.min(t.bounds[3],o.bounds[3])-Math.max(t.bounds[2],o.bounds[2])<.0001)continue
  const area=intersectionArea(t.v,o.v)
  if(area>.0001){const key=[t.name,o.name].sort().join(' <> ');cabinOverlaps.set(key,(cabinOverlaps.get(key)||0)+area)}
 }
}
assert.equal(cabinOverlaps.size,0,'shared Library/Bath surfaces overlap: '+JSON.stringify([...cabinOverlaps]))
for(const name of ['Sunny_Library_ceiling','Sunny_InteriorFloor_F3_bath']){
 const top=sharedCabin.filter(t=>t.name===name&&t.sign>0),bottom=sharedCabin.filter(t=>t.name===name&&t.sign<0)
 assert(top.length>0&&bottom.length>0,`${name} needs its actual floor and opaque ceiling underside`)
 assert(Math.abs(top[0].height-bottom[0].height-.18)<.003,`${name} must match the 18 cm structural collision slab`)
}
console.log('PASS shared Library/Bath slab has opaque 18 cm undersides and no competing visible faces')

// F1/F2 show a rounded bow enclosure. The old rectangular lining poked
// through the retained hull despite every room centre being reachable.
// Inspect the actual exported silhouette and independent hull intersections.
const forePlanes=triangles.filter(t=>/^Sunny_(?:ForeF[12]_ceiling|InteriorFloor_F[12]_fore)$/.test(t.name)),foreOverlaps=new Map()
for(const t of forePlanes){
 const k=Math.round(t.height/.01)
 for(const o of [k-1,k,k+1].flatMap(k=>buckets.get(k)||[])){
  if(t.name===o.name||t.sign!==o.sign||Math.abs(t.height-o.height)>.003)continue
  if(Math.min(t.bounds[1],o.bounds[1])-Math.max(t.bounds[0],o.bounds[0])<.0001||Math.min(t.bounds[3],o.bounds[3])-Math.max(t.bounds[2],o.bounds[2])<.0001)continue
  const area=intersectionArea(t.v,o.v)
  if(area>.0001){const key=[t.name,o.name].sort().join(' <> ');foreOverlaps.set(key,(foreOverlaps.get(key)||0)+area)}
 }
}
assert.equal(foreOverlaps.size,0,'forward floors/ceilings have competing visible surfaces: '+JSON.stringify([...foreOverlaps]))
for(const name of ['Sunny_ForeF1_ceiling','Sunny_ForeF2_ceiling']){
 const faces=foreSurfaces.filter(t=>t.name===name),points=faces.flatMap(t=>t.v)
 assert(points.length>0,`${name} must retain its physical enclosure`)
 const minX=Math.min(...points.map(p=>p.x)),width=Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z))
 const nose=points.filter(p=>p.x<minX+.15)
 assert(Math.max(...nose.map(p=>p.z))-Math.min(...nose.map(p=>p.z))<width*.35,`${name} must narrow at the rounded bow instead of ending in a full-width rectangle`)
 const top=faces.filter(t=>t.normal.y>.99),bottom=faces.filter(t=>t.normal.y<-.99)
 assert(top.length&&bottom.length,`${name} needs an opaque supported underside`)
 assert(Math.abs(top[0].v[0].y-bottom[0].v[0].y-.18)<.003,`${name} must match its 18 cm collision slab`)
}
const centreZ=-.585*2.2,checked=new Set()
for(const face of foreSurfaces.filter(t=>t.name.includes('_shell')))for(const p of face.v){
 // The retained curved hull ends before the reconstructed aft door transfer.
 // Check the actual bow/side curve, where the original source is continuous.
 if(p.x> -21.5)continue
 const key=p.toArray().map(v=>v.toFixed(4)).join(':');if(checked.has(key))continue
 checked.add(key)
 for(const direction of [-1,1]){
  let distance=Infinity
  // Float32 shared cut edges can reject an exact-edge ray. Check both
  // adjacent 0.1 mm sections and use their nearest boundary conservatively.
  for(const offset of [-.0001,0,.0001]){
   const ray=new THREE.Ray(new THREE.Vector3(p.x+offset,p.y,centreZ),new THREE.Vector3(0,0,direction))
   for(const triangle of hullTriangles){const hit=ray.intersectTriangle(...triangle,false,new THREE.Vector3());if(hit)distance=Math.min(distance,hit.distanceTo(ray.origin))}
  }
  assert(Number.isFinite(distance),`${face.name} needs a real source hull section at ${key}`)
  assert(direction*(p.z-centreZ)<=distance-.03,`${face.name} extends through its source hull at ${key}`)
 }
}
assert(checked.size>60,'both forward curved enclosures need dense exported containment coverage')
console.log('PASS both rounded fore enclosures have opaque 18 cm ceilings and stay inside the retained hull curve')

// The F3 helm floor must fit the curved retained rim, not an unsupported
// rectangular bridge. Check the actual export against the independent rim
// footing projection in 72 directions, including the bow end and both sides.
const helmFloor=triangles.filter(t=>t.name==='Sunny_ForedeckSupport'&&t.sign>0)
assert(helmFloor.length,'the helm needs a real structural walking floor')
const helmHeight=helmFloor[0].height,rim=foreRimPoints.filter(p=>Math.abs(p.y-helmHeight)<.003)
const helmUnderside=triangles.filter(t=>t.name==='Sunny_ForedeckSupport'&&t.sign<0)
assert(helmUnderside.length&&helmUnderside.every(t=>Math.abs(helmHeight-t.height-.18)<.003),'the helm floor needs its opaque 18 cm structural underside')
assert(rim.length>60,'the retained rim must provide its actual foot contour')
const helmPoints=helmFloor.flatMap(t=>t.v),bowX=Math.min(...helmPoints.map(p=>p[0]))
const rimBowX=Math.min(...rim.map(p=>p.x)),helmWidth=Math.max(...helmPoints.map(p=>p[1]))-Math.min(...helmPoints.map(p=>p[1]))
assert(bowX>=rimBowX+.04&&bowX<rimBowX+.4,'the helm floor bow must end inside the sourced rim')
const helmNose=helmPoints.filter(p=>p[0]<bowX+.15)
assert(Math.max(...helmNose.map(p=>p[1]))-Math.min(...helmNose.map(p=>p[1]))<helmWidth*.35,'the helm floor must narrow at the curved bow')
for(let i=0;i<72;i++){
 const a=i*Math.PI/36,dx=Math.cos(a),dz=Math.sin(a),boundary=Math.max(...rim.map(p=>p.x*dx+p.z*dz))
 assert(helmPoints.every(p=>p[0]*dx+p[1]*dz<=boundary+.003),`helm support projects outside the real rim in direction ${i}`)
}
console.log('PASS curved helm floor has an opaque 18 cm underside and stays within the retained rim foot contour')

// No chest or forward cannon-room partition may protrude through the shell.
const contentsChecked=new Set()
for(const face of foreContents)for(const p of face.v){
 if(p.x>-21.5)continue
 const key=face.name+':'+p.toArray().map(v=>v.toFixed(4)).join(':');if(contentsChecked.has(key))continue
 contentsChecked.add(key)
 for(const direction of [-1,1]){
  let distance=Infinity
  for(const offset of [-.0001,0,.0001]){
   const ray=new THREE.Ray(new THREE.Vector3(p.x+offset,p.y,centreZ),new THREE.Vector3(0,0,direction))
   for(const triangle of hullTriangles){const hit=ray.intersectTriangle(...triangle,false,new THREE.Vector3());if(hit)distance=Math.min(distance,hit.distanceTo(ray.origin))}
  }
  assert(Number.isFinite(distance)&&direction*(p.z-centreZ)<=distance-.03,`${face.name} protrudes through the source hull`)
 }
}
assert(contentsChecked.size>40,'forward chest and partitions need actual containment coverage')
const metadata=JSON.parse((await import('node:fs')).readFileSync('public/models/ship-metadata.json'))
assert.equal(metadata.interiors.foreEnclosures?.length,2,'both reconstructed fore outlines must reach the published metadata')
console.log('PASS forward chest/partitions remain enclosed and both fore plans are published')

assert(helmGuardPoints.length>30,'retain the real curved helm enclosure')
const guardLow=Math.min(...helmGuardPoints.map(p=>p.y)),guardHigh=Math.max(...helmGuardPoints.map(p=>p.y))
assert(guardHigh-guardLow>=.95&&guardHigh-guardLow<=1.15,'the helm rail must remain normal human height, not a three-metre barrier')
assert(Math.abs(guardLow-helmHeight)<.02,'helm enclosure posts must be supported by the actual deck')
assert(!spareHelmPole&&!oldHelmGuard,'old oversized helm fittings must not duplicate the normal authored assembly')
console.log('PASS retained curved helm rail has supported human-height posts and no duplicate pole')

// Test the actual exported cavity independently of the authoring profile.
// A top-facing red cap hid the soil even though all three pot bounds passed.
function firstContainerHit(ray,faces){
 let closest=null,distance=Infinity
 for(const face of faces){
  const hit=ray.intersectTriangle(...face.v,false,new THREE.Vector3())
  if(hit&&hit.distanceToSquared(ray.origin)<distance){distance=hit.distanceToSquared(ray.origin);closest={...face,hit}}
 }
 return closest
}
const collisionParts=loadColliders('public/models/sunny-collision.glb')
assert.equal(collisionParts.filter(p=>/^COLL_Solid_Sunny_Mikan[0-2]_pot$/.test(p.name)).length,3,'every mikan pot must be a physical container, not only a trunk collider')
for(let i=0;i<3;i++){
 const prefix='Sunny_Mikan'+i,faces=containerFaces.filter(f=>f.name.startsWith(prefix+'_'))
 const clay=faces.filter(f=>f.name===prefix+'_pot'),soil=faces.filter(f=>f.name===prefix+'_soil')
 assert(clay.length>0&&soil.length>0,'each container needs actual clay and soil geometry')
 const bounds=new THREE.Box3().setFromPoints(clay.flatMap(f=>f.v)),centre=bounds.getCenter(new THREE.Vector3())
 const soilBounds=new THREE.Box3().setFromPoints(soil.flatMap(f=>f.v)),soilRadius=Math.min(soilBounds.max.x-soilBounds.min.x,soilBounds.max.z-soilBounds.min.z)/2
 assert(Math.abs(bounds.max.y-bounds.min.y-.60)<.003&&Math.abs(bounds.max.x-bounds.min.x-1.12)<.003,'retain the normal-sized pot height and footprint')
 assert(Math.abs(bounds.max.y-soilBounds.max.y-.03)<.003,'soil must stay exposed below the rim at its retained height')
 const support=collisionParts.find(p=>p.name.startsWith('COLL_Floor')&&centre.x>=p.min.x&&centre.x<=p.max.x&&centre.z>=p.min.z&&centre.z<=p.max.z&&Math.abs(p.max.y-bounds.min.y)<.003)
 assert(support,'each pot bottom must meet its real garden support floor')
 const proxy=collisionParts.find(p=>p.name==='COLL_Solid_'+prefix+'_pot')
 assert(proxy&&[0,1,2].every(axis=>Math.abs(proxy.min.getComponent(axis)-bounds.min.getComponent(axis))<.003&&Math.abs(proxy.max.getComponent(axis)-bounds.max.getComponent(axis))<.003),'solid container collision must match its actual clay bounds')
 for(let j=0;j<24;j++){
  const angle=(j+.31)*Math.PI*2/24,direction=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle))
  for(const fraction of [.35,.70]){
   const origin=new THREE.Vector3(centre.x+direction.x*soilRadius*fraction,bounds.max.y+.20,centre.z+direction.z*soilRadius*fraction)
   const hit=firstContainerHit(new THREE.Ray(origin,new THREE.Vector3(0,-1,0)),faces)
   assert(hit?.name===prefix+'_soil'&&Math.abs(hit.hit.y-soilBounds.max.y)<.003,'actual soil must be visible from above across the open pot, without a clay cap')
  }
  const origin=new THREE.Vector3(centre.x,bounds.max.y-.015,centre.z),hit=firstContainerHit(new THREE.Ray(origin,direction),faces)
  assert(hit?.name===prefix+'_pot'&&hit.normal.dot(direction)<-.8&&hit.hit.distanceTo(origin)>.47&&hit.hit.distanceTo(origin)<.54,'a real inward-facing clay wall must enclose the cavity below its lip')
 }
}
console.log('PASS three hollow mikan containers expose soil, face cavity walls inward and have supported solid collision')

// The normal-eye upper entry exposed a ceiling crossing the curved slide.
// Check the actual whole trough, underside and every fitted support vertex;
// a passing horizontal walking route did not test these construction joins.
const slideFaces=slideEnvelopeFaces.filter(f=>f.name==='Sunny_Slide_chute')
const slideTop=slideFaces.filter(f=>f.normal.y>0),slideBounds=new THREE.Box3().setFromPoints(slideFaces.flatMap(f=>f.v))
assert(slideTop.length>100,'retain the real curved starboard trough')
const slideFaults=new Set(),slideOccluders=slideEnvelopeFaces.filter(f=>!f.name.startsWith('Sunny_Slide_support'))
for(let i=0;i<160;i++)for(const fraction of [-.8,-.5,-.2,0,.2,.5,.8]){
 const x=slideBounds.min.x+(slideBounds.max.x-slideBounds.min.x)*(i+.31)/160
 const z=(slideBounds.min.z+slideBounds.max.z)/2+(slideBounds.max.z-slideBounds.min.z)*fraction/2
 const ray=new THREE.Ray(new THREE.Vector3(x,slideBounds.max.y+1,z),new THREE.Vector3(0,-1,0))
 const top=firstContainerHit(ray,slideTop)
 assert(top,'the retained trough must continuously span its actual length and width')
 const first=firstContainerHit(ray,slideOccluders)
 if(first?.name!=='Sunny_Slide_chute'||Math.abs(first.hit.y-top.hit.y)>.003)slideFaults.add((first?.name||'missing exterior join')+' intrudes above the slide')
 const underside=firstContainerHit(new THREE.Ray(new THREE.Vector3(x,top.hit.y-.12,z),new THREE.Vector3(0,1,0)),slideFaces)
 if(!underside||underside.normal.y>=0||Math.abs(top.hit.y-underside.hit.y-.06)>.003)slideFaults.add('slide lacks a closed 6 cm structural underside')
}
const ceiling=slideEnvelopeFaces.filter(f=>f.name==='Sunny_Aquarium_ceiling'),ceilingBounds=new THREE.Box3().setFromPoints(ceiling.flatMap(f=>f.v))
const ceilingArea=ceiling.filter(f=>f.normal.y>.99).reduce((sum,f)=>sum+f.v[1].clone().sub(f.v[0]).cross(f.v[2].clone().sub(f.v[0])).length()/2,0)
assert(ceilingArea>(ceilingBounds.max.x-ceilingBounds.min.x)*(ceilingBounds.max.z-ceilingBounds.min.z)*.98,'retain the Aquarium ceiling around its small real apertures')
assert(Math.abs(ceilingBounds.max.y-(metadata.interiors.levels.F2A-.18))<.003,'preserve the original Aquarium ceiling station')
const entryDeck=slideEnvelopeFaces.filter(f=>f.name==='Sunny_AftEntryDeck'),entryBounds=new THREE.Box3().setFromPoints(entryDeck.flatMap(f=>f.v))
const entryArea=entryDeck.filter(f=>f.normal.y>.99).reduce((sum,f)=>sum+f.v[1].clone().sub(f.v[0]).cross(f.v[2].clone().sub(f.v[0])).length()/2,0)
assert(entryArea>(entryBounds.max.x-entryBounds.min.x)*(entryBounds.max.z-entryBounds.min.z)*.98,'retain the broad gallery deck around the fitted upper slide mouth')
assert(Math.abs(entryBounds.max.y-metadata.interiors.levels.F2A)<.003,'preserve the actual gallery deck station')
const supportNames=[...new Set(slideEnvelopeFaces.filter(f=>f.name.startsWith('Sunny_Slide_support')).map(f=>f.name))]
assert.equal(supportNames.length,4,'retain both pairs of slide support posts')
for(const name of supportNames){
 const points=slideEnvelopeFaces.filter(f=>f.name===name).flatMap(f=>f.v),bounds=new THREE.Box3().setFromPoints(points)
 assert(Math.abs(bounds.min.y-metadata.interiors.levels.F1)<.003,'every slide support needs its real lower floor footing')
 const head=[...new Map(points.filter(p=>p.y>bounds.min.y+.1).map(p=>[p.toArray().map(v=>v.toFixed(5)).join(':'),p])).values()]
 assert(head.length>=10,'each support needs its actual complete fitted head ring')
 for(const p of head){
  const top=firstContainerHit(new THREE.Ray(new THREE.Vector3(p.x,slideBounds.max.y+1,p.z),new THREE.Vector3(0,-1,0)),slideTop)
  if(!top||Math.abs(p.y-(top.hit.y-.06+.002))>.003)slideFaults.add('unsupported slide post '+name)
 }
 const proxy=collisionParts.find(p=>p.name==='COLL_Solid_'+name)
 if(!proxy||[0,1,2].some(axis=>Math.abs(proxy.min.getComponent(axis)-bounds.min.getComponent(axis))>.003||Math.abs(proxy.max.getComponent(axis)-bounds.max.getComponent(axis))>.003))slideFaults.add('missing or mismatched physical slide post '+name)
}
assert.equal(slideFaults.size,0,'slide construction remains unfinished: '+JSON.stringify([...slideFaults]))
console.log('PASS 1120 actual slide sections have no Aquarium/gallery intrusion, retained surrounding decks, a closed 6 cm underside and four floor-supported fitted physical posts')

// A solid fitted post needs bed support before the normal body reaches it.
// Test the actual contact plane and unchanged runtime step query, independent
// of floor-cell names, resolution and pipeline implementation.
const contactFaults=[],floorEntries=collisionParts.map(p=>({box:new THREE.Box3(p.min,p.max),isFloor:p.name.startsWith('COLL_Floor')}))
for(const name of supportNames){
 const post=collisionParts.find(p=>p.name==='COLL_Solid_'+name)
 const position=new THREE.Vector3(post.min.x-.34+.004,post.max.y-.05,(post.min.z+post.max.z)/2)
 const candidate=stepSupport(floorEntries,position,.34,.8)
 if(candidate===null||candidate<post.max.y-.02)contactFaults.push(name+' reaches solid post before bed step support')
}

/** Recover each straight rail's two axis endpoints from its actual end rings. */
function railAxisEnds(points){
 const unique=[...new Map(points.map(p=>[p.toArray().map(v=>v.toFixed(5)).join(':'),p])).values()]
 const centre=unique.reduce((s,p)=>s.add(p),new THREE.Vector3()).divideScalar(unique.length)
 const covariance=Array.from({length:3},()=>[0,0,0])
 for(const p of unique){const d=p.clone().sub(centre).toArray();for(let a=0;a<3;a++)for(let b=0;b<3;b++)covariance[a][b]+=d[a]*d[b]}
 const bounds=new THREE.Box3().setFromPoints(unique),size=bounds.getSize(new THREE.Vector3()),longest=[0,1,2].sort((a,b)=>size.getComponent(b)-size.getComponent(a))[0]
 let axis=new THREE.Vector3().setComponent(longest,1)
 for(let i=0;i<32;i++){const d=axis.toArray();axis=new THREE.Vector3(...covariance.map(row=>row.reduce((s,v,j)=>s+v*d[j],0))).normalize()}
 const projections=unique.map(p=>p.clone().sub(centre).dot(axis)),low=Math.min(...projections),high=Math.max(...projections)
 return [low,high].map(end=>{
  const ring=unique.filter((p,i)=>Math.abs(projections[i]-end)<.003)
  assert(ring.length>=8,'each actual rail end must retain its full mounting ring')
  return ring.reduce((s,p)=>s.add(p),new THREE.Vector3()).divideScalar(ring.length)
 })
}
const balconyPosts=[...balconyRailPoints].filter(([name])=>name.includes('_post')).map(([name,points])=>({name,bounds:new THREE.Box3().setFromPoints(points)}))
const balconyBars=[...balconyRailPoints].filter(([name])=>name.includes('_rail'))
assert.equal(balconyPosts.length,23,'retain all existing supported balcony post stations and the fore opening')
assert(balconyBars.length>=36,'retain the complete upper/lower balcony railing')
for(const [name,points] of balconyBars)for(const endpoint of railAxisEnds(points)){
 const attached=balconyPosts.some(p=>{
  const centre=p.bounds.getCenter(new THREE.Vector3())
  return Math.hypot(endpoint.x-centre.x,endpoint.z-centre.z)<.02&&endpoint.y>=p.bounds.min.y-.003&&endpoint.y<=p.bounds.max.y+.003
 })
 if(!attached)contactFaults.push(name+' has a rail end without a supporting post')
}
assert.equal(contactFaults.length,0,'exterior contact construction remains unfinished: '+JSON.stringify(contactFaults))
console.log('PASS normal-body approach has bed step support before all four physical slide posts')
console.log('PASS every upper/lower balcony rail segment meets retained supporting post axes')


// H's frontal drawing and A/C's side blades have a curved inward edge. Test
// the actual exported silhouette and closed body, independently of the warp
// used by authoring. Normalized ranges are reconstruction tolerances, not
// official metric dimensions or whole-figurehead accuracy acceptance.
function maneSections(faces,centre,radius){
 const points=faces.flat(),tip=points.reduce((a,b)=>Math.hypot(b.z-centre.z,b.y-centre.y)>Math.hypot(a.z-centre.z,a.y-centre.y)?b:a)
 const u=new THREE.Vector2(tip.z-centre.z,tip.y-centre.y).normalize()
 const projected=faces.map(face=>face.map(p=>{const z=p.z-centre.z,y=p.y-centre.y;return [z*u.x+y*u.y,-z*u.y+y*u.x]}))
 const low=Math.min(...projected.flat().map(p=>p[0])),high=Math.max(...projected.flat().map(p=>p[0]))
 const samples=Array.from({length:9},(_,i)=>{
  const t=(i+1)/10,station=low+t*(high-low),hits=[]
  for(const face of projected)for(let j=0;j<3;j++){
   const p=face[j],q=face[(j+1)%3]
   if(Math.abs(q[0]-p[0])<1e-8||station<Math.min(p[0],q[0])||station>Math.max(p[0],q[0]))continue
   hits.push(p[1]+(q[1]-p[1])*(station-p[0])/(q[0]-p[0]))
  }
  assert(hits.length>=2,'every source mane section needs a solid blade outline')
  return {t,centre:(Math.min(...hits)+Math.max(...hits))/(2*radius)}
 })
 const a=samples[0],b=samples.at(-1)
 const bend=Math.max(...samples.map(p=>Math.abs(p.centre-(a.centre+(b.centre-a.centre)*(p.t-a.t)/(b.t-a.t)))))
 return {bend,root:low/radius,tip:high/radius}
}
assert.equal(maneFaces.size,7,'retain all seven actual source mane bodies')
const lionBounds=new THREE.Box3().setFromPoints(lionPoints),lionCentre=lionBounds.getCenter(new THREE.Vector3()),lionRadius=(lionBounds.max.z-lionBounds.min.z)/2
const maneFaults=[]
for(const [name,faces] of maneFaces){
 const edges=new Map(),key=p=>p.toArray().map(v=>v.toFixed(5)).join(',')
 for(const face of faces)for(let i=0;i<3;i++){
  const edge=[key(face[i]),key(face[(i+1)%3])].sort().join(' / ')
  edges.set(edge,(edges.get(edge)||0)+1)
 }
 if([...edges.values()].some(count=>count!==2))maneFaults.push(name+' is not a closed opaque body')
 const section=maneSections(faces,lionCentre,lionRadius),base=name.split('.')[0]
 if(section.root<.35||section.root>.90||section.tip<1.85||section.tip>2.35)maneFaults.push(name+' loses its retained supported radial envelope: '+JSON.stringify(section))
 if(base==='Rectangle002'){
  if(section.bend>.025)maneFaults.push(name+' loses the straight central crown blade')
 }else{
  const minimum=['Rectangle003','Rectangle008'].includes(base)?.12:.22
  if(section.bend<minimum||section.bend>.50)maneFaults.push(name+' has insufficient or excessive source-led side curvature: '+JSON.stringify(section))
 }
}
assert.equal(maneFaults.length,0,'source mane construction remains unfinished: '+JSON.stringify(maneFaults))
console.log('PASS seven opaque mane bodies retain supported roots/tips and swept source-led side contours')

// H shows a tall open mouth containing a cannon, not a small circular hole
// behind the muzzle. Inspect actual front rays in both original runtime poses.
// The normalized sample positions are reconstruction acceptance, not a claim
// that this perspective drawing gives official metre dimensions.
function mouthPose(part,amount){
 const pivot=part.tags.sunny_pivot
 if(!part.tags.sunny_jaw)return part.faces
 assert(pivot?.length===3,'each lower face component needs its real hinge')
 const centre=new THREE.Vector3(pivot[0],pivot[2],-pivot[1]),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),amount*(part.tags.sunny_jaw_angle??1.05))
 return part.faces.map(f=>({...f,v:f.v.map(p=>p.clone().sub(centre).applyQuaternion(q).add(centre))}))
}
function frontHits(y,z,amount,maneAngle=0){
 const ray=new THREE.Ray(new THREE.Vector3(lionBounds.min.x-lionRadius*3,y,z),new THREE.Vector3(1,0,0)),hits=[]
 for(const [name,part] of mouthParts)for(const f of mouthPose(part,amount)){
  const point=ray.intersectTriangle(...f.v,false,new THREE.Vector3())
  if(point)hits.push({name,material:f.material,x:point.x})
 }
 // Retained bones/studs are real opaque obstacles too; rounding them must
 // not place white/gold skin in any existing open mouth/mane owner sample.
 for(const [name,part]of bowMountParts)if(!/^Circle002(?:\.\d+)?$/.test(name))for(const f of part.faces){
  const point=ray.intersectTriangle(...f.v,false,new THREE.Vector3())
  if(point)hits.push({name,material:f.material,x:point.x})
 }
 // The six newly rounded opaque shield heads must also stay out of all
 // existing closed/open mouth and rotated-mane owner samples.
 for(const [name,part]of bowShieldParts)if(/^Cylinder05[0-5](?:\.\d+)?$/.test(name))for(const f of part.faces){
  const point=ray.intersectTriangle(...f.v,false,new THREE.Vector3())
  if(point)hits.push({name,material:f.material,x:point.x})
 }
 const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),maneAngle)
 for(const [name,faces] of maneFaces)for(const face of faces){
  const v=face.map(p=>p.clone().sub(lionCentre).applyQuaternion(rotation).add(lionCentre))
  const point=ray.intersectTriangle(...v,false,new THREE.Vector3())
  if(point)hits.push({name,material:'Sunny_mane',x:point.x})
 }
 return hits.sort((a,b)=>a.x-b.x)
}
const mouthFaults=[]
for(const height of [-.34,-.46,-.58,-.70,-.78,-.84])for(const side of [-.22,-.15,0,.15,.22]){
 const y=lionCentre.y+height*lionRadius,z=lionCentre.z+side*lionRadius
 for(let step=0;step<8;step++){
  const maneAngle=step*Math.PI/4,open=frontHits(y,z,1,maneAngle)[0]
  if(!open||!['Sunny_black','Sunny_darkwood'].includes(open.material)||mouthParts.get(open.name)?.tags.sunny_jaw)mouthFaults.push({pose:'open',height,side,maneAngle,first:open})
 }
 const closed=frontHits(y,z,0)[0]
 if(!closed||!['Sunny_lion','Sunny_cream'].includes(closed.material))mouthFaults.push({pose:'closed',height,side,first:closed})
}
assert.equal(mouthFaults.length,0,'tall mouth must expose its cavity/cannon while the closed face covers it: '+JSON.stringify(mouthFaults))
const jawMetadata=metadata.exterior.mechanisms.lion
assert.deepEqual(jawMetadata.jawAxis,[0,-1,0],'authored Blender jaw axis must map to actual Three +Z')
const openLower=[]
for(const name of ['Sunny_Gaon_jaw','Sunny_Gaon_chin']){
 const part=mouthParts.get(name)
 assert.deepEqual(part.tags.sunny_jaw_axis,jawMetadata.jawAxis,name+' must publish the same actual jaw axis')
 for(const face of mouthPose(part,1))openLower.push(...face.v)
}
const openLowerBounds=new THREE.Box3().setFromPoints(openLower)
assert(lionBounds.min.y-openLowerBounds.min.y<lionRadius*.30,'H compact lower muzzle must stay within 0.30 head radii below the face; quarter-turn tray exceeds this reconstruction envelope')
const mouthWalls=mouthParts.get('Sphere001').faces.filter(f=>f.material==='Sunny_black').flatMap(f=>f.v)
assert(mouthWalls.length,'mouth needs actual opaque inner walls and a rear surface')
assert(mouthParts.get('Sunny_Gaon_chin')?.faces.every(f=>['Sunny_lion','Sunny_black'].includes(f.material)),'lower face must retain source paint and an opaque interior, without unrelated rear skin')
const wallBounds=new THREE.Box3().setFromPoints(mouthWalls),mouthAspect=(wallBounds.max.y-wallBounds.min.y)/(wallBounds.max.z-wallBounds.min.z)
assert(mouthAspect>1.1&&mouthAspect<1.5,'H mouth opening must be taller than wide: '+mouthAspect)
for(const side of [-.10,0,.10]){
 const part=mouthParts.get('Sunny_Gaon_chin'),y=lionCentre.y-.84*lionRadius,z=lionCentre.z+side*lionRadius
 const ray=new THREE.Ray(new THREE.Vector3(lionBounds.min.x-lionRadius*3,y,z),new THREE.Vector3(1,0,0)),hits=[]
 for(const f of part?.faces??[]){const point=ray.intersectTriangle(...f.v,false,new THREE.Vector3());if(point)hits.push(point.x)}
 const unique=[...new Set(hits.map(x=>x.toFixed(4)))].map(Number).sort((a,b)=>a-b)
 assert(unique.length===2&&unique[1]-unique[0]>.03&&unique[1]-unique[0]<.30,'lower face must be one supported thin panel, without a detached back-of-head patch')
}
for(const name of ['Sphere001','Sphere002','Sunny_Gaon_jaw','Sunny_Gaon_chin','Sunny_Gaon_barrel']){
 const part=mouthParts.get(name);assert(part?.faces.length,name+' needs actual opaque construction')
 const edges=new Map(),key=p=>p.toArray().map(v=>v.toFixed(4)).join(',')
 for(const f of part.faces)for(let i=0;i<3;i++){
  const a=key(f.v[i]),b=key(f.v[(i+1)%3]);if(a===b)continue
  const edge=[a,b].sort().join(' / ');edges.set(edge,(edges.get(edge)||0)+1)
 }
 assert([...edges.values()].every(n=>n===2),name+' must close its cuts with opaque supported surfaces')
}
const barrel=mouthParts.get('Sunny_Gaon_barrel'),barrelBounds=new THREE.Box3().setFromPoints(barrel.faces.flatMap(f=>f.v)),boreCentre=barrelBounds.getCenter(new THREE.Vector3())
const centreHits=frontHits(boreCentre.y,boreCentre.z,1)
assert(barrelBounds.max.x-barrelBounds.min.x>.8,'cannon needs a barrel extending back into the head')
assert(centreHits[0]&&centreHits[0].x-barrelBounds.min.x>.8&&centreHits[0].material==='Sunny_black','open cannon bore needs real depth before its black rear surface')
console.log('PASS tall source-led mouth opens over a deep hollow cannon and closes with sealed muzzle/chin bodies')

// A/H show a smaller round ivory muzzle and circular, surface-mounted eyes.
// These broad head-relative envelopes are reconstruction acceptance ranges,
// not official dimensions inferred from a perspective drawing. Read actual
// exported surfaces independently of authoring tags or geometry formulas.
const faceFeatureFaults=[]
const muzzleBounds=new THREE.Box3().setFromPoints(['Sphere002','Sunny_Gaon_jaw'].flatMap(name=>mouthParts.get(name).faces.flatMap(f=>f.v)))
const headDiameter=lionRadius*2,muzzleWidth=(muzzleBounds.max.z-muzzleBounds.min.z)/headDiameter,muzzleHeight=(muzzleBounds.max.y-muzzleBounds.min.y)/headDiameter
if(muzzleWidth<.35||muzzleWidth>.48)faceFeatureFaults.push({feature:'muzzle width',ratio:muzzleWidth})
if(muzzleHeight<.30||muzzleHeight>.43)faceFeatureFaults.push({feature:'muzzle height',ratio:muzzleHeight})
/** Intersect the actual exported feature surface along the frontal X axis. */
function featureHits(faces,y,z){
 const ray=new THREE.Ray(new THREE.Vector3(lionBounds.min.x-lionRadius*3,y,z),new THREE.Vector3(1,0,0))
 return faces.flatMap(v=>{const p=ray.intersectTriangle(...v,false,new THREE.Vector3());return p?[p.x]:[]}).sort((a,b)=>a-b)
}
const eyeNames=[...lionFeatures.keys()].filter(name=>name.startsWith('Sunny_LionEye_white'))
assert.equal(eyeNames.length,2,'retain exactly two visible white eye rims')
for(const name of eyeNames){
 const faces=lionFeatures.get(name),bb=new THREE.Box3().setFromPoints(faces.flat()),size=bb.getSize(new THREE.Vector3()),centre=bb.getCenter(new THREE.Vector3())
 const pupilName=name.replace('white','pupil'),pupil=lionFeatures.get(pupilName)
 assert(pupil?.length,'each source eye needs its attached black pupil')
 const pupilSize=new THREE.Box3().setFromPoints(pupil.flat()).getSize(new THREE.Vector3())
 if(Math.abs(size.y/size.z-1)>.05||Math.abs(pupilSize.y/pupilSize.z-1)>.05)faceFeatureFaults.push({feature:name+' circularity',rim:size.y/size.z,pupil:pupilSize.y/pupilSize.z})
 if(size.z/headDiameter<.16||size.z/headDiameter>.22)faceFeatureFaults.push({feature:name+' diameter',ratio:size.z/headDiameter})
 const pupilFraction=pupilSize.z/size.z
 if(pupilFraction<.55||pupilFraction>.75)faceFeatureFaults.push({feature:pupilName+' rim width',ratio:pupilFraction})
 for(let k=0;k<8;k++){
  const angle=k*Math.PI/4,y=centre.y+Math.sin(angle)*size.z*.375,z=centre.z+Math.cos(angle)*size.z*.375
  const feature=featureHits(faces,y,z),skin=featureHits(mouthParts.get('Sphere001').faces.map(f=>f.v),y,z)
  if(feature.length<2||!skin.length||feature[0]>=skin[0]||feature.at(-1)<skin[0]+.003)faceFeatureFaults.push({feature:name+' head attachment',angle,featureX:feature,skinX:skin[0]})
 }
}
const nose=lionFeatures.get('Sphere005'),noseBounds=new THREE.Box3().setFromPoints(nose.flat()),noseSize=noseBounds.getSize(new THREE.Vector3()),noseCentre=noseBounds.getCenter(new THREE.Vector3())
if(noseSize.z/headDiameter<.075||noseSize.z/headDiameter>.125)faceFeatureFaults.push({feature:'nose diameter',ratio:noseSize.z/headDiameter})
for(let k=0;k<8;k++){
 const angle=k*Math.PI/4,y=noseCentre.y+Math.sin(angle)*noseSize.z*.375,z=noseCentre.z+Math.cos(angle)*noseSize.z*.375
 const feature=featureHits(nose,y,z),skin=featureHits(mouthParts.get('Sphere002').faces.map(f=>f.v),y,z)
 if(feature.length<2||!skin.length||feature[0]>=skin[0]||feature.at(-1)<skin[0]+.003)faceFeatureFaults.push({feature:'nose muzzle attachment',angle,featureX:feature,skinX:skin[0]})
}
assert.equal(faceFeatureFaults.length,0,'A/H face proportions and supported round features remain: '+JSON.stringify(faceFeatureFaults))
console.log('PASS source-led compact ivory muzzle, circular eyes/black pupils and smaller nose meet their actual supporting skin')

// Actual white-canvas head and all retained lashings must meet their yard skin.
// This catches both deep canvas burial and circular hoops floating around the
// source's oval spar. Stitch depth is reconstructed; human clearance is unchanged.
function fittingHits(faces,origin,direction){
 const ray=new THREE.Ray(origin,direction),point=new THREE.Vector3(),hits=[]
 for(const f of faces)if(ray.intersectTriangle(...f,false,point))hits.push(point.clone())
 return hits.sort((a,b)=>a.distanceToSquared(origin)-b.distanceToSquared(origin))
}
const fittingIssues=[]
for(const [canvas,yard] of [['Plane004','Cylinder004'],['Plane005','Cylinder010']]){
 const wood=fittingFaces.get(yard)||[],heads=sailHeadPoints.get(canvas)||[]
 assert(wood.length&&heads.length>=30,canvas+' needs its actual exported UV head edge and yard')
 for(const p of heads){
  const skin=fittingHits(wood,new THREE.Vector3(p.x,-100,p.z),new THREE.Vector3(0,1,0))[0]
  const gap=skin?skin.y-p.y:null
  if(gap===null||gap<-.040||gap>.015)fittingIssues.push({canvas,point:p.toArray(),gap})
 }
 const centre=new THREE.Box3().setFromPoints(wood.flat()).getCenter(new THREE.Vector3())
 const ties=[...fittingFaces].filter(([n])=>n.startsWith('Sunny_SailTie_'+canvas))
 assert.equal(ties.length,13,canvas+' retains thirteen authored lash stations; count is reconstructed')
 for(const [name,rope] of ties){
  const z=new THREE.Box3().setFromPoints(rope.flat()).getCenter(new THREE.Vector3()).z
  const origin=new THREE.Vector3(centre.x,centre.y,z)
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,dir=new THREE.Vector3(Math.cos(a),Math.sin(a),0)
   const skin=fittingHits(wood,origin,dir)[0],inner=fittingHits(rope,origin,dir)[0]
   const overlap=skin&&inner?skin.distanceTo(origin)-inner.distanceTo(origin):null
   if(overlap===null||overlap<.005||overlap>.12)fittingIssues.push({name,angle:a,overlap})
  }
 }
}
assert.equal(fittingIssues.length,0,'canvas/yard/lashing contact failures: '+JSON.stringify({count:fittingIssues.length,samples:fittingIssues.slice(0,12)}))
console.log('PASS both white canvas head edges and all 26 fitted lashings meet actual oval yard skin')

// A/N show recessed scalloped bays between the flared supports. Retain the
// eight previously authored sectors and envelope; exact normalized depth is
// reconstruction. Sample intact sections between the access cuts and upper
// rim: lower sections contain intentional hatch/neck apertures, whose full
// human clearance is independently required by the unchanged asset tests.
// An oval's parameter angle differs from a world-space circular ray angle.
// Metadata alone cannot prove these recesses actually exist.
const soffitIssues=[]
for(const name of ['Cylinder005','Cylinder001']){
 const faces=fittingFaces.get(name)||[];assert(faces.length,name+' soffit geometry is required')
 const b=new THREE.Box3().setFromPoints(faces.flat()),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3())
 for(const v of [.64,.68])for(let i=0;i<8;i++){
  const origin=c.clone();origin.y=b.min.y+s.y*v
  const radius=angle=>{
   const direction=new THREE.Vector3(s.x*Math.cos(angle),0,s.z*Math.sin(angle)).normalize()
   const hit=fittingHits(faces,origin,direction)[0]
   return hit?Math.hypot((hit.x-c.x)/(s.x/2),(hit.z-c.z)/(s.z/2)):null
  }
  const rib=radius(i*Math.PI/4),bay=radius((i+.5)*Math.PI/4),recess=rib!==null&&bay!==null?rib-bay:null
  if(recess===null||recess<.12||recess>.35)soffitIssues.push({name,v,sector:i,recess})
 }
}
assert.equal(soffitIssues.length,0,'soffit scalloped recess failures: '+JSON.stringify(soffitIssues))
console.log('PASS actual lookout and bathhouse undersides have eight recessed scalloped bays at both sampled sections')

// A/O/N support attached framing and rope paths. Read actual end rings and wood
// triangles: matching tags, bounding boxes and reconstructed counts alone do
// not establish attachment to the tapered mast or oval yard.
function uniqueRigPoints(entries){return [...new Map(entries.map(({point})=>[point.toArray().map(v=>v.toFixed(5)).join(':'),point])).values()]}
function ringCentre(points){return points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(points.length)}
function radialWoodOverlap(name,point,axis){
 const faces=riggingFaces.get(name)||[],centre=new THREE.Box3().setFromPoints(faces.flat()).getCenter(new THREE.Vector3())
 centre.setComponent(axis,point.getComponent(axis))
 const direction=point.clone().sub(centre);direction.setComponent(axis,0);direction.normalize()
 const hit=fittingHits(faces,centre,direction)[0]
 return hit?hit.distanceTo(centre)-point.distanceTo(centre):null
}
const rigJoinIssues=[]
const rootStations={Cylinder008:-22.940352,Cylinder012:48.804854,Cylinder056:13.324303}
for(const platform of ['Cylinder008','Cylinder012','Cylinder056']){
 const braces=[...riggingPoints].filter(([name])=>name.startsWith('Sunny_MastPlatform_brace_'+platform))
 assert.equal(braces.length,8,platform+' retains its eight reconstructed braces')
 for(const [name,entries] of braces){
  const points=uniqueRigPoints(entries),middle=ringCentre(points),ring=points.filter(p=>p.y<middle.y)
  assert.equal(ring.length,8,name+' needs its actual eight-vertex lower end ring')
  const root=ringCentre(ring),overlap=radialWoodOverlap('Cylinder007',root,1)
  if(overlap===null||overlap<.010||overlap>.055||Math.abs(root.y-rootStations[platform])>.003)rigJoinIssues.push({name,root:root.toArray(),overlap})
 }
}
for(const name of ['Plane006','Plane007']){
 const entries=riggingPoints.get(name)||[],points=uniqueRigPoints(entries),endpoints=riggingTags.get(name)?.sunny_shroud_endpoints
 assert.equal(endpoints?.length,12,name+' retains its six fan lines and recorded ends')
 for(const [index,source] of endpoints.slice(6).entries()){
  const tip=new THREE.Vector3(source[0],source[2],-source[1]),base=endpoints[index]
  const axis=tip.clone().sub(new THREE.Vector3(base[0],base[2],-base[1])).normalize()
  // Fan tips converge closely at the mast. Resolve this line's actual end
  // plane rather than accidentally averaging an adjacent rope's vertices.
  const planeDistance=point=>Math.abs(point.clone().sub(tip).dot(axis))
  const ring=points.filter(p=>p.distanceTo(tip)<.049).sort((a,b)=>planeDistance(a)-planeDistance(b)).slice(0,8)
  assert(ring.length===8&&ring.every(p=>planeDistance(p)<.00003),name+' endpoint must describe its actual exported upper end ring')
  const centre=ringCentre(ring),overlap=radialWoodOverlap('Cylinder003',centre,1)
  if(centre.distanceTo(tip)>.001||Math.abs(centre.y-21.632097)>.003||overlap===null||overlap<.005||overlap>.045)rigJoinIssues.push({name,tip:tip.toArray(),overlap})
 }
}
const guidePoints=uniqueRigPoints(riggingPoints.get('Sunny_Lookout_rope_yard_tie')||[]),guideMiddle=ringCentre(guidePoints)
const guideRing=guidePoints.filter(p=>p.y>guideMiddle.y)
assert.equal(guideRing.length,10,'lookout yard tie needs its actual ten-sided upper end ring')
const guideTip=ringCentre(guideRing),guideOverlap=radialWoodOverlap('Cylinder004',guideTip,2)
if(guideOverlap===null||guideOverlap<.005||guideOverlap>.045||Math.abs(guideTip.z+3.893707)>.003)rigJoinIssues.push({name:'Sunny_Lookout_rope_yard_tie',tip:guideTip.toArray(),overlap:guideOverlap})
assert.equal(rigJoinIssues.length,0,'actual rigging attachment failures: '+JSON.stringify(rigJoinIssues))
console.log('PASS all retained mast-brace roots, fore fan tips and lookout yard tie meet actual tapered/oval wood skin')

// N/O's deployed striped panels attach at the three retained gaffs. Export UV
// V is flipped: head=0, foot=1. Sample the actual edge vertices against actual
// top/underside triangles, retaining dense two-panel coverage and original UVs.
const canvasEdgeIssues=[]
const mastRootEntries=(riggingPoints.get('Plane008')||[]).filter(o=>Math.abs(o.uv?.[0])<1e-6)
const mastRootPoints=uniqueRigPoints(mastRootEntries)
assert.equal(mastRootPoints.length,50,'both striped mast edges retain all 25 samples per panel')
const mainMastCentre=new THREE.Box3().setFromPoints((riggingFaces.get('Cylinder007')||[]).flat()).getCenter(new THREE.Vector3())
for(const point of mastRootPoints){
 const origin=new THREE.Vector3(100,point.y,point.z),skin=fittingHits(riggingFaces.get('Cylinder007')||[],origin,new THREE.Vector3(-1,0,0))[0]
 const gap=skin?point.x-skin.x:null
 if(gap===null||gap<-.020||gap>.012||point.x<=mainMastCentre.x)canvasEdgeIssues.push({edge:'mast',point:point.toArray(),gap})
}
for(const [edge,v,spars,sign] of [['head',0,['Cylinder011','Cylinder014'],1],['foot',1,['Cylinder013','Cylinder011'],-1]]){
 const entries=(riggingPoints.get('Plane008')||[]).filter(o=>Math.abs(o.uv?.[1]-v)<1e-6)
 const points=uniqueRigPoints(entries)
 assert.equal(points.length,50,'both striped '+edge+' edges retain all 25 samples per panel')
 const owners=new Set()
 for(const point of points){
  let best=null
  for(const spar of spars){
   const origin=new THREE.Vector3(point.x,sign>0?-100:100,point.z),direction=new THREE.Vector3(0,sign,0)
   const skin=fittingHits(riggingFaces.get(spar)||[],origin,direction)[0]
   if(!skin)continue
   const gap=sign*(skin.y-point.y)
   if(best===null||Math.abs(gap)<Math.abs(best.gap))best={spar,gap}
  }
  if(best)owners.add(best.spar)
  if(best===null||best.gap<-.020||best.gap>.012)canvasEdgeIssues.push({edge,point:point.toArray(),...best})
 }
 assert.equal(owners.size,2,'each striped '+edge+' must use both of its actual gaffs')
}
// O's free contours are curved. Four existing corner stations remain fixed;
// normalized gentle curvature is a reconstruction from a perspective drawing.
const whiteCorners={
 Plane004:[[-13.066941,-21.787123,19.504345],[-13.066941,21.892481,22.418789],[-13.066941,-21.787123,-19.504345],[-13.066941,21.892471,-22.418789]],
 Plane005:[[18.794662,8.502682,19.751516],[18.794662,46.626392,22.702892],[18.794662,8.502682,-19.751516],[18.794662,46.626385,-22.702892]],
}
for(const name of ['Plane004','Plane005'])for(const side of [0,1]){
 const points=uniqueRigPoints((riggingPoints.get(name)||[]).filter(o=>Math.abs(o.uv?.[0]-side)<1e-6))
 assert.equal(points.length,29,name+' retains its 29 free-leech vertices')
 const foot=points.reduce((a,p)=>p.y<a.y?p:a,points[0]),head=points.reduce((a,p)=>p.y>a.y?p:a,points[0])
 assert(foot.distanceTo(new THREE.Vector3(...whiteCorners[name][side*2]))<.003&&head.distanceTo(new THREE.Vector3(...whiteCorners[name][side*2+1]))<.003,name+' retains both original leech corner stations')
 const width=Math.abs(whiteCorners[name][1][2])*2,outward=side===0?1:-1,sourceSign=name==='Plane004'?1:-1
 const bends=points.filter(p=>p.y>foot.y+.003&&p.y<head.y-.003).map(point=>{
  const fraction=(point.y-foot.y)/(head.y-foot.y),chord=foot.clone().lerp(head,fraction)
  return sourceSign*outward*(point.z-chord.z)
 })
 const peak=Math.max(...bends)
 if(bends.some(bend=>bend<-.001)||peak<width*.008||peak>width*.050)canvasEdgeIssues.push({name,side,normalizedPeak:peak/width,minBend:Math.min(...bends)})
}
assert.equal(canvasEdgeIssues.length,0,'actual gaff edge/free-leech failures: '+JSON.stringify(canvasEdgeIssues))
console.log('PASS both deployed striped panels meet their retained gaff skins and white free leeches curve gently with all original corners retained')

// A/N/L depict separated multi-pane windows in an opaque cream enclosure.
// Sample actual exported ownership, depth and frame contact independently of
// authoring tags. Sixteen existing angular stations/eight windows are retained
// reconstruction, not a claim about hidden canonical counts. The pre-repair
// 29.221m walking datum must not follow the new raised window sill.
const lookoutIssues=[]
const lookoutRoof=lookoutParts.get('Cylinder006'),lookoutFloor=lookoutParts.get('Sunny_Lookout_floor')
assert(lookoutRoof?.faces.length&&lookoutFloor?.faces.length,'lookout needs its actual retained roof and walking floor')
const lookoutRoofBounds=new THREE.Box3().setFromPoints(lookoutRoof.faces.flatMap(f=>f.v))
const lookoutFloorBounds=new THREE.Box3().setFromPoints(lookoutFloor.faces.flatMap(f=>f.v))
const lookoutDatum=lookoutFloorBounds.max.y,lookoutTop=lookoutRoofBounds.min.y
const lookoutCentre=lookoutRoofBounds.getCenter(new THREE.Vector3()),lookoutSize=lookoutRoofBounds.getSize(new THREE.Vector3())
const lookoutHeight=lookoutTop-lookoutDatum
assert(Math.abs(lookoutDatum-29.221)<.001,'retain actual pre-repair 29.221m lookout floor while raising its window sill')
assert(Math.abs(lookoutDatum-metadata.interiors.levels.F3C)<.001,'published lookout walking level must match its actual top')
const lookoutHatch=metadata.interiors.doors.find(d=>d.id==='CrowNestHatch')
assert(lookoutHatch&&Math.abs(lookoutHatch.pos[2]-lookoutDatum)<.001,'hatch station must remain on the actual retained floor')
assert(Math.abs(lookoutDatum-new THREE.Box3().setFromPoints(fittingFaces.get('Cylinder005').flat()).max.y)<.02,'retained floor remains supported by its actual soffit rim')
assert(Math.abs(lookoutHeight-2.2)<.001,'cream belt must retain the existing full-height envelope')
const lookoutSurface=[...lookoutParts].filter(([name])=>/^Sunny_Lookout_(?:pane\d+$|wall_)/.test(name))
/** Read first real wall/glass owners along an exterior ellipse-parameter ray. */
function lookoutHits(angle,height){
 const direction=new THREE.Vector3(lookoutSize.x*Math.cos(angle),0,-lookoutSize.z*Math.sin(angle)).normalize()
 const centre=new THREE.Vector3(lookoutCentre.x,height,lookoutCentre.z)
 const origin=centre.clone().addScaledVector(direction,20),ray=new THREE.Ray(origin,direction.clone().negate()),hits=[]
 for(const [name,part] of lookoutSurface)for(const f of part.faces){
  const p=ray.intersectTriangle(...f.v,false,new THREE.Vector3())
  if(p)hits.push({name,material:f.material,point:p,distance:p.distanceTo(origin)})
 }
 return hits.sort((a,b)=>a.distance-b.distance)
}
for(let sector=0;sector<16;sector++)for(const offset of [.30,.70])for(const level of [.08,.53,.92]){
 const angle=(sector+offset)*Math.PI/8,height=lookoutDatum+lookoutHeight*level
 const first=lookoutHits(angle,height)[0],expected=sector%2===0&&level===.53?'Sunny_glass':'Sunny_cream'
 if(first?.material!==expected)lookoutIssues.push({kind:'belt ownership',sector,offset,level,expected,first:first&&{name:first.name,material:first.material}})
}
for(let sector=1;sector<16;sector+=2){
 const hits=lookoutHits((sector+.5)*Math.PI/8,lookoutDatum+lookoutHeight*.53)
 const owner=hits[0]?.name,distances=[...new Set(hits.filter(h=>h.name===owner).map(h=>Number(h.distance.toFixed(5))))].sort((a,b)=>a-b)
 const depth=distances.length===2?distances[1]-distances[0]:null
 if(depth===null||depth<.12||depth>.30)lookoutIssues.push({kind:'physical opaque pier depth',sector,owner,depth})
}
for(const [name,part] of lookoutSurface.filter(([n])=>n.startsWith('Sunny_Lookout_wall_'))){
 const edges=new Map(),key=p=>p.toArray().map(x=>x.toFixed(4)).join(',')
 for(const f of part.faces)for(let i=0;i<3;i++){
  const a=key(f.v[i]),b=key(f.v[(i+1)%3]);if(a===b)continue
  const edge=[a,b].sort().join('/');edges.set(edge,(edges.get(edge)||0)+1)
 }
 if(!edges.size||[...edges.values()].some(n=>n!==2)||part.faces.some(f=>f.material!=='Sunny_cream'))lookoutIssues.push({kind:'opaque wall closure',name})
}
const lookoutPanes=lookoutSurface.filter(([name])=>/^Sunny_Lookout_pane\d+$/.test(name))
assert.equal(lookoutPanes.length,8,'retain eight reconstructed glazing bays among sixteen original angular stations')
/** Measure actual pane corners against nearby opaque frame surfaces. */
function frameDistance(point,frames){
 const closest=new THREE.Vector3()
 return Math.min(...frames.flatMap(part=>part.faces.map(f=>new THREE.Triangle(...f.v).closestPointToPoint(point,closest).distanceTo(point))))
}
for(const [name,part] of lookoutPanes){
 const bb=new THREE.Box3().setFromPoints(part.faces.flatMap(f=>f.v)),ratio=(bb.max.y-bb.min.y)/lookoutHeight
 if(ratio<.48||ratio>.75||bb.min.y-lookoutDatum<.25||lookoutTop-bb.max.y<.20)lookoutIssues.push({kind:'bounded glazing',name,ratio,bounds:[bb.min.y,bb.max.y]})
 const sector=Number(name.match(/\d+$/)[0]),frames=lookoutSurface.filter(([n])=>n.startsWith('Sunny_Lookout_wall_'+sector+'_')).map(([,p])=>p)
 const corners=[...new Map(part.faces.flatMap(f=>f.v).map(p=>[p.toArray().map(v=>v.toFixed(5)).join(','),p])).values()]
 for(const point of corners){const gap=frameDistance(point,frames);if(!Number.isFinite(gap)||gap>.035)lookoutIssues.push({kind:'glass/frame attachment',name,point:point.toArray(),gap})}
}
assert.equal(lookoutIssues.length,0,'lookout enclosure/glazing construction failures: '+JSON.stringify(lookoutIssues.slice(0,16)))
console.log('PASS actual cream lookout piers/sill/header enclose bounded supported glazing on the unchanged floor/hatch')

// H/A's rounded source bones retain their actual stations and closed bodies.
// Values below measure the preceding frozen enlarged export; they are not
// canonical metre dimensions. Shape/support checks read exported triangles,
// independently of authoring tags and the subdivision/rounding formula.
const bowBoneBaseline={
 Box002:{min:[-39.73658348490602,-46.68987822943791,-10.25768771380636],max:[-32.77181986426911,-23.539173334666184,12.711027920705748],centre:[-36.15519304613265,-34.987661404449135,1.2266711306481142],axis:[.15371488525665986,.7047927606124627,.6925596715365369],ends:[[-38.21487436809812,-44.245013285822786,-7.879967909320912],[-34.184927531869405,-25.752378895992074,10.300204629489428]]},
 Box003:{min:[-39.040454859242345,-46.5776799948772,-15.90389855209145],max:[-32.1613123750827,-23.820341222075463,7.494126456057046],centre:[-35.5019488682396,-35.076673212312166,-4.204884198289697],axis:[.15021657818241116,.6887496156080026,-.7092664849257974],ends:[[-37.515940626554865,-44.12481405015576,5.123241966508548],[-33.57156369737407,-26.037999849089292,-13.512004969290897]]}
}
/** Require actual shared edges and a single connected watertight body. */
function bowClosedBody(name,faces){
 const key=p=>p.toArray().map(v=>v.toFixed(4)).join(','),edges=new Map(),links=new Map()
 for(const face of faces)for(let i=0;i<3;i++){
  const a=key(face[i]),b=key(face[(i+1)%3]);assert.notEqual(a,b,name+' must not contain collapsed body edges')
  const edge=[a,b].sort().join(' / ');edges.set(edge,(edges.get(edge)||0)+1)
  if(!links.has(a))links.set(a,new Set());if(!links.has(b))links.set(b,new Set());links.get(a).add(b);links.get(b).add(a)
 }
 assert(edges.size&&[...edges.values()].every(n=>n===2),name+' must be a closed opaque body')
 const queue=[links.keys().next().value],seen=new Set(queue)
 for(let i=0;i<queue.length;i++)for(const next of links.get(queue[i]))if(!seen.has(next)){seen.add(next);queue.push(next)}
 assert.equal(seen.size,links.size,name+' must be one continuous body, without disconnected cap spheres')
}
/** Slice actual triangles with an independent physical section plane. */
function bowSection(faces,centre,axis,width,depth,station){
 const points=[]
 for(const face of faces)for(let i=0;i<3;i++){
  const a=face[i],b=face[(i+1)%3],da=a.clone().sub(centre).dot(axis)-station,db=b.clone().sub(centre).dot(axis)-station
  if(Math.abs(da)<1e-7)points.push(a)
  if(da*db<0)points.push(a.clone().lerp(b,da/(da-db)))
 }
 assert(points.length>=3,'actual retained bone section must exist')
 const w=points.map(p=>p.clone().sub(centre).dot(width)),d=points.map(p=>p.clone().sub(centre).dot(depth))
 const wlo=Math.min(...w),whi=Math.max(...w),dlo=Math.min(...d),dhi=Math.max(...d)
 return {origin:centre.clone().addScaledVector(axis,station).addScaledVector(width,(wlo+whi)/2).addScaledVector(depth,(dlo+dhi)/2),halfWidth:(whi-wlo)/2,halfDepth:(dhi-dlo)/2,widthCentre:(wlo+whi)/2,depthCentre:(dlo+dhi)/2}
}
const bowDiskName=[...bowMountParts.keys()].find(n=>/^Circle002(?:\.\d+)?$/.test(n))
assert(bowDiskName,'retain actual black/gold source support disk')
const bowDisk=bowMountParts.get(bowDiskName).faces.map(f=>f.v)
for(const [name,baseline]of Object.entries(bowBoneBaseline)){
 const part=bowMountParts.get(name);assert(part?.faces.length,name+' retained bone must exist')
 assert(part.faces.every(f=>f.material==='Sunny_white'),name+' retains white base paint')
 const faces=part.faces.map(f=>f.v),points=faces.flat(),bounds=new THREE.Box3().setFromPoints(points)
 bowClosedBody(name,faces)
 for(let i=0;i<3;i++){
  assert(Math.abs(bounds.min.getComponent(i)-baseline.min[i])<.02,name+' retains original minimum world envelope')
  assert(Math.abs(bounds.max.getComponent(i)-baseline.max[i])<.02,name+' retains original maximum world envelope')
 }
 const centre=new THREE.Vector3(...baseline.centre),axis=new THREE.Vector3(...baseline.axis).normalize(),depth=new THREE.Vector3(1,0,0).addScaledVector(axis,-axis.x).normalize(),width=depth.clone().cross(axis).normalize()
 const stations=points.map(p=>p.clone().sub(centre).dot(axis)),low=Math.min(...stations),high=Math.max(...stations),span=high-low
 for(const fraction of [.30,.50,.70]){
  const section=bowSection(faces,centre,axis,width,depth,low+span*fraction)
  for(let k=0;k<16;k++){
   const angle=k*Math.PI/8,direction=width.clone().multiplyScalar(section.halfWidth*Math.cos(angle)).addScaledVector(depth,section.halfDepth*Math.sin(angle)).normalize()
   const hit=fittingHits(faces,section.origin,direction)[0]
   assert(hit,name+' round shaft has an actual surface in every sampled direction')
   const delta=hit.clone().sub(section.origin),radius=Math.hypot(delta.dot(width)/section.halfWidth,delta.dot(depth)/section.halfDepth)
   assert(radius>.93&&radius<1.06,name+' shaft remains rectangular or excessively pinched: '+JSON.stringify({fraction,angle,radius}))
  }
 }
 for(const fraction of [.40,.50,.60]){
  const section=bowSection(faces,centre,axis,width,depth,low+span*fraction)
  const boneX=featureHits(faces,section.origin.y,section.origin.z),skinX=featureHits(bowDisk,section.origin.y,section.origin.z)
  assert(boneX.length>=2&&skinX.length>=2,name+' retained crossing/root must meet actual source disk skin')
  const overlap=Math.min(boneX.at(-1),skinX.at(-1))-Math.max(boneX[0],skinX[0])
  assert(overlap>.003,name+' loses its supported source crossing/root: '+JSON.stringify({fraction,overlap}))
 }
 for(const [end,sign]of [[0,1],[1,-1]]){
  const section=bowSection(faces,centre,axis,width,depth,low+span*(end?.91:.09)),outward=end?high+headDiameter:low-headDiameter,direction=axis.clone().multiplyScalar(sign)
  const axialHit=w=>{
   const origin=centre.clone().addScaledVector(axis,outward).addScaledVector(width,w).addScaledVector(depth,section.depthCentre),hit=fittingHits(faces,origin,direction)[0]
   return hit?hit.clone().sub(centre).dot(axis):null
  }
  const probes=Array.from({length:41},(_,i)=>{
   const w=section.widthCentre+section.halfWidth*(-.95+1.90*i/40),station=axialHit(w)
   return {w,station,index:i}
  })
  const best=items=>items.filter(p=>p.station!==null).sort((a,b)=>sign*(a.station-b.station))[0]
  const left=best(probes.filter(p=>p.w<section.widthCentre-section.halfWidth*.12)),right=best(probes.filter(p=>p.w>section.widthCentre+section.halfWidth*.12))
  assert(left&&right,name+' retains two actual lobes at each end')
  const notch=axialHit((left.w+right.w)/2)
  assert(notch!==null&&sign*(notch-(left.station+right.station)/2)>.015*headDiameter,name+' end loses its two-lobe notch')
  assert(right.w-left.w>section.halfWidth*.35,name+' terminal lobes must remain visibly separate')
  for(const peak of [left,right]){
   const before=probes[peak.index-2],after=probes[peak.index+2]
   assert(before&&after&&before.station!==null&&after.station!==null,name+' lobe tip needs both curved shoulders')
   assert(sign*((before.station+after.station)/2-peak.station)>.001*headDiameter,name+' retains a flat/angular terminal cap instead of a curved lobe')
  }
  const terminal=points.filter((p,i)=>end?(stations[i]-low)/span>.88:(stations[i]-low)/span<.12),terminalCentre=terminal.reduce((s,p)=>s.add(p),new THREE.Vector3()).divideScalar(terminal.length)
  assert(terminalCentre.distanceTo(new THREE.Vector3(...baseline.ends[end]))<.12*headDiameter,name+' moves a retained terminal region')
 }
}
console.log('PASS both retained bones are continuous closed round shafts with two-lobe ends, unchanged envelopes and source-supported roots')

// H/A shallow rounded heads: sixteen current source stations remain. Roundness
// and embedding are measured against the actual gold skin, not support tags.
const bowStudStations=[
 [-46.48122787475586,-1.2625050246715546],[-45.4176025390625,2.4399664402008057],[-43.43338966369629,6.013144493103027],[-40.53255653381348,8.087506294250488],[-36.85853958129883,8.797281980514526],[-33.00235557556152,7.728653192520142],[-29.77388858795166,5.822370290756226],[-27.349417686462402,2.4472724199295044],[-26.693549156188965,-1.2545666694641113],[-27.34776782989502,-4.957039833068848],[-29.41874885559082,-8.09645676612854],[-32.485992431640625,-10.421008110046387],[-35.86203193664551,-11.453502178192139],[-40.19023323059082,-10.673288822174072],[-43.362924575805664,-8.214980363845825],[-45.48226737976074,-4.9643635749816895]
]
const bowStudSizes=[[1.7584304809570312,1.4795504212379456],[1.766693115234375,1.4767484664916992],[1.5189704895019531,1.7949552536010742],[1.5218620300292969,1.82659912109375],[1.6940689086914062,1.8415188789367676],[1.7593574523925781,1.8275084495544434],[1.8119258880615234,1.6647143363952637],[1.8156490325927734,1.4767496585845947],[1.8192081451416016,1.4795506000518799],[1.8156490325927734,1.4767484664916992],[1.801513671875,1.470324993133545],[1.8222198486328125,1.762350082397461],[1.6940650939941406,1.7397260665893555],[1.5637397766113281,1.7618627548217773],[1.6881980895996094,1.7657408714294434],[1.7666969299316406,1.4767484664916992]]
const bowStuds=[...bowMountParts].filter(([name])=>/^Circle0(?:0[3-9]|1[0-8])(?:\.\d+)?$/.test(name))
assert.equal(bowStuds.length,16,'retain exactly sixteen existing collar heads; source count is not canonical proof')
for(const [name,part]of bowStuds){
 const index=Number(name.slice(6,9))-3,faces=part.faces.map(f=>f.v),bb=new THREE.Box3().setFromPoints(faces.flat()),size=bb.getSize(new THREE.Vector3()),centre=bb.getCenter(new THREE.Vector3()),radius=Math.min(size.y,size.z)/2
 bowClosedBody(name,faces)
 assert(part.faces.every(f=>f.material==='Sunny_gold'),name+' retains gold base paint')
 assert(Math.abs(centre.y-bowStudStations[index][0])<.005&&Math.abs(centre.z-bowStudStations[index][1])<.005,name+' moves its retained source station')
 for(const [dimension,original]of [[size.y,bowStudSizes[index][0]],[size.z,bowStudSizes[index][1]]])assert(dimension/original>=.845&&dimension/original<1.005,name+' loses its retained supported footprint')
 const projection=(fraction,angle)=>{
  const y=centre.y+size.y/2*fraction*Math.sin(angle),z=centre.z+size.z/2*fraction*Math.cos(angle),head=featureHits(faces,y,z),skin=featureHits(bowDisk,y,z)
  assert(head.length>=2&&skin.length>=2,name+' needs actual head and collar surfaces at every sample')
  assert(head.at(-1)>skin[0]+.003,name+' rear must embed in actual collar skin')
  const amount=skin[0]-head[0];assert(amount>.003&&amount<radius*.40,name+' has an excessive or recessed head projection')
  // This is source material ownership, read directly from real triangle hits.
  const ray=new THREE.Ray(new THREE.Vector3(lionBounds.min.x-lionRadius*3,y,z),new THREE.Vector3(1,0,0)),hits=[]
  for(const f of bowMountParts.get(bowDiskName).faces){const p=ray.intersectTriangle(...f.v,false,new THREE.Vector3());if(p)hits.push({x:p.x,material:f.material})}
  hits.sort((a,b)=>a.x-b.x);assert.equal(hits[0]?.material,'Sunny_gold',name+' must sit on the actual gold band')
  return amount
 }
 const crown=projection(0,0)
 for(let k=0;k<8;k++){
  const angle=k*Math.PI/4,middle=projection(.45,angle),edge=projection(.85,angle)
  assert(crown-middle>radius*.02&&middle-edge>radius*.04,name+' must have a genuinely curved shallow crown rather than a flat peg end')
 }
}
console.log('PASS all sixteen retained collar stations have closed shallow rounded gold heads embedded in their actual gold support skin')

// Actual side-port depth and opening ownership: a solid shallow black cap
// cannot satisfy these rays, even if the pale rim and source cut are present.
const portBores=[...hullPortParts].filter(([name])=>/_bore$/.test(name))
assert.equal(portBores.length,14,'retain all fourteen source-derived side-port stations')
const portOwners=[...hullPortWallFaces,...[...hullPortParts].flatMap(([name,part])=>part.faces.map(v=>({name,v})))]
for(const [name,part]of portBores){
 const bb=new THREE.Box3().setFromPoints(part.faces.flat()),centre=bb.getCenter(new THREE.Vector3()),sign=name.includes('_port_')?1:-1
 const front=sign>0?bb.max.z:bb.min.z,back=sign>0?bb.min.z:bb.max.z,depth=Math.abs(front-back)
 assert(depth>.85&&depth<1.15,name+' needs an actual deep reveal, not a shallow blind cap')
 bowClosedBody(name,part.faces)
 const radius=Math.min(bb.max.x-bb.min.x,bb.max.y-bb.min.y)/2-.10
 const frame=hullPortParts.get(name.replace('_bore','_frame'))
 assert(frame&&hullPortParts.has(name+'_rear'),name+' retains its supported pale rim and recessed rear')
 for(let i=0;i<8;i++){
  const angle=i*Math.PI/4+.001,radial=new THREE.Vector3(Math.cos(angle),Math.sin(angle),0)
  const joinOrigin=new THREE.Vector3(centre.x,centre.y,front).addScaledVector(radial,radius-.02)
  const join=fittingHits(frame.faces,joinOrigin,radial)[0]
  assert(join&&join.distanceTo(joinOrigin)<.18,name+' reveal loses contact with its actual pale frame')
 }
 for(const fraction of [0,.45,.70])for(let i=0;i<(fraction?8:1);i++){
  const angle=i*Math.PI/4,origin=new THREE.Vector3(centre.x+radius*fraction*Math.cos(angle),centre.y+radius*fraction*Math.sin(angle),front+sign*.25)
  const ray=new THREE.Ray(origin,new THREE.Vector3(0,0,-sign)),hits=[]
  for(const owner of portOwners){const p=ray.intersectTriangle(...owner.v,false,new THREE.Vector3());if(p)hits.push({name:owner.name,distance:p.distanceTo(origin)})}
  hits.sort((a,b)=>a.distance-b.distance)
  assert.equal(hits[0]?.name,name+'_rear',name+' opening is blocked by an unrecessed cap or source wall: '+JSON.stringify(hits[0]))
  assert(hits[0].distance-.25>.85,name+' dark rear is not actually behind the hollow reveal')
 }
}
console.log('PASS fourteen retained side ports have closed hollow reveals, connected pale rims and unobstructed actual depth through source layers')

// H's round hawse must mount on the actual sloped bow, with an open short
// reveal. Fixtures preserve source anchor/hole stations; hidden routing is not
// asserted. Every support/depth/rope join is read from exported triangles.
const anchorHoleFixtures={
 port:{ball:'Sphere006',surface:[-27.41625946044922,-35.632965087890625,13.340402603149414],end:[-28.71837043762207,-34.90296173095703,13.340402603149414],flukes:['NGon007','NGon013','NGon014']},
 starboard:{ball:'Sphere009',surface:[-27.19848983764648,-35.63296127319336,-16.067489624023438],end:[-28.718374252319336,-34.902957916259766,-16.067489624023438],flukes:['NGon018','NGon019','NGon020']}
}
const anchorShield=anchorParts.get([...anchorParts.keys()].find(n=>/^Circle038(?:\.\d+)?$/.test(n)))
assert(anchorShield?.faces.length,'retain the actual bow shield supporting both hawse holes')
function anchorPoints(faces){return [...new Map(faces.flat().map(p=>[p.toArray().map(x=>x.toFixed(5)).join(':'),p])).values()]}
function anchorCapCentres(faces){
 const planes=[]
 for(const face of faces){
  let normal=face[1].clone().sub(face[0]).cross(face[2].clone().sub(face[0])).normalize()
  const lead=normal.toArray().find(v=>Math.abs(v)>1e-5);if(lead<0)normal.negate()
  const offset=normal.dot(face[0])
  let plane=planes.find(p=>p.normal.dot(normal)>.99999&&Math.abs(p.offset-offset)<.00005)
  if(!plane){plane={normal,offset,faces:[]};planes.push(plane)}plane.faces.push(face)
 }
 return planes.filter(p=>anchorPoints(p.faces).length===12).map(p=>{const points=anchorPoints(p.faces);return points.reduce((c,p)=>c.add(p),new THREE.Vector3()).multiplyScalar(1/points.length)})
}
const anchorJoinIssues=[]
for(const [side,fixture]of Object.entries(anchorHoleFixtures)){
 const name='Sunny_Anchor_'+side,collar=anchorParts.get(name+'_hawse'),bore=anchorParts.get(name+'_bore'),body=anchorParts.get(fixture.ball)
 assert(collar?.faces.length&&bore?.faces.length&&body?.faces.length,side+' needs the retained ball, actual hawse and reveal')
 assert(fixture.flukes.every(n=>anchorParts.get(n)?.faces.length),side+' keeps all three retained source flukes')
 const surface=new THREE.Vector3(...fixture.surface),normal=new THREE.Vector3(collar.tags.sunny_hawse_axis?.[0]??0,collar.tags.sunny_hawse_axis?.[2]??0,-(collar.tags.sunny_hawse_axis?.[1]??0)).normalize()
 assert(normal.x<-.25,side+' hawse axis must face outward from the actual bow')
 const u=normal.clone().cross(new THREE.Vector3(0,1,0)).normalize(),v=normal.clone().cross(u).normalize()
 const actualNormal=new THREE.Vector3()
 for(const offset of [[0,.75,0],[0,-.75,0],[0,0,.75],[0,0,-.75]]){
  const origin=surface.clone().add(new THREE.Vector3(...offset));origin.x-=4
  const ray=new THREE.Ray(origin,new THREE.Vector3(1,0,0)),hits=[]
  for(const face of anchorShield.faces){const p=ray.intersectTriangle(...face,false,new THREE.Vector3());if(p)hits.push({p,face})}
  hits.sort((a,b)=>a.p.x-b.p.x);assert(hits.length,side+' needs independent actual shield normals around the source hole')
  const face=hits[0].face,n=face[1].clone().sub(face[0]).cross(face[2].clone().sub(face[0])).normalize();if(n.x>0)n.negate();actualNormal.add(n)
 }
 assert(normal.dot(actualNormal.normalize())>.985,side+' collar normal must follow independent surrounding bow triangles')
 bowClosedBody(name+'_hawse',collar.faces);bowClosedBody(name+'_bore',bore.faces)
 const radial=anchorPoints(collar.faces).map(p=>{const d=p.clone().sub(surface);return d.addScaledVector(normal,-d.dot(normal)).length()})
 assert(Math.abs(Math.min(...radial)-.385)<.003&&Math.abs(Math.max(...radial)-.595)<.003,side+' round collar preserves its transverse size in the actual skin plane')
 for(let k=0;k<32;k++){
  const angle=k*Math.PI/16,point=surface.clone().addScaledVector(u,.49*Math.cos(angle)).addScaledVector(v,.49*Math.sin(angle)),origin=point.clone().addScaledVector(normal,3),direction=normal.clone().negate()
  const skin=fittingHits(anchorShield.faces,origin,direction),lip=fittingHits(collar.faces,origin,direction)
  if(!skin.length||lip.length<2){anchorJoinIssues.push({side,kind:'missing real collar/skin join',angle});continue}
  const front=lip[0].clone().sub(skin[0]).dot(normal),back=lip.at(-1).clone().sub(skin[0]).dot(normal)
  if(front<.10||front>.20||back>-.005||back<-.060)anchorJoinIssues.push({side,kind:'collar support',angle,front,back})
 }
 for(let k=0;k<9;k++){
  const angle=k*Math.PI/4,r=k===8?0:.30,point=surface.clone().addScaledVector(u,r*Math.cos(angle)).addScaledVector(v,r*Math.sin(angle)),origin=point.clone().addScaledVector(normal,3),direction=normal.clone().negate()
  const reveal=fittingHits(bore.faces,origin,direction),shield=fittingHits(anchorShield.faces,origin,direction)
  const depth=reveal.length?reveal[0].clone().sub(point).dot(normal):null
  if(depth===null||depth>-.20||depth<-.38||reveal.length<2||reveal[0].distanceTo(reveal.at(-1))>.06||shield.some(p=>p.distanceTo(origin)<3.45))anchorJoinIssues.push({side,kind:'plugged or unsupported reveal',angle,depth})
 }
 const caps=[]
 for(let i=0;i<12;i++){
  const ropeName=name+'_rope'+(i?'.'+String(i).padStart(3,'0'):''),rope=anchorParts.get(ropeName)
  assert(rope?.faces.length,ropeName+' preserves the visible stowed rope segment')
  const ends=anchorCapCentres(rope.faces);assert.equal(ends.length,2,ropeName+' needs two actual sealed twelve-vertex end rings');caps.push(ends)
  if(i&&Math.min(...caps[i-1].flatMap(a=>ends.map(b=>a.distanceTo(b))))>.001)anchorJoinIssues.push({side,kind:'broken rope seam',segment:i})
 }
 const entry=caps[0].sort((a,b)=>a.clone().sub(surface).dot(normal)-b.clone().sub(surface).dot(normal))[0],entryDepth=entry.clone().sub(surface).dot(normal)
 if(entryDepth>-.20||entryDepth<-.32||entry.clone().sub(surface).addScaledVector(normal,-entryDepth).length()>.02)anchorJoinIssues.push({side,kind:'rope misses real reveal',entry:entry.toArray(),entryDepth})
 const end=new THREE.Vector3(...fixture.end),last=caps.at(-1).sort((a,b)=>a.distanceTo(end)-b.distanceTo(end))[0]
 if(last.distanceTo(end)>.001)anchorJoinIssues.push({side,kind:'moved retained ball endpoint',last:last.toArray()})
 const gap=Math.min(...body.faces.map(f=>new THREE.Triangle(...f).closestPointToPoint(last,new THREE.Vector3()).distanceTo(last)))
 if(gap>.065)anchorJoinIssues.push({side,kind:'rope loses actual ball skin',gap})
}
assert.equal(anchorJoinIssues.length,0,'both stowed anchors need actual sloped hawse/rope joins and hollow reveals: '+JSON.stringify(anchorJoinIssues))
console.log('PASS both retained three-fluke anchors keep continuous stowed ropes entering hollow circular hawses supported by the actual sloped bow skin')

// A/C distinguish six bulbous gold shield bosses from the sixteen smaller
// collar heads. Retain measured existing stations/footprints; inferred dome
// depth is reconstruction. Read actual surfaces and paint ownership.
const bowShieldBaseline={
 Cylinder050:{station:[-39.6084369699077,12.447895714651786],size:[2.49122369933756,2.123725801082058]},
 Cylinder051:{station:[-45.41129004041511,9.277812253838336],size:[2.534976624588637,2.3595900139413963]},
 Cylinder052:{station:[-49.533391693851584,2.5341625707112736],size:[2.4903366030978518,2.555091876476509]},
 Cylinder053:{station:[-49.25767129754999,-4.699097170224503],size:[2.4903328571907863,2.5550899365099697]},
 Cylinder054:{station:[-45.21474114914684,-11.224399045662343],size:[2.5349724285078423,2.3595905418951055]},
 Cylinder055:{station:[-39.6084343465599,-14.74935377080887],size:[2.491220458184749,2.123729422149774]}
}
const bowShieldName=[...bowShieldParts.keys()].find(name=>/^Circle038(?:\.\d+)?$/.test(name))
assert(bowShieldName,'retain the actual red/white source bow shield')
const bowShield=bowShieldParts.get(bowShieldName),shieldFaces=bowShield.faces.map(f=>f.v)
const shieldBosses=[...bowShieldParts].filter(([name])=>/^Cylinder05[0-5](?:\.\d+)?$/.test(name))
assert.equal(shieldBosses.length,6,'retain six outer shield bosses separately from sixteen collar heads')
for(const [name,part]of shieldBosses){
 const base=bowShieldBaseline[name.split('.')[0]],faces=part.faces.map(f=>f.v),bb=new THREE.Box3().setFromPoints(faces.flat()),size=bb.getSize(new THREE.Vector3()),centre=bb.getCenter(new THREE.Vector3()),radius=Math.min(size.y,size.z)/2
 bowClosedBody(name,faces)
 assert(part.faces.every(f=>f.material==='Sunny_gold'),name+' keeps gold base paint')
 assert(Math.abs(centre.y-base.station[0])<.005&&Math.abs(centre.z-base.station[1])<.005,name+' moves a retained source boss station')
 for(const [dimension,original]of [[size.y,base.size[0]],[size.z,base.size[1]]])assert(dimension/original>=.845&&dimension/original<1.005,name+' loses its retained supported footprint')
 const projection=(fraction,angle)=>{
  const y=centre.y+size.y/2*fraction*Math.sin(angle),z=centre.z+size.z/2*fraction*Math.cos(angle),head=featureHits(faces,y,z),skin=featureHits(shieldFaces,y,z)
  assert(head.length>=2&&skin.length>=2,name+' requires real boss and red shield surfaces')
  assert(head.at(-1)>skin[0]+.003,name+' must embed in its actual source shield')
  const amount=skin[0]-head[0];assert(amount>.003&&amount<radius*1.05,name+' dome leaves its supported bow envelope')
  const ray=new THREE.Ray(new THREE.Vector3(lionBounds.min.x-lionRadius*3,y,z),new THREE.Vector3(1,0,0)),hits=[]
  for(const f of bowShield.faces){const p=ray.intersectTriangle(...f.v,false,new THREE.Vector3());if(p)hits.push({x:p.x,material:f.material})}
  hits.sort((a,b)=>a.x-b.x);assert((fraction===0?['Sunny_red']:['Sunny_red','Sunny_white']).includes(hits[0]?.material),name+' requires a red centre and actual painted shield support at its retained edges')
  return amount
 }
 const crown=projection(0,0)
 assert(crown>radius*.45,name+' needs the fuller A/C outer boss rather than a flat plate or shallow collar stud')
 for(let k=0;k<8;k++){
  const angle=k*Math.PI/4,middle=projection(.45,angle),edge=projection(.85,angle)
  assert(crown-middle>radius*.08&&middle-edge>radius*.20,name+' needs actual round crown/shoulder curvature')
 }
}
console.log('PASS six retained outer bow shield bosses have rounded crowns, red centres and actual painted-skin support at unchanged stations')

// C/N establish one diagonal tie, not an invented system of hidden tackle.
// Read its own physical end rings and their real spar/rim contacts independently.
const actualGaffTie=gaffTieParts.get('Sunny_MainGaff_roof_tie')
assert(actualGaffTie?.length,'C/N lowest main gaff needs its single visible Library-rim tie')
bowClosedBody('Sunny_MainGaff_roof_tie',actualGaffTie)
const gaffTieEnds=anchorCapCentres(actualGaffTie)
assert.equal(gaffTieEnds.length,2,'main-gaff tie needs two actual sealed end rings')
const gaffTieRim=[...gaffTieParts].filter(([name])=>name.startsWith('Sunny_LibraryRoof_toprim')).flatMap(([,faces])=>faces),gaffTieSpar=gaffTieParts.get('Cylinder013')
assert(gaffTieRim.length&&gaffTieSpar?.length,'preserve both actual supports of the single diagonal tie')
function gaffTieSkinGap(point,faces){return Math.min(...faces.map(face=>new THREE.Triangle(...face).closestPointToPoint(point,new THREE.Vector3()).distanceTo(point)))}
const gaffTieAssignments=gaffTieEnds.map(point=>({point,spar:gaffTieSkinGap(point,gaffTieSpar),rim:gaffTieSkinGap(point,gaffTieRim)})).sort((a,b)=>a.spar-b.spar)
assert(gaffTieAssignments[0].spar<=.020&&gaffTieAssignments[1].rim<=.020,'single diagonal tie must meet real lowest-gaff and Library-rim triangles')
const gaffTieSpan=new THREE.Box3().setFromPoints(gaffTieSpar.flat()),gaffTip=gaffTieAssignments[0].point,roofTip=gaffTieAssignments[1].point
assert(gaffTip.x>gaffTieSpan.max.x-.35&&gaffTip.y>roofTip.y&&gaffTip.distanceTo(roofTip)>.50,'tie must descend from the retained free gaff tip to the roof rim, not join unrelated roots')
console.log('PASS the single C/N lowest-main-gaff diagonal tie has actual closed end rings contacting the retained free spar tip and Library roof rim')

// Independent exported aft construction guards. A/N establish the curved red
// side skin/cream bow end and arched sash form; hidden counts/metres remain
// reconstruction. All preceding exterior groups/tolerances remain unchanged.
// The certified Boolean skin contains distinct 23–70 µm edges. Measure
// actual shared topology at 1 µm rather than collapsing it into 100 µm keys.
function aftClosedBody(name,faces){
 const key=p=>p.toArray().map(v=>v.toFixed(6)).join(','),edges=new Map(),links=new Map()
 for(const face of faces)for(let i=0;i<3;i++){
  const a=key(face[i]),b=key(face[(i+1)%3]);assert.notEqual(a,b,name+' must not contain collapsed body edges')
  const edge=[a,b].sort().join(' / ');edges.set(edge,(edges.get(edge)||0)+1)
  if(!links.has(a))links.set(a,new Set());if(!links.has(b))links.set(b,new Set());links.get(a).add(b);links.get(b).add(a)
 }
 assert(edges.size&&[...edges.values()].every(n=>n===2),name+' must be a closed opaque body')
 const queue=[links.keys().next().value],seen=new Set(queue)
 for(let i=0;i<queue.length;i++)for(const next of links.get(queue[i]))if(!seen.has(next)){seen.add(next);queue.push(next)}
 assert.equal(seen.size,links.size,name+' must be one continuous body, without disconnected cap spheres')
}
function aftSurfaceHits(faces,origin,direction){
 const raw=fittingHits(faces,origin,direction)
 return raw.filter((point,i)=>!i||point.distanceTo(raw[i-1])>.000001)
}

const aftEnvelope=metadata.interiors.aftEnclosures?.[0],aftNative=aftParts.get('对象003')
assert(aftEnvelope&&aftNative,'complete source-derived upper aft envelope must publish')
assert(Math.abs(aftEnvelope.floor-metadata.interiors.levels.F2A)<.002&&Math.abs(aftEnvelope.top-metadata.interiors.levels.F3G)<.002,'aft walking levels must stay fixed')
assert(aftNative.faces.some(f=>f.material==='Sunny_red')&&aftNative.faces.some(f=>f.material==='Sunny_cream'),'aft requires actual red curved outside and cream front/inside surfaces')
aftClosedBody('closed source-derived aft envelope',aftNative.faces.map(f=>f.v))
const aftSkin=aftNative.faces.map(f=>f.v),aftFloor=aftEnvelope.floor
function aftWorld(p){return new THREE.Vector3(p[0],p[2],-p[1])}
// Real lower/upper side rays behind the stair passage require an actual vault,
// rather than a rectangular cream room carrying a curved-roof metadata tag.
for(const side of [-1,1]){
 const sideZ=side*30,direction=new THREE.Vector3(0,0,-side)
 const lower=fittingHits(aftSkin,new THREE.Vector3(21.4,aftFloor+.35,sideZ),direction)[0]
 const upper=fittingHits(aftSkin,new THREE.Vector3(21.4,aftEnvelope.top-.30,sideZ),direction)[0]
 assert(lower&&upper,'aft native vault needs real side surfaces at both heights')
 assert(Math.abs(lower.z-upper.z)>.45,'aft side wall must retain the native roof curvature through height')
 assert(Math.abs(lower.x-upper.x)<.001,'comparison keeps the same aft source station')
}
// Actual room/entry floor triangles support the recovered native footing;
// staircase/door apertures are excluded by the real absence of wall hits.
let supportedAftFeet=0
for(let i=0;i<96;i++){
 const angle=i*Math.PI*2/96,origin=new THREE.Vector3(18.5,aftFloor+.04,-1.25)
 const direction=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)),hit=fittingHits(aftSkin,origin,direction)[0]
 if(!hit||hit.distanceTo(origin)>30)continue
 const floorHit=fittingHits(aftFloorFaces,hit.clone().add(new THREE.Vector3(0,.06,0)),new THREE.Vector3(0,-1,0))[0]
 assert(floorHit&&Math.abs(floorHit.y-aftFloor)<.03,'aft recovered wall footing lacks actual retained floor support')
 supportedAftFeet++
}
assert(supportedAftFeet>65,'aft support guard must measure actual recovered wall around most of the footprint')
console.log('PASS aft native red/cream envelope is closed, curved through height and supported on retained floors')

const aftWindows=[...aftParts].filter(([name,part])=>part.tags.sunny_aft_window_id)
assert.equal(aftWindows.length,10,'four retained bow + six disclosed reconstructed side/rear upper sash stations')
for(const [name,part]of aftWindows){
 const tags=part.tags,id=tags.sunny_aft_window_id,centre=aftWorld(tags.sunny_aft_window_position)
 const normal=aftWorld(tags.sunny_aft_window_outward).normalize(),lateral=new THREE.Vector3(-tags.sunny_aft_window_outward[1],0,-tags.sunny_aft_window_outward[0])
 const radius=tags.sunny_aft_window_radius,straight=tags.sunny_aft_window_straight,faces=part.faces.map(f=>f.v)
 aftClosedBody(name,faces)
 assert(part.faces.every(f=>f.material==='Sunny_glass'),name+' requires actual glazing geometry')
 const frames=[...aftParts].filter(([frameName])=>frameName.startsWith('Sunny_'+id+'_frame')).flatMap(([,p])=>p.faces.map(f=>f.v))
 assert(frames.length,name+' must have an attached real arched frame')
 for(const point of faces.flat()){
  const offset=point.clone().sub(centre),x=offset.dot(lateral),height=offset.y
  const crown=straight+Math.sqrt(Math.max(0,radius*radius-x*x))
  if(!(Math.abs(Math.abs(x)-radius)<.002||height<.002||Math.abs(height-crown)<.003))continue
  let gap=Infinity
  for(const v of frames)gap=Math.min(gap,new THREE.Triangle(...v).closestPointToPoint(point,new THREE.Vector3()).distanceTo(point))
  assert(gap<.075,name+' curved glass loses physical frame contact')
 }
 for(const horizontal of [0,.40])for(const height of [.30,.90,straight+radius*.45]){
  const origin=centre.clone().addScaledVector(lateral,horizontal*radius).add(new THREE.Vector3(0,height,0)).addScaledVector(normal,5)
  const pane=aftSurfaceHits(faces,origin,normal.clone().negate()),skin=fittingHits(aftSkin,origin,normal.clone().negate())
  assert(pane.length>=2,name+' requires both real glazing surfaces')
  assert(pane[1].distanceTo(pane[0])>.018&&pane[1].distanceTo(pane[0])<.045,name+' glazing must retain physical human-scale thickness')
  assert(!skin[0]||pane[0].distanceTo(origin)<skin[0].distanceTo(origin)-.01,name+' aperture is occluded by source wall')
 }
 // Both upper arch corners remain closed wall, not the square hole of a
 // rectangular cut with an unsupported floating semicircular trim.
 for(const sign of [-1,1]){
  const origin=centre.clone().addScaledVector(lateral,sign*radius*.85).add(new THREE.Vector3(0,straight+radius*.80,0)).addScaledVector(normal,5)
  const skin=fittingHits(aftSkin,origin,normal.clone().negate())
  assert(skin[0]&&skin[0].distanceTo(origin)<7,name+' must retain actual solid corners above its arched opening')
  assert.equal(fittingHits(faces,origin,normal.clone().negate()).length,0,name+' glazing must not fill a rectangular opening above the crown')
 }
}
console.log('PASS retained/new aft arches have real crown corners, closed curved glazing, skin openings and attached sash frames')

for(const [id,x,off,width]of [['DiningEntrance',12.3,-4.2,1.30],['KitchenEntrance',12.3,4.2,1.30],['PantryOutsideDoor',24.65,5,1.05],['SickOutsideDoor',24.65,-5,1.05]]){
 const door=metadata.interiors.doors.find(d=>d.id===id),cy=.585*2.2
 assert(door&&Math.abs(door.pos[0]-x)<.001&&Math.abs(door.pos[1]-(cy+off))<.001&&Math.abs(door.width-width)<.001,id+' must retain its exact station and human width')
 for(const across of [-.34,0,.34])for(const height of [.10,.90,1.75]){
  const origin=new THREE.Vector3(x-1.5,aftFloor+height,-door.pos[1]+across)
  assert(!fittingHits(aftSkin,origin,new THREE.Vector3(1,0,0)).some(p=>p.x<x+1.5),id+' recovered vault blocks its normal-human doorway')
 }
}
assert(aftTreads.size>40,'both actual garden flights must remain published')
const aftStandingSurfaces=[...aftSkin,...(aftParts.get('Sunny_AftF2_ceiling')?.faces.map(f=>f.v)||[])]
for(const [name,faces]of aftTreads){
 const bounds=new THREE.Box3().setFromPoints(faces.flat()),centre=bounds.getCenter(new THREE.Vector3());centre.y=bounds.max.y
 for(const height of [.15,.90,1.75])for(let i=0;i<8;i++){
  const origin=centre.clone().add(new THREE.Vector3(0,height,0)),direction=new THREE.Vector3(Math.cos(i*Math.PI/4),0,Math.sin(i*Math.PI/4))
  assert(!fittingHits(aftStandingSurfaces,origin,direction).some(p=>p.distanceTo(origin)<.36),name+' source recovery blocks actual normal-human body clearance')
 }
 const head=fittingHits(aftStandingSurfaces,centre.clone().add(new THREE.Vector3(0,.04,0)),new THREE.Vector3(0,1,0))[0]
 assert(!head||head.y-centre.y>1.80,name+' source recovery or ceiling blocks normal-human headroom')
}
console.log('PASS all fixed aft door stations and both real garden flights retain human body/headroom through the recovered envelope')

// N explicitly shows two arch-headed upper aft entrances. Read actual leaf,
// fixed crown and source-wall corners; a decorated square hole cannot pass.
const aftDoorArchCollision=loadColliders('public/models/sunny-collision.glb')
for(const id of ['DiningEntrance','KitchenEntrance']){
 const spec=metadata.interiors.doors.find(d=>d.id===id),leaf=aftDoorArchParts.get(spec.node)
 const crown=aftDoorArchParts.get('Sunny_'+id+'_frame_head')
 assert(leaf?.tags.sunny_door_arch&&crown?.tags.sunny_door_arch_frame,id+' requires physical arch leaf and fixed crown')
 assert(crown.tags.sunny_rail,id+' crown must use individual surface collision rather than a full blocking rectangle')
 aftClosedBody(spec.node,leaf.faces);aftClosedBody('Sunny_'+id+'_frame_head',crown.faces)
 assert(Math.abs(spec.height-2.24)<1e-9&&Math.abs(spec.baseOffset-1.15)<1e-9&&Math.abs(spec.thickness-.075)<1e-9,id+' original door dimensions/root must stay fixed')
 assert(Math.abs(spec.slide[0])<1e-12&&Math.abs(spec.slide[1]-1.36)<1e-9&&spec.slide[2]===0,id+' original slide must stay fixed')
 const centre=aftWorld(spec.pos),lateral=new THREE.Vector3(Math.cos(spec.rot),0,-Math.sin(spec.rot)),normal=new THREE.Vector3(-Math.sin(spec.rot),0,-Math.cos(spec.rot))
 const radius=spec.width/2,spring=spec.height-radius,wallRadius=(spec.width+.10)/2,wallSpring=spec.height+.12-wallRadius
 const ray=(across,height)=>centre.clone().addScaledVector(lateral,across).add(new THREE.Vector3(0,height,0)).addScaledVector(normal,1.5)
 for(const across of [-radius*.4,0,radius*.4]){
  assert(fittingHits(leaf.faces,ray(across,.03+spring+radius*.60),normal.clone().negate()).length>=2,id+' must retain real closed arch crown surfaces')
 }
 for(const sign of [-1,1]){
  assert.equal(fittingHits(leaf.faces,ray(sign*radius*.85,.03+spring+radius*.80),normal.clone().negate()).length,0,id+' original square leaf corners must be removed')
  const corner=ray(sign*wallRadius*.85,wallSpring+wallRadius*.80)
  assert(fittingHits(aftSkin,corner,normal.clone().negate()).some(p=>p.distanceTo(corner)<3),id+' upper opening corners need actual closed wall')
 }
 const crownProxies=aftDoorArchCollision.filter(b=>b.name.includes('COLL_Rail_Sunny_'+id+'_frame_head_'))
 assert(crownProxies.length>0,id+' actual crown needs physical surface proxies')
 assert(!aftDoorArchCollision.some(b=>b.name==='COLL_Solid_Sunny_'+id+'_frame_head'),id+' a crown bounding box would fill the arch')
 for(const across of [-.20,0,.20])for(const offset of [-.50,0,.50]){
  const feet=centre.clone().addScaledVector(lateral,across).addScaledVector(normal,offset)
  assert(!crownProxies.some(b=>b.max.x>feet.x-.34&&b.min.x<feet.x+.34&&b.max.z>feet.z-.34&&b.min.z<feet.z+.34&&b.max.y>feet.y+.02&&b.min.y<feet.y+1.75),id+' fixed arch crown blocks normal body clearance')
 }
}
console.log('PASS both N upper-aft entrances retain exact dynamic roots/slide, real closed arch leaves and surface-collision crowns, true wall corners and normal-human headroom')

// A/C/N show the lower exposed sash tier. Measure real outside owners, joined
// deep reveals and closed panes; an inner-box window behind intact hull fails.
const aquariumRecords=metadata.interiors.aquariumWindows??[]
const aquariumPanes=[...aquariumLowerParts].filter(([,part])=>part.tags.sunny_aquarium_window_id)
assert.equal(aquariumRecords.length,6,'retain six disclosed lower side/rear sash stations')
assert.equal(aquariumPanes.length,6,'actual lower side/rear panes must publish')
assert.equal(glb.json.nodes.filter(n=>n.name==='Line002').length,1,'lower tier must paint actual source hull, without overlay duplicates')
const aquariumPaint=metadata.interiors.aquariumSidePaintBounds
assert(aquariumPaint?.length===6,'limited lower side paint bounds must be disclosed')
const aquariumHull=aquariumLowerParts.get('Line002')
assert(aquariumHull,'retain the actual supporting source hull')
let aquariumCreamFaces=0
for(const f of aquariumHull.faces.filter(f=>f.material==='Sunny_cream')){
 aquariumCreamFaces++
 for(const point of f.v){
  const p=[point.x,-point.z,point.y],eps=.00002
  assert(p[0]>=aquariumPaint[0]-eps&&p[0]<=aquariumPaint[1]+eps&&p[2]>=aquariumPaint[4]-eps&&p[2]<=aquariumPaint[5]+eps,'lower cream paint escapes its retained source tier')
  assert(p[1]<=aquariumPaint[2]+eps||p[1]>=aquariumPaint[3]-eps,'lower cream paint spills inside unrelated hull surfaces')
 }
}
assert(aquariumCreamFaces>40,'lower side sash walls require actual bounded cream faces')
function aquariumOwner(faces,origin,direction){
 const ray=new THREE.Ray(origin,direction),hits=[]
 for(const f of faces){const point=ray.intersectTriangle(...f.v,false,new THREE.Vector3());if(point)hits.push({point,material:f.material,distance:point.distanceTo(origin)})}
 hits.sort((a,b)=>a.distance-b.distance);return hits[0]
}
for(const [name,part]of aquariumPanes){
 const tags=part.tags,id=tags.sunny_aquarium_window_id,spec=aquariumRecords.find(r=>r.id===id)
 assert(spec,id+' must preserve source support/station metadata')
 const centre=aftWorld(tags.sunny_aquarium_window_position),normal=aftWorld(tags.sunny_aquarium_window_outward).normalize()
 const lateral=new THREE.Vector3(-tags.sunny_aquarium_window_outward[1],0,-tags.sunny_aquarium_window_outward[0])
 const radius=tags.sunny_aquarium_window_radius,straight=tags.sunny_aquarium_window_straight
 assert(centre.distanceTo(aftWorld(spec.position))<.00002,id+' metadata must match the actual glass root')
 const faces=part.faces.map(f=>f.v),reveal=aquariumLowerParts.get('Sunny_'+id+'_reveal')
 assert(reveal?.faces.length,id+' requires a joining physical reveal')
 aftClosedBody(name,faces);aftClosedBody(id+' reveal',reveal.faces.map(f=>f.v))
 assert(part.faces.every(f=>f.material==='Sunny_glass')&&reveal.faces.every(f=>f.material==='Sunny_cream'),id+' pane/reveal use the existing reference palette')
 const outer=aquariumLowerParts.get(spec.outerSkin),inner=aquariumLowerParts.get(spec.innerSkin)
 assert(outer&&inner,id+' needs both actual retained support skins')
 const skin=[...outer.faces,...(outer===inner?[]:inner.faces)]
 const frames=[...aquariumLowerParts].filter(([frameName])=>frameName.startsWith('Sunny_'+id+'_frame')).flatMap(([,p])=>p.faces.map(f=>f.v))
 assert(frames.length,id+' needs an attached real arch frame')
 for(const point of faces.flat()){
  const offset=point.clone().sub(centre),horizontal=offset.dot(lateral),height=offset.y
  const crown=straight+Math.sqrt(Math.max(0,radius*radius-horizontal*horizontal))
  if(!(Math.abs(Math.abs(horizontal)-radius)<.002||height<.002||Math.abs(height-crown)<.003))continue
  let gap=Infinity;for(const v of frames)gap=Math.min(gap,new THREE.Triangle(...v).closestPointToPoint(point,new THREE.Vector3()).distanceTo(point))
  assert(gap<.075,id+' real closed glazing loses arch-frame contact')
 }
 // Every real reveal vertex must attach at a retained skin; projected rings
 // alone cannot bridge the measured native/lining separation.
 for(const point of reveal.faces.flatMap(f=>f.v)){
  let gap=Infinity;for(const f of skin){const triangle=new THREE.Triangle(...f.v);if(triangle.getArea()===0)continue;const distance=triangle.closestPointToPoint(point,new THREE.Vector3()).distanceTo(point);if(Number.isFinite(distance))gap=Math.min(gap,distance)}
  assert(gap<.035,id+' closed joining reveal floats off its actual source/lining support')
 }
 for(const horizontal of [-.35,0,.35])for(const height of [.30,.90,straight+radius*.45]){
  const origin=centre.clone().addScaledVector(lateral,horizontal*radius).add(new THREE.Vector3(0,height,0)).addScaledVector(normal,3)
  const direction=normal.clone().negate(),pane=aftSurfaceHits(faces,origin,direction),owner=aquariumOwner(skin,origin,direction)
  assert(pane.length>=2,id+' needs two actual closed glazing surfaces')
  assert(pane[1].distanceTo(pane[0])>.018&&pane[1].distanceTo(pane[0])<.045,id+' retains real 28 mm normal-human glazing thickness')
  assert(!owner||pane[0].distanceTo(origin)<owner.distance-.01,id+' actual outer hull/lining still occludes its opening')
 }
 for(const sign of [-1,1]){
  const origin=centre.clone().addScaledVector(lateral,sign*radius*.85).add(new THREE.Vector3(0,straight+radius*.80,0)).addScaledVector(normal,3)
  const direction=normal.clone().negate(),owner=aquariumOwner(skin,origin,direction)
  assert(owner&&owner.distance<4,id+' must retain actual opaque upper corners around its true arch')
  assert.equal(aftSurfaceHits(faces,origin,direction).length,0,id+' glazing must not fill a square opening above the crown')
 }
 // Outside the crown, A's actual side tier is cream. The same source timber
 // below the tier retains its original material; no new overlay is accepted.
 if(spec.outerSkin==='Line002'){
  const origin=centre.clone().addScaledVector(lateral,radius*1.35).add(new THREE.Vector3(0,.90,0)).addScaledVector(normal,3)
  assert.equal(aquariumOwner(outer.faces,origin,normal.clone().negate())?.material,'Sunny_cream',id+' lower source side tier needs the A/C cream base colour')
  const below=origin.clone();below.y=metadata.interiors.levels.F1-.25
  assert.equal(aquariumOwner(outer.faces,below,normal.clone().negate())?.material,'Sunny_timber',id+' timber below the bounded sash tier must stay intact')
 }
}
console.log('PASS six lower Aquarium side/rear true arches have unoccluded closed 28 mm glass, physically joined deep reveals, actual crown corners and bounded cream source paint')

// Ground detection supports the full footprint on its highest overlapping
// tread. Check real body positions, including the leading head during descent;
// tread-centre rays alone cannot establish this clearance.
const gardenClearanceMeshes=loadColliders('public/models/sunny.glb')
const gardenClearanceWalls=aftDoorArchCollision.filter(b=>b.name.startsWith('COLL_Rail_对象003_'))
let gardenBodySamples=0
for(const side of ['port','starboard']){
 const treads=gardenClearanceMeshes.filter(b=>b.name.startsWith('Sunny_GardenStair_tread')&&(side==='port'?!b.name.includes('.'):b.name.includes('.')))
 assert(treads.length>=30,side+' actual garden support treads required')
 const first=Math.min(...treads.map(b=>b.min.x)),last=Math.max(...treads.map(b=>b.max.x)),centre=(treads[0].min.z+treads[0].max.z)/2
 for(let x=first;x<=last;x+=.04)for(const lateral of [-.20,0,.20]){
  const z=centre+lateral,support=Math.max(...treads.filter(b=>b.min.x<x+.34&&b.max.x>x-.34).map(b=>b.max.y))
  assert(Number.isFinite(support),side+' sampled stair footprint loses actual floor support')
  const hit=gardenClearanceWalls.find(b=>b.max.x>x-.34&&b.min.x<x+.34&&b.max.z>z-.34&&b.min.z<z+.34&&b.max.y>support+.02&&b.min.y<support+1.75)
  assert(!hit,side+' actual body above its highest supporting tread overlaps native wall: '+JSON.stringify({feet:[x,support,z],wall:hit?.name}))
  gardenBodySamples++
 }
}
console.log('PASS '+gardenBodySamples+' actual garden body positions above highest footprint-supported treads clear the native wall on both complete flights')

// A curved wall cannot become a 40 cm terrain floor across the stair opening.
// Actual supporting treads already have exact thin floor proxies.
const gardenTerrainFloors=aftDoorArchCollision.filter(b=>/^COLL_Floor_/.test(b.name))
let gardenTerrainSamples=0
for(const side of ['port','starboard']){
 const treads=gardenClearanceMeshes.filter(b=>b.name.startsWith('Sunny_GardenStair_tread')&&(side==='port'?!b.name.includes('.'):b.name.includes('.')))
 const first=Math.min(...treads.map(b=>b.min.x)),last=Math.max(...treads.map(b=>b.max.x)),centre=(treads[0].min.z+treads[0].max.z)/2
 for(let x=first;x<=last;x+=.04)for(const lateral of [-.20,0,.20]){
  const z=centre+lateral,support=Math.max(...treads.filter(b=>b.min.x<x+.34&&b.max.x>x-.34).map(b=>b.max.y))
  const hit=gardenTerrainFloors.find(b=>b.max.x>x-.34&&b.min.x<x+.34&&b.max.z>z-.34&&b.min.z<z+.34&&b.max.y>support+.02&&b.min.y<support+1.75)
  assert(!hit,side+' unsupported coarse terrain floor fills real garden body corridor: '+JSON.stringify({feet:[x,support,z],floor:hit?.name}))
  gardenTerrainSamples++
 }
}
console.log('PASS '+gardenTerrainSamples+' actual garden body positions remain free of unsupported coarse terrain floors')

// Match reference facade paint on the real outside face; preserve interior wood.
for(const id of ['aqua_fwd','DiningEntrance','KitchenEntrance']){
 const name=`Sunny_RoomPartition_${id}_lintel0`,faces=exteriorLintelFaces.get(name);
 assert.ok(faces?.length,`${name}: physical lintel is present`);
 const outside=faces.filter(f=>f.normal.x<-.99),inside=faces.filter(f=>f.normal.x>.99);
 assert.ok(outside.length&&outside.every(f=>f.material==='Sunny_cream'),`${name}: bow-facing cream facade`);
 assert.ok(inside.length&&inside.every(f=>f.material==='Sunny_darkwood'),`${name}: retained interior timber`);
 assert.ok(faces.filter(f=>f.normal.x>=-.99).every(f=>f.material==='Sunny_darkwood'),`${name}: paint is bounded to the outside face`);
}
console.log('PASS all three aft entrance lintels have reference cream outside faces and retained timber inside');

// Independent actual exported room/stair enclosure check. Preserve every
// preceding geometry/body/headroom/terrain guard and all original tolerances.
const gardenSideClosures=metadata.interiors.aftEnclosures[0].stairSideClosures
assert.equal(gardenSideClosures?.length,2,'both room-facing garden-stair enclosures must publish')
let gardenOpaqueSamples=0
for(const side of ['port','starboard']){
 const spec=gardenSideClosures.find(s=>s.side===side)
 const treads=gardenClearanceMeshes.filter(b=>b.name.startsWith('Sunny_GardenStair_tread')&&(side==='port'?!b.name.includes('.'):b.name.includes('.')))
 const boundary=side==='port'?Math.max(...treads.map(b=>-b.min.z))+.38:Math.min(...treads.map(b=>-b.max.z))-.38
 assert(spec&&Math.abs(spec.bodyBoundary-boundary)<.002,side+' enclosure must fit the actual unchanged tread body corridor')
 assert.equal(spec.treadCount,treads.length,side+' enclosure must include its complete actual flight')
 const last=Math.max(...treads.map(b=>b.max.x))
 // Start inside the real room. The metadata front station is the source
 // outline; a ray there can begin embedded in the 18 cm closed front wall.
 const roomFront=fittingHits(aftSkin,new THREE.Vector3((aftEnvelope.frontStation+last)/2,aftFloor+1.7,-.585*2.2),new THREE.Vector3(-1,0,0))[0]
 assert(roomFront&&roomFront.x>aftEnvelope.frontStation&&roomFront.x<aftEnvelope.frontStation+1,side+' enclosure probes need the actual room-facing front wall')
 const first=Math.max(roomFront.x+.1,Math.min(...treads.map(b=>b.min.x)))
 for(let x=first;x<=last;x+=.2){
  const support=Math.max(...treads.filter(b=>b.min.x<x+.34&&b.max.x>x-.34).map(b=>b.max.y))
  assert(Number.isFinite(support),side+' enclosure ray must stand above a real supporting tread')
  for(const above of [.25,.8,1.4]){
   const height=Math.min(support+above,aftEnvelope.top-.35)
   const origin=new THREE.Vector3(x,height,-.585*2.2),direction=new THREE.Vector3(0,0,side==='port'?1:-1)
   const hit=fittingHits(aftSkin,origin,direction)[0]
   assert(hit&&hit.distanceTo(origin)<16,side+' room-to-sky gap beside its actual stair at '+JSON.stringify({x,height}))
   const inward=side==='port'?-hit.z-boundary:boundary+hit.z
   assert(inward>=.1799,side+' actual opaque enclosure must retain at least 18 cm of room-side construction outside the standing corridor')
   gardenOpaqueSamples++
  }
 }
}
console.log('PASS '+gardenOpaqueSamples+' actual room-to-stair rays terminate on the opaque 18 cm enclosures; native outside wall, windows and all prior real body/headroom guards retained')
