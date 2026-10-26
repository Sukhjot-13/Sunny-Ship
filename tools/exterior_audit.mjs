/** Export measured placements and matched appearance views; never walking proof. */
import fs from 'node:fs'
import * as THREE from 'three'
import puppeteer from 'puppeteer'
import {readGLB,loadColliders} from '../tests/glb.mjs'

const phase=process.argv[2]??'after',out='docs/review'
fs.mkdirSync(out,{recursive:true})
const meshes=loadColliders('public/models/sunny.glb')
const floors=loadColliders('public/models/sunny-collision.glb').filter(m=>m.name.startsWith('COLL_Floor'))
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const gltf=readGLB('public/models/sunny.glb').json
const extras=new Map(gltf.nodes.map(n=>[n.name,n.extras??{}]))
const cy=.585*meta.exterior.experienceScale
const categories=[
 ['figurehead','H/C/A',/^(Sphere00[125]|Rectangle00[2-8]|Circle00|Sunny_Lion|Sunny_Gaon)/],
 ['anchors','H/D/B1',/^(Sphere00[69]|Sunny_Anchor|NGon0(?:07|13|14|18|19|20))/],
 ['masts / yards / platforms','A/C/O/N',/^Cylinder00[3-8]|^Cylinder01[0-45]|^Cylinder056|InteriorMainMast/],
 ['sails / flags / rigging','A/C/O/N',/^Plane00|Sunny_(Sail|Rigging|Lookout)/],
 ['stairs / rails / landings','F3/F2/F1/H/N',/Stair|Rail|rail|Landing|Sidewalk|Balcony|Approach|ForedeckSupport/],
 ['shade trees / swing / slide','F3/N/A',/ShadeTree|Swing|Slide/],
 ['mikan cluster','F3/N/P/C',/Mikan/],
 ['gardens / branch office / chimney','N/P/F3/F2',/RobinGarden|PopGreens|Usopp_office|Garden_workbench|Usopp_bench|KitchenChimney/],
 ['helm / instruments / dock','H/D/B1',/Helm|LogPose|SoldierDock_|Dock1_|DockNumber|Paddle/],
 ['stern / windows / ports','A/C/O/L/N/F1/F2',/CoupDeBurst|Lantern|Rudder|Window|Library_lining|Bath_lining|Bath_roof|Cylinder0(?:01|02|2[0-7])|NGon00[1345]/],
 ['exposed openings','F3/F2/F1/N',/Door|Hatch|door|hatch/],
]
/** Identify evidence families without interpreting generic source names as proof. */
function category(name){return categories.find(([, ,pattern])=>pattern.test(name))??['other / unresolved','unresolved',null]}
/** Serialize exact exported bounds, station and support; include every mesh. */
function inventory(){
 const rows=meshes.map(m=>{
  const centre=m.min.clone().add(m.max).multiplyScalar(.5),size=m.max.clone().sub(m.min),[family,ref]=category(m.name)
  const support=floors.filter(f=>centre.x>=f.min.x&&centre.x<=f.max.x&&centre.z>=f.min.z&&centre.z<=f.max.z&&Math.abs(f.max.y-m.min.y)<.12)
  return {mesh:m.name,family,reference:ref,centre:centre.toArray(),bounds:[m.min.toArray(),m.max.toArray()],size:size.toArray(),
   station:[(centre.x-meta.hull.min[0])/meta.hull.size[0],(-centre.z-cy)/meta.hull.size[1],(centre.y-meta.waterLevel)/meta.hull.size[2]],
   side:Math.abs(-centre.z-cy)<.2?'centreline':(-centre.z-cy)>0?'starboard (+Y)':'port (-Y)',
   count:1,support:support.map(f=>f.name),tags:extras.get(m.name)??{},intended:'See exterior-feature-ledger.md; unresolved is not an accuracy pass'}
 })
 fs.writeFileSync(`${out}/${phase}-exterior-inventory.json`,JSON.stringify({phase,axis:'Three [X,Z,-Y]; bow -X; port Blender -Y; starboard +Y',meta:{hull:meta.hull,water:meta.waterLevel,levels:meta.interiors.levels},rows},null,2))
 const quote=s=>'"'+String(s).replaceAll('"','""')+'"'
 fs.writeFileSync(`${out}/${phase}-exterior-inventory.csv`,['mesh,family,reference,current_u,current_v,current_h,side,count,support,intended',...rows.map(r=>[r.mesh,r.family,r.reference,...r.station.map(n=>n.toFixed(5)),r.side,r.count,r.support.join(';'),r.intended].map(quote).join(','))].join('\n'))
 console.log(`Inventory: ${rows.length} exported meshes; ${rows.filter(r=>r.family!=='other / unresolved').length} explicitly grouped`)
}
inventory()

const browser=process.env.SUNNY_CDP?await puppeteer.connect({browserWSEndpoint:process.env.SUNNY_CDP}):await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.goto((process.env.SUNNY_BASE_URL || 'http://localhost:5173'),{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000});await page.mouse.click(720,450)
 await page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');window.__audit=_roots.get(document.querySelector('canvas')).store.getState();window.__audit.controls.enabled=false})
 const views=[
  ['top',[0,75,-cy],[0,-29,-cy],true],
  ['port',[0,-4,132],[0,-4,-cy],false],['starboard',[0,-4,-134],[0,-4,-cy],false],
  ['front',[-65,-31,-cy],[-38,-32,-cy],false],['stern',[80,-28,-cy],[25,-30,-cy],false],
  ['bow-quarter',[-88,-6,82],[0,-16,-cy],false],['stern-quarter',[95,-3,-83],[0,-16,-cy],false],
  ['lookout',[-34,34,22],[-12,31,-cy],false],['garden',[30,-19,30],[20,-28,-cy],false],
 ]
 for(const [name,p,t,top] of views){
  await page.evaluate(({p,t,top})=>{
   const s=window.__audit;s.controls.enabled=false;s.camera.up.set(...(top?[-1,0,0]:[0,1,0]));s.camera.position.set(...p);s.camera.lookAt(...t);s.camera.updateMatrixWorld()
   window.__ship.traverse(o=>{if(!o.isMesh)return;const tags=o.userData.sunny_part?o.userData:o.parent?.userData??{};if(['sail','flag','rigging'].includes(tags.sunny_part))o.visible=!top})
  },{p,t,top})
  await new Promise(r=>setTimeout(r,180));await page.screenshot({path:`${out}/${phase}-${name}.png`})
 }
 const context=await page.evaluate(()=>{const s=window.__audit,c=s.gl.getContext(),ext=c.getExtension('WEBGL_debug_renderer_info');return {viewport:[innerWidth,innerHeight],renderer:ext?c.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',drawCalls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles}})
 fs.writeFileSync(`${out}/${phase}-appearance-context.json`,JSON.stringify({context,errors,notice:'Inspect appearance only; top view hides sails/flags/ratlines for the plan comparison'},null,2))
 if(errors.length)throw new Error(errors.join('\n'))
 console.log('Matched appearance captures:',JSON.stringify(context));await page.close()
}finally{if(process.env.SUNNY_CDP)browser.disconnect();else await browser.close()}
