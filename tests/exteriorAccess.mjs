/** Actual outdoor door thresholds and stair-hatch descents/returns from spawn. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
import {roomRoutes} from './roomRoutes.mjs'
import {loadColliders} from './glb.mjs'
import {driveTo,stairFlights,walkFlight} from './stairFlights.mjs'
import {EYE_HEIGHT_M} from '../src/config/shipConfig.js'
import {normalizeClimbs,pointAt} from '../src/systems/climbing.js'
import {ladderJourney} from './ladderJourney.mjs'

const plan=roomRoutes(),meshes=loadColliders('public/models/sunny.glb')
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const trace=[],errors=[],sleep=ms=>new Promise(r=>setTimeout(r,ms))
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://localhost:5173',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny&&window.__sunnyDoors);await page.mouse.click(720,450)
 const read=()=>page.evaluate(()=>{
  return {p:window.__sunny.position,g:window.__sunny.grounded,r:window.__sunny.recoveries,
   near:window.__sunnyDoors.near,doors:window.__sunnyDoors.state,blocker:window.__sunny.blocker}
 })
 const toggle=async(id,open)=>{
  assert.equal((await read()).near?.id,id,'actual hatch must be in reach before E')
  await page.keyboard.press('e')
  await page.waitForFunction(({id,open})=>open?window.__sunnyDoors.state[id].openness>.95:window.__sunnyDoors.state[id].openness<.05,{timeout:5000},{id,open})
  trace.push({label:id+(open?' opened by E':' closed by E'),...await read()})
 }
 /** Follow a body-checked plan with actual W; E opens only a hatch in reach. */
 const walk=async(label,path,ignoreId=null)=>{
  assert(path.length>1,label+' has no connected physical route')
  for(const target of path.slice(1)){
   const s=await read()
   if(s.near?.kind==='hatch'&&s.near.id!==ignoreId&&!s.doors[s.near.id].latched)await toggle(s.near.id,true)
   assert(await driveTo(page,target,.14),label+' stalled at '+JSON.stringify({target,...await read()}))
   const next=await read();assert(next.r===0,label+' used recovery');trace.push({label,target,...next})
  }
  const end=await read();assert(end.g&&end.r===0,label+' needs real footing')
  console.log('PASS',label,end.p)
  return path
 }
 const to=async(label,target,ignoreId=null)=>walk(label,plan.pathBetween((await read()).p,target),ignoreId)
 /** Aim evidence at the fitting from the unchanged normal human eye position. */
 const view=async(target)=>{
  await page.evaluate(({t,eye})=>{const p=window.__sunny.position,dx=t[0]-p[0],dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(t[1]-p[1]-eye,Math.hypot(dx,dz)))},{t:target,eye:EYE_HEIGHT_M})
  await sleep(120)
 }
 /** Reach roof/gallery hatches through the actual outside tread flights. */
 const flight=async(name,descending=false)=>{
  const f=stairFlights(meshes).find(f=>f.name===name),first=f.treads[0],last=f.treads.at(-1),dir=Math.sign(last[0]-first[0])
  const entrance=descending?[last[0]+dir*.55,last[1],last[2]]:[first[0]-dir*.65,first[1]-.19,first[2]]
  await to(name+' '+(descending?'upper':'lower')+' exterior entrance',entrance)
  const result=await walkFlight(page,f,{teleport:false,descending})
  assert(result.climbed,name+' '+(descending?'descent':'ascent')+' failed')
  assert((await read()).r===0,name+' used recovery');trace.push({label:name+(descending?' descent':' ascent'),...result})
 }
 for(const name of ['Fore Port Toilet','Fore Starboard Toilet']){
  const route=plan.routes.find(r=>r.name===name);assert(route?.ok,name+' is disconnected')
  const outward=await to(name+' outside → inside',route.target)
  assert(Math.abs((await read()).p[1]-meta.interiors.levels.F1)<.15,'toilet remains on lawn level')
  const door=meta.interiors.doors.find(d=>d.id===(name.includes('Port')?'ForeToiletDoor-1':'ForeToiletDoor1'))
  await page.evaluate(t=>{const p=window.__sunny.position;window.__sunny.look(Math.atan2(-(t[0]-p[0]),-(t[2]-p[2])),-.35)},[door.pos[0],door.pos[2],-door.pos[1]])
  await sleep(120)
  await page.screenshot({path:'docs/review/walk-'+name.replaceAll(' ','-')+'-threshold.png'})
  await walk(name+' inside → lawn',outward.toReversed())
  await to(name+' return to original spawn',plan.spawn)
 }
 // The sourced Aquarium connection is now a real small gallery ladder hatch.
 // Preserve its entire descent/ascent/closure and outside return coverage.
 const ladders=normalizeClimbs(meta.exterior.mechanisms.climbs).filter(p=>p.id!=='fore-lookout')
 assert.equal(ladders.length,2,'both small reference ladder connections are required')
 for(const ladder of ladders){
 const stern=ladder.id==='stern-library-ladder',id=ladder.hatch
 await flight('aft port')
 if(stern)await flight('garden port')
 const upper=pointAt(ladder,ladder.length),ladderApproach=await to(ladder.label+' upper landing',upper,id)
 await ladderJourney(page,ladder,{descending:true,trace})
 assert(Math.abs((await read()).p[1]-ladder.points[0][1])<.15,'ladder reaches its real lower walking floor')
 const lowerExcursion=await to(ladder.label+' lower floor excursion',[ladder.points[0][0]+.4,ladder.points[0][1],ladder.points[0][2]-1.0],id)
 await walk(ladder.label+' walking return to ladder',lowerExcursion.toReversed(),id)
 assert(await driveTo(page,pointAt(ladder,0),.10),'actual lower endpoint after floor excursion')
 await ladderJourney(page,ladder,{trace,closedStop:true})
 // At a ladder endpoint the first E correctly grabs it. A second E operates
 // its reachable hatch; complete the endpoint before walking away again.
 await page.keyboard.press('e');await sleep(100)
 assert.equal(await page.evaluate(()=>window.__sunny.climbing?.id),ladder.id,'actual upper endpoint reattachment')
 await toggle(id,false);await view([ladder.points[1][0],ladder.points[1][1],ladder.points[1][2]])
 await page.screenshot({path:'docs/review/walk-'+id+'-return.png'})
 await page.keyboard.down('w');await sleep(100);await page.keyboard.up('w')
 assert.equal(await page.evaluate(()=>window.__sunny.climbing),null,'standing at completed upper endpoint releases to walking')
 await walk(ladder.label+' return along upper walking approach',ladderApproach.toReversed(),id)
 if(stern)await flight('garden port',true)
 await flight('aft port',true);await to(ladder.label+' continuous return to spawn',plan.spawn,id)
 }
 for(const [id,stem] of [['SoldierDockHatch','SoldierDockStair_over']]){
  const h=meta.interiors.doors.find(d=>d.id===id),exit=meshes.find(m=>m.name==='Sunny_'+stem.replace(/_over$/,'')+'_exit')
  assert(h&&exit,id+' actual hatch and adjacent landing are required')
  if(id!=='SoldierDockHatch')await flight('aft port')
  if(id==='KitchenHatch')await flight('garden port')
  const landing=[(exit.min.x+exit.max.x)/2,exit.max.y,(exit.min.z+exit.max.z)/2]
  const approach=await to(id+' adjacent exit landing',landing,id);await sleep(180)
  if((await read()).doors[id].latched)await toggle(id,false)
  assert((await read()).doors[id].openness<.05,id+' stays shut until actual E')
  await toggle(id,true)
  const treads=meshes.filter(m=>m.name.startsWith('Sunny_'+stem+'_tread')).sort((a,b)=>b.max.y-a.max.y)
  const tread=treads[7];assert(tread,id+' needs upper-flight treads')
  const target=[(tread.min.x+tread.max.x)/2,tread.max.y,(tread.min.z+tread.max.z)/2]
  const down=await to(id+' through opening to real upper treads',target)
  assert((await read()).p[1]<h.pos[2]-.45,id+' descended below the lid')
  const next=treads[9]
  await view([(next.min.x+next.max.x)/2,next.max.y,(next.min.z+next.max.z)/2])
  await page.screenshot({path:'docs/review/walk-'+id+'-descent.png'})
  await walk(id+' upper treads → exit landing',down.toReversed())
  await toggle(id,false)
  await view([h.pos[0],h.pos[2],-h.pos[1]])
  await page.screenshot({path:'docs/review/walk-'+id+'-return.png'})
  if(id!=='SoldierDockHatch')await walk(id+' return to outside stair landing',approach.toReversed(),id)
  if(id==='KitchenHatch')await flight('garden port',true)
  if(id!=='SoldierDockHatch')await flight('aft port',true)
  await to(id+' continuous return to original spawn',plan.spawn,id)
 }
 assert.deepEqual(errors,[])
 console.log('PASS both outdoor toilet thresholds, both reference ladder full descents/ascents/closures and Soldier Dock stair-hatch descent/return; real W/E, no placement/flight/recovery')
}catch(e){
 const page=(await browser.pages()).at(-1)
 trace.push({failure:e.message});await page?.screenshot({path:'docs/review/stall-Exterior-access.png'});throw e
}finally{
 fs.writeFileSync('docs/review/exterior-access-journeys.json',JSON.stringify({trace,errors},null,2));await browser.close()
}
