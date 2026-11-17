/** Actual exported R09 guard rhythm, shaped solids and frozen native support. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import * as T from 'three'
import {readGLB,readAccessor,nodeMatrix} from './glb.mjs'
const dir=process.env.REFERENCE_MODELS??'public/models',g=readGLB(path.join(dir,'sunny.glb'))
const meta=JSON.parse(fs.readFileSync(path.join(dir,'ship-metadata.json')))
const baseline=JSON.parse(fs.readFileSync('tests/fixtures/fore-gallery-native-support.json')),parts=new Map()
function visit(i,parent){
 const node=g.json.nodes[i],matrix=parent.clone().multiply(nodeMatrix(node))
 if(['Box070','Box084'].includes(node.name)){
  const triangles=[],white=[]
  for(const primitive of g.json.meshes[node.mesh].primitives){
   const positions=readAccessor(g,primitive.attributes.POSITION).data,indices=readAccessor(g,primitive.indices).data
   for(let j=0;j<indices.length;j+=3){
    const triangle=Array.from(indices.slice(j,j+3),k=>new T.Vector3(...positions.slice(k*3,k*3+3)).applyMatrix4(matrix))
    triangles.push(triangle);if(g.json.materials[primitive.material]?.name==='Sunny_white')white.push(triangle)
   }
  }
  parts.set(node.name,{triangles,white,tags:node.extras})
 }
 for(const child of node.children??[])visit(child,matrix)
}
for(const root of g.json.scenes[g.json.scene??0].nodes)visit(root,new T.Matrix4())
assert.equal(meta.interiors.foreFacade.galleryGuards?.length,2)
for(const record of meta.interiors.foreFacade.galleryGuards){
 const {triangles,white,tags}=parts.get(record.node)
 assert(tags.sunny_fore_gallery_guard,'actual native object owns the new physical guard')
 assert.equal(tags.sunny_uv_kind,'cylinder','each actual baluster/rail island carries grain along its own principal axis')
 // At half-height only the shafts cross this horizontal plane. Merge actual
 // triangle-section intervals, independent of authored post-count tags.
 const height=meta.interiors.levels.F2F+record.height*.5,intervals=[]
 for(const triangle of triangles){
  const points=[]
  for(let i=0;i<3;i++){
   const a=triangle[i],b=triangle[(i+1)%3]
   if(Math.abs(a.y-b.y)>1e-7&&Math.min(a.y,b.y)<=height&&Math.max(a.y,b.y)>=height)points.push(a.clone().lerp(b,(height-a.y)/(b.y-a.y)))
  }
  if(points.length>=2)intervals.push([Math.min(...points.map(p=>p.z)),Math.max(...points.map(p=>p.z))])
 }
 intervals.sort((a,b)=>a[0]-b[0]);const sections=[]
 for(const interval of intervals){const last=sections.at(-1);if(last&&interval[0]<=last[1]+.0001)last[1]=Math.max(last[1],interval[1]);else sections.push([...interval])}
 assert.equal(sections.length,record.centres.length,'every recorded baluster is real exported shaft geometry')
 assert(sections.length>=(record.node==='Box070'?12:17),'sparse inherited posts are replaced by source-like dense rhythm')
 const centres=sections.map(([a,b])=>(a+b)/2),pitch=centres.slice(1).map((c,i)=>c-centres[i])
 const expected=record.centres.map(c=>-c).sort((a,b)=>a-b)
 assert(centres.every((c,i)=>Math.abs(c-expected[i])<.002),'reported stations match every actual shaft')
 assert(pitch.every(p=>p/record.height>.36&&p/record.height<.49),'measured17px pitch/40px full-guard height requires close rhythm')
 for(const [a,b] of sections)assert((b-a)/record.height>.10&&(b-a)/record.height<.20,'actual waisted shaft stays slender between broad rails')
 const bounds=new T.Box3().setFromPoints(triangles.flat())
 const fullHeight=bounds.max.y-meta.interiors.levels.F2F,storey=meta.interiors.levels.F2F-meta.interiors.levels.F1
 assert(fullHeight/storey>.32&&fullHeight/storey<.40,'full broad-rail height follows source lower-storey relationship')
 const lower=white.flat().filter(p=>p.y>meta.interiors.levels.F2F-.03&&p.y<height)
 const upper=white.flat().filter(p=>p.y>height)
 assert(lower.length&&upper.length,'both broad white rails are real geometry')
 assert((Math.max(...lower.map(p=>p.y))-meta.interiors.levels.F2F)/fullHeight>.22,'source bottom rail keeps its broad band')
 const topThickness=(bounds.max.y-Math.min(...upper.map(p=>p.y)))/fullHeight
 assert(topThickness>.14&&topThickness<.22,'source upper rail keeps its broad band')
 assert(Math.abs(bounds.min.z+record.span[1])<.001&&Math.abs(bounds.max.z+record.span[0])<.001,'actual ends preserve original stair gaps')
}
let hits=0
for(const sample of baseline.samples){
 const ray=new T.Ray(new T.Vector3(...sample.origin),new T.Vector3(-1,0,0));let hit=null
 for(const triangle of parts.get(sample.node).triangles){const p=ray.intersectTriangle(...triangle,false,new T.Vector3());if(p&&(hit===null||p.x>hit))hit=p.x}
 if(sample.hitX===null)assert.equal(hit,null,'native below-floor void remains open')
 else {hits++;assert(hit!==null&&Math.abs(hit-sample.hitX)<.001,'native below-floor fascia/support surface remains at its exact station')}
}
assert(hits>10,'preservation fixture includes real original support surfaces')
console.log('PASS actual broad gallery rails, full-height/storey/pitch source ratios, waisted shafts, native spans/gaps and all'+baseline.samples.length+' support rays')
