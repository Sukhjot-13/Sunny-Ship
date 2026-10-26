/** Additional real walking: full stern balcony, exposed library threshold,
 * gallery-to-slide descent and both long side passages. Never teleports. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
import {loadColliders} from './glb.mjs'
import {walkJourney,walkFlight,stairFlights,driveTo} from './stairFlights.mjs'
import {EYE_HEIGHT_M} from '../src/config/shipConfig.js'
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),meshes=loadColliders('public/models/sunny.glb'),meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const collisionMeshes=loadColliders('public/models/sunny-collision.glb')
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 const errors=[],trace=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://localhost:5173',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny);await page.mouse.click(720,450)
 const initialRecovery=await page.evaluate(()=>window.__sunny.recoveries)
 const view=async target=>{
  await page.evaluate(({t,eye})=>{const p=window.__sunny.position,dx=t[0]-p[0],dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(t[1]-p[1]-eye,Math.hypot(dx,dz)))},{t:target,eye:EYE_HEIGHT_M});await sleep(200)
 }
 const step=async(label,p)=>{
  const moved=await driveTo(page,p,.20),state=await page.evaluate(()=>({p:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries,blocker:window.__sunny.blocker}))
  const ok=moved&&state.grounded&&state.recoveries===initialRecovery;trace.push({label,target:p,ok,...state})
  if(!ok){fs.writeFileSync('docs/review/exterior-additional-journeys.json',JSON.stringify({trace,errors,failed:true},null,2));await page.screenshot({path:'docs/review/stall-Exterior-'+label.replaceAll(' ','-')+'.png'});throw new Error(label+' stalled: '+JSON.stringify({target:p,...state}))}
 }
 // Sample the actual curved bed throughout the unchanged WASD descent. A
 // grounded endpoint alone cannot show whether the route crossed its surface.
 const slideDescent=async target=>{
  await page.evaluate(async()=>{
   const THREE=await import('/node_modules/three/build/three.module.js');let chute
   window.__ship.traverse(o=>{if(o.name==='Sunny_Slide_chute'||o.userData.name==='Sunny_Slide_chute')chute=o})
   if(!chute)throw new Error('missing runtime slide chute')
   const parent=window.__ship.parent,direction=new THREE.Vector3(0,-1,0).transformDirection(parent.matrixWorld),samples=[]
   const sample=()=>{
    const p=window.__sunny.position,heights=[]
    for(const [x,z] of [[0,0],[.34,0],[-.34,0],[0,.34],[0,-.34]]){
     const origin=parent.localToWorld(new THREE.Vector3(p[0]+x,p[1]+2,p[2]+z)),ray=new THREE.Raycaster(origin,direction)
     const hit=ray.intersectObject(chute,true)[0]
     if(hit)heights.push(parent.worldToLocal(hit.point.clone()).y)
    }
    const bed=heights.length?Math.max(...heights):null
    samples.push({t:performance.now(),p,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries,bed,footGap:bed===null?null:p[1]-bed})
   }
   sample();window.__slideAudit={samples,sample,timer:setInterval(sample,50)}
  })
  let samples,completed=false
  try{await step('slide continuous descent',target);completed=true}finally{
   samples=await page.evaluate(()=>{const audit=window.__slideAudit;clearInterval(audit.timer);audit.sample();delete window.__slideAudit;return audit.samples})
   trace.push({label:'slide whole-descent surface samples',samples})
   fs.writeFileSync('docs/review/exterior-additional-journeys.json',JSON.stringify({trace,errors,failed:!completed},null,2))
  }
  try{
   assert(samples.length>=20,'the full slide descent must have sustained surface samples')
   assert(samples.every(s=>s.recoveries===initialRecovery),'no recovery may occur between slide endpoints')
   assert(samples.every(s=>s.bed!==null&&Math.abs(s.footGap)<=.35),'the normal body must remain within the existing ground-contact margin of the actual curved slide: '+JSON.stringify(samples.filter(s=>s.bed===null||Math.abs(s.footGap)>.35)))
  }catch(error){
   fs.writeFileSync('docs/review/exterior-additional-journeys.json',JSON.stringify({trace,errors,failed:true},null,2));await page.screenshot({path:'docs/review/stall-Exterior-Slide-surface.png'});throw error
  }
 }
 const journey=await walkJourney(page,meshes,'garden','port',{returnToLawn:false});assert(journey.length>5&&journey.every(s=>s.ok),JSON.stringify(journey));trace.push(...journey)
 const garden=meta.interiors.levels.F3G,balcony=meshes.find(o=>o.name==='Sunny_SternBalcony_floor'),centre=balcony.min.clone().add(balcony.max).multiplyScalar(.5),size=balcony.max.clone().sub(balcony.min)
 // The former X=23.5 return grazed the padded .014 post with a normal body.
 // Use the actual clear corridor between its two adjacent post colliders,
 // and align before turning back along it from the Library threshold.
 const passagePosts=['.014','.015'].map(suffix=>collisionMeshes.filter(o=>o.name.startsWith('COLL_Rail_Sunny_SternBalcony_post'+suffix+'_')))
 assert(passagePosts.every(parts=>parts.length),'both actual fore-side balcony posts are required')
 const passageX=(Math.max(...passagePosts[0].map(o=>o.max.x))+Math.min(...passagePosts[1].map(o=>o.min.x)))/2
 const gardenFloor=meshes.find(o=>o.name==='Sunny_GardenDeck')
 assert(passageX>gardenFloor.min.x&&passageX<gardenFloor.max.x,'clear return corridor must lie on the retained garden floor')
 await step('garden clear aft passage',[passageX,garden,9.0])
 // Visit the real container before continuing the same complete return.
 // Keep the garden floor, normal body and controller collision unchanged.
 const pot=meshes.find(o=>o.name==='Sunny_Mikan0_pot'),soil=meshes.find(o=>o.name==='Sunny_Mikan0_soil'),potBody=collisionMeshes.find(o=>o.name==='COLL_Solid_Sunny_Mikan0_pot')
 assert(pot&&soil&&potBody,'actual exported clay, exposed soil and physical pot body are required')
 const potCentre=pot.min.clone().add(pot.max).multiplyScalar(.5),approachX=pot.min.x-.64,clearX=pot.min.x-1.14
 await step('mikan open garden crossing',[clearX,garden,9.0]);await step('mikan clear approach',[clearX,garden,potCentre.z]);await step('mikan side approach',[approachX,garden,potCentre.z])
 try{
  const before=await page.evaluate(()=>window.__sunny.position)
  await page.evaluate(t=>{const p=window.__sunny.position;window.__sunny.look(Math.atan2(-(t[0]-p[0]),-(t[2]-p[2])),-.06)},[potCentre.x,garden,potCentre.z])
  await page.keyboard.down('w');let contact
  try{await sleep(650);contact=await page.evaluate(()=>({p:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries,blocker:window.__sunny.blocker}))}finally{await page.keyboard.up('w')}
  await sleep(300)
  const stopped=await page.evaluate(()=>({p:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries}))
  trace.push({label:'mikan physical side contact',target:[potCentre.x,garden,potCentre.z],before,contact,...stopped})
  assert(stopped.grounded&&stopped.recoveries===initialRecovery&&Math.abs(stopped.p[1]-garden)<.02,'pot contact must stay on the unchanged garden support without recovery')
  assert(stopped.p[0]-before[0]>.05&&stopped.p[0]+.34<=potBody.min.x+.02&&Math.abs(stopped.p[0]+.34-potBody.min.x)<.06,'a normal body must reach and stop against the real pot boundary')
  assert(contact.blocker?.includes('Sunny_Mikan0_pot'),'the exported pot body must cause the walking stop: '+JSON.stringify(contact))
  const target=[potCentre.x-.25,soil.max.y,potCentre.z+.10]
  await page.evaluate(({t,eye})=>{const p=window.__sunny.position,dx=t[0]-p[0],dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(t[1]-p[1]-eye,Math.hypot(dx,dz)))},{t:target,eye:EYE_HEIGHT_M});await sleep(400)
  const visible=await page.evaluate(async({t,name})=>{
   const THREE=await import('/node_modules/three/build/three.module.js');let soil=null
   window.__ship.traverse(o=>{if(o.userData.name===name||o.name===name)soil=o})
   const origin=window.__sunnyCamera.clone(),point=window.__ship.parent.localToWorld(new THREE.Vector3(...t)),ray=new THREE.Raycaster(origin,point.clone().sub(origin).normalize())
   const first=ray.intersectObject(window.__ship,true).find(h=>h.object.visible)
   return {target:name,runtime:soil?.name,first:first?.object.name,distance:first?.distance,firstIsSoil:!!soil&&first?.object===soil}
  },{t:target,name:soil.name})
  trace.push({label:'mikan normal-eye exposed soil',target,visible,position:stopped.p})
  await page.screenshot({path:'docs/review/walk-Mikan-open-soil.png'})
  assert(visible.firstIsSoil,'the normal-eye camera must actually see soil through the open clay mouth: '+JSON.stringify(visible))
 }catch(error){
  fs.writeFileSync('docs/review/exterior-additional-journeys.json',JSON.stringify({trace,errors,failed:true},null,2));await page.screenshot({path:'docs/review/stall-Exterior-Mikan-container.png'});throw error
 }
 await step('mikan return side approach',[approachX,garden,potCentre.z]);await step('mikan return clear approach',[clearX,garden,potCentre.z]);await step('mikan return open garden',[clearX,garden,9.0]);await step('mikan return passage',[passageX,garden,9.0]);await step('garden aft entry',[passageX,garden,-1.287])
 const front=[centre.x-size.x*.45,centre.y,centre.z]
 await step('balcony fore entrance',front)
 for(let i=1;i<=24;i++){
  const t=Math.PI+i*Math.PI*2/24
  await step('balcony sector '+i,[centre.x+size.x*.45*Math.cos(t),centre.y,centre.z+size.z*.45*Math.sin(t)])
  if(i%6===0)await page.screenshot({path:'docs/review/walk-Stern-balcony-'+i/6+'.png'})
 }
 const door=meta.interiors.doors.find(d=>d.id==='LibraryDoor'),p=[door.pos[0],door.pos[2],-door.pos[1]]
 await step('library outside threshold',[p[0]-.9,p[1],p[2]])
 await page.evaluate(t=>{const p=window.__sunny.position;window.__sunny.look(Math.atan2(-(t[0]-p[0]),-(t[2]-p[2])),-.15)},p);await sleep(200);await page.keyboard.press('e');await sleep(900)
 await step('library across threshold',[p[0]+.6,p[1],p[2]]);await step('library return threshold',[p[0]-.9,p[1],p[2]])
 await view([p[0],p[1]+door.height*.55,p[2]])
 await page.screenshot({path:'docs/review/walk-Library-exterior-threshold.png'})
 await step('return garden passage alignment',[passageX,centre.y,centre.z])
 await step('return garden clear passage',[passageX,garden,9.0])
 const flights=stairFlights(meshes),upper=flights.find(f=>f.name==='garden port'),lower=flights.find(f=>f.name==='aft port'),end=upper.treads.at(-1)
 await step('return garden upper landing',end);assert((await walkFlight(page,upper,{teleport:false,descending:true})).climbed)
 const lowEnd=lower.treads.at(-1)
 await step('aft port gallery transfer',[lowEnd[0]+.55,lowEnd[1],lowEnd[2]])
 // Traverse the full exposed gallery to the opposite slide entry.
 await step('gallery front crosswalk',[11.1,lowEnd[1],lowEnd[2]])
 const slide=meshes.find(o=>o.name==='Sunny_Slide_chute'),sz=(slide.min.z+slide.max.z)/2
 await step('gallery opposite end',[11.1,lowEnd[1],sz]);await step('slide upper entry',[slide.max.x-.10,lowEnd[1],sz])
 await view([slide.max.x-1.4,slide.max.y-.45,sz])
 await page.screenshot({path:'docs/review/walk-Slide-entry.png'})
 await slideDescent([slide.min.x+.25,meta.interiors.levels.F1,sz]);await view([slide.max.x-1.4,slide.max.y-.45,sz]);await page.screenshot({path:'docs/review/walk-Slide-return-lawn.png'})
 await step('lawn central return',[-4.29,meta.interiors.levels.F1,-.99])
 for(const [name,z] of [['port',12.4],['starboard',-14.7]]){
  const entryX=name==='starboard'?-1.2:-4.29
  await step(name+' around dock stair opening',[entryX,meta.interiors.levels.F1,-.99])
  await step(name+' clear dock stair opening',[entryX,meta.interiors.levels.F1,z])
  await step(name+' side passage entry',[-4.29,meta.interiors.levels.F1,z])
  await step(name+' side passage fore end',[-14.3,meta.interiors.levels.F1,z])
  await view([9.6,meta.interiors.levels.F1+EYE_HEIGHT_M,z])
  await page.screenshot({path:'docs/review/walk-Side-passage-'+name+'.png'})
  await step(name+' side passage aft end',[9.6,meta.interiors.levels.F1,z])
  await step(name+' side passage return',[entryX,meta.interiors.levels.F1,z]);
  await step(name+' inward return around dock opening',[entryX,meta.interiors.levels.F1,-.99]);
  await step(name+' central return',[-4.29,meta.interiors.levels.F1,-.99])
 }
 assert.equal(await page.evaluate(()=>window.__sunny.recoveries),initialRecovery);assert.deepEqual(errors,[])
 fs.writeFileSync('docs/review/exterior-additional-journeys.json',JSON.stringify({trace,errors},null,2))
 console.log('PASS additional exterior journeys: physical mikan contact/exposed soil/return, full 360° stern balcony, library threshold/return, gallery crosswalk/slide descent, both full side passages/returns; no teleport, flight or recovery')
}finally{await browser.close()}
