/** Actual source-proportioned fore rim and supported stair balustrades. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import * as T from 'three'
import {readGLB,readAccessor,nodeMatrix} from './glb.mjs'
import {decodeCollisionBoxes} from '../src/systems/collisionData.js'
const dir=process.env.REFERENCE_MODELS??'public/models',g=readGLB(path.join(dir,'sunny.glb'))
const meta=JSON.parse(fs.readFileSync(path.join(dir,'ship-metadata.json'))),parts=new Map(),floors=[],treads=[]
const baseline=JSON.parse(fs.readFileSync('tests/fixtures/fore-supported-surfaces.json')),checked=new Set()
function visit(i,parent){
 const node=g.json.nodes[i],matrix=parent.clone().multiply(nodeMatrix(node))
 if(node.mesh!==undefined&&(node.name==='Line006'||['Sunny_ForedeckSupport','Sunny_ForeUpperLanding'].includes(node.name)||node.extras?.sunny_stair||/^Sunny_Fore(?:Star|Port|Upper)Rail_guard[01]$/.test(node.name))){
  const points=[],meshes=[]
  const hash=baseline.fingerprints[node.name]?crypto.createHash('sha256'):null
  hash?.update(JSON.stringify(matrix.elements))
  for(const primitive of g.json.meshes[node.mesh].primitives){
   if(hash){
    hash.update(JSON.stringify(g.json.materials[primitive.material]))
    for(const key of Object.keys(primitive.attributes).sort()){
     const values=readAccessor(g,primitive.attributes[key]).data;hash.update(key);hash.update(Buffer.from(values.buffer,values.byteOffset,values.byteLength))
    }
    const values=readAccessor(g,primitive.indices).data;hash.update(Buffer.from(values.buffer,values.byteOffset,values.byteLength))
   }
   const data=readAccessor(g,primitive.attributes.POSITION).data,geo=new T.BufferGeometry()
   geo.setAttribute('position',new T.BufferAttribute(data,3));geo.setIndex(Array.from(readAccessor(g,primitive.indices).data))
   const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.matrixAutoUpdate=false;mesh.matrixWorld.copy(matrix);meshes.push(mesh)
   for(let j=0;j<data.length;j+=3)points.push(new T.Vector3(...data.slice(j,j+3)).applyMatrix4(matrix))
  }
  parts.set(node.name,{points,meshes,tags:node.extras??{}})
  if(hash){assert.equal(hash.digest('hex'),baseline.fingerprints[node.name],node.name+' floor/tread geometry, UVs, normals, materials and pose must stay exactly unchanged');checked.add(node.name)}
  if(['Sunny_ForedeckSupport','Sunny_ForeUpperLanding'].includes(node.name)){
   assert(node.extras?.sunny_walkable,node.name+' must be an actual authored structural floor')
   floors.push(...meshes)
  }
  if(node.extras?.sunny_stair)treads.push(...meshes)
 }
 for(const child of node.children??[])visit(child,matrix)
}
for(const root of g.json.scenes[g.json.scene??0].nodes)visit(root,new T.Matrix4())
assert.equal(checked.size,Object.keys(baseline.fingerprints).length,'every frozen actual fore supporting surface survives')
const record=meta.interiors.foreFacade.upperGuard,rim=parts.get('Line006')
assert(record&&rim.tags.sunny_fore_top_guard,'actual rebuilt upper fore guard is required')
const deck=new T.Box3().setFromPoints(parts.get('Sunny_ForedeckSupport').points),floor=deck.max.y
const bounds=new T.Box3().setFromPoints(rim.points),middleHeight=meta.interiors.foreFacade.galleryGuards[0].height
assert(Math.abs(bounds.max.y-floor-middleHeight)<.002,'upper/middle guards share physical source height; perspective explains apparent source difference')
assert(Math.abs(deck.max.y-deck.min.y-.18)<.002,'actual helm deck retains its opaque structural thickness')
const guards=[...parts].filter(([name])=>/^Sunny_Fore(?:Star|Port|Upper)Rail_guard[01]$/.test(name))
assert.equal(guards.length,6,'all three fore flights retain two physical side balustrades')
for(const [name,part] of [['Line006',rim],...guards]){
 assert.equal(part.tags.sunny_uv_kind,'cylinder',name+' keeps component-aligned grain')
 const posts=part.tags.sunny_guard_posts
 assert(posts?.length>3,name+' has actual dense post stations')
 if(name==='Line006')assert(posts.length>50,'sparse eighteen-post native rim is replaced by a source-like dense rhythm')
 const positions=[...new Map(part.points.map(p=>[p.toArray().map(v=>v.toFixed(5)).join(','),p])).values()]
 for(const source of posts){
  const p=new T.Vector3(source[0],source[2],-source[1]),height=part.tags.sunny_guard_height
  const ends=[p.y+height*.25-.008,p.y+height*.82+.008]
  for(const y of ends)assert(positions.filter(v=>Math.abs(v.y-y)<.0001&&Math.hypot(v.x-p.x,v.z-p.z)<height*.11).length>=12,name+' recorded post needs both real embedded end rings')
  const hit=new T.Raycaster(p.clone().add(new T.Vector3(0,.10,0)),new T.Vector3(0,-1,0),0,.2).intersectObjects(name==='Line006'?floors:treads)[0]
  assert(hit&&Math.abs(hit.point.y-p.y)<.003,name+' post needs its actual supporting deck/tread: '+JSON.stringify({feet:p.toArray(),hit:hit?.point.toArray()}))
 }
}
const [low,high]=record.stairSpan,centre=(low+high)/2
assert(record.gap[0]<low&&record.gap[1]>high,'full real upper stair width stays open')
const rear=record.path[0],last=record.path.at(-1),x=rear[0]+(last[0]-rear[0])*(centre-rear[1])/(last[1]-rear[1])
const boxes=decodeCollisionBoxes(fs.readFileSync(path.join(dir,'sunny-collision.glb'))).filter(b=>b.name.startsWith('COLL_Rail_Line006_'))
assert(boxes.length,'reconstructed rim must remain physically solid')
for(let distance=-.6;distance<=.601;distance+=.1){
 const p=new T.Vector3(x+distance,floor,-centre),body=new T.Box3(new T.Vector3(p.x-.34,p.y+.02,p.z-.34),new T.Vector3(p.x+.34,p.y+1.75,p.z+.34))
 assert(!boxes.some(b=>body.intersectsBox(b.box)),'normal body must cross the real upper stair opening')
}
console.log('PASS actual dense source-height fore rim/six stair guards, true supported post rings/grain, unchanged deck depth and full-body real stair gap')
