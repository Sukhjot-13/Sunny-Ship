/** Actual C02 full-size collision-enabled flight, using normal movement and real shutter controls. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import puppeteer from 'puppeteer'
import {roomRoutes} from '../../../tests/roomRoutes.mjs'
import {loadColliders} from '../../../tests/glb.mjs'
import {driveTo,walkJourney} from '../../../tests/stairFlights.mjs'
import {rotatePoint} from '../../../src/systems/navigation.js'
const openOnly=process.argv.includes('--open-only');const out='docs/review/post-comparison-c02',url='http://127.0.0.1:8180/',sleep=ms=>new Promise(r=>setTimeout(r,ms)),sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')),plan=roomRoutes(),route=plan.routes.find(r=>r.name==='Soldier Dock System'),floor=meta.interiors.levels.B1,cy=meta.interiors.dockCentre[1],cx=meta.interiors.dockCentre[0],trace=[],hashes={}
assert(route?.ok,'normal walking route to Dock required')
// Use the supported outer landing, whose walking path is independent of the
// selected carousel vehicle's rotating bounds. Actual bay access follows in flight.
const landingIndex=route.path.findLastIndex(p=>Math.abs(p[1]-floor)<.05&&Math.hypot(p[0]-cx,p[2]+cy)>8.5)
assert(landingIndex>0,'real supported outer Dock landing required')
const approachPath=route.path.slice(0,landingIndex+1),approachTarget=approachPath.at(-1)

for(const n of ['sunny.glb','sunny-collision.glb','ship-metadata.json']){const local=sha(fs.readFileSync('public/models/'+n)),served=sha(Buffer.from(await(await fetch(new URL('/models/'+n,url))).arrayBuffer()));assert.equal(local,served,n);hashes[n]=local}
if(openOnly){const prior=JSON.parse(fs.readFileSync(`${out}/closed-controls-proof.json`));assert.deepEqual(prior.hashes,hashes,'closed/open proof must share exact final product assets');assert.deepEqual(prior.trace.map(r=>r.side).sort(),['port','starboard']);trace.push(...prior.trace)}
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage(),errors=[];await page.setViewport({width:1440,height:900});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text())})
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000});await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny&&window.__sunnyNavigation);await page.mouse.click(720,450)
 /** Same normal walking/hatch logic as existing journeys; no player placement. */
 async function walk(path){
  const initial=await page.evaluate(()=>window.__sunny.recoveries)
  for(const target of path.slice(1)){
   const hatch=await page.evaluate(t=>{const p=window.__sunny.position;return window.__sunnyDoors.doors.find(d=>d.kind==='hatch'&&!d.state.latched&&Math.hypot(p[0]-d.pos[0],p[2]-d.pos[2])<2&&p[1]>=d.bandLow&&p[1]<=d.bandHigh&&(p[1]<d.pos[1]-.20||t[1]<d.pos[1]-.20))?.id},target)
   if(hatch){await page.keyboard.press('e');await sleep(650)}
   assert(await driveTo(page,target,.14),'normal Dock route stalled at '+JSON.stringify(target))
  }
  const s=await page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries}));assert(s.grounded&&s.recoveries===initial);trace.push({phase:'normal Dock walk',...s});console.log('PASS normal Dock walk',s)
 }
 /** Normal E/Q flight altitude with full collision; no body coordinate setter. */
 async function altitude(y){
  for(let i=0;i<100;i++){
   const p=await page.evaluate(()=>window.__sunny.position),d=y-p[1]
   if(Math.abs(d)<.06){await sleep(180);const q=await page.evaluate(()=>window.__sunny.position);if(Math.abs(q[1]-y)<.12)return}
   const key=d>0?'e':'q';await page.keyboard.down(key);await sleep(Math.min(60,Math.max(10,Math.abs(d)*100)));await page.keyboard.up(key);await sleep(100)
  }
  throw Error('normal flight altitude stalled')
 }
 /** Short native W pulses from rest avoid applying walking braking to faster flight. */
 async function driveFlight(target){
  let nearest=Infinity,stalls=0
  for(let i=0;i<180;i++){
   const p=await page.evaluate(()=>window.__sunny.position),distance=Math.hypot(target[0]-p[0],target[2]-p[2])
   if(distance<.25){await sleep(240);const q=await page.evaluate(()=>window.__sunny.position);if(Math.hypot(target[0]-q[0],target[2]-q[2])<.30)return true}
   if(distance<nearest-.04){nearest=distance;stalls=0}else stalls++
   if(stalls>12)return false
   await page.evaluate(({p,target})=>window.__sunny.look(Math.atan2(-(target[0]-p[0]),-(target[2]-p[2])),-.03),{p,target})
   await page.keyboard.down('w');await sleep(distance>2?120:distance>1?65:distance>.5?30:10);await page.keyboard.up('w');await sleep(240)
  }
  return false
 }
 async function flyTo(p){
  await altitude(p[1]);const ok=await driveFlight(p)
  if(!ok){const state=await page.evaluate(()=>({position:window.__sunny.position,velocity:window.__sunny.vel,collision:window.__sunny.flyCollision,nearby:window.__sunny.nearbyColliders,text:document.body.innerText}));fs.writeFileSync(`${out}/flight-stall.json`,JSON.stringify({target:p,state,trace},null,2));console.log('STALL flight',JSON.stringify({position:state.position,collision:state.collision,nearby:state.nearby.map(b=>b.name)}));throw Error('collision-enabled flight stalled at '+JSON.stringify(p))}
  const actual=await page.evaluate(()=>window.__sunny.position);trace.push({phase:'normal full-body flight',target:p,position:actual});console.log('PASS flight',actual)
 }
 const feet=floor+3.5
 if(!openOnly){
 await walk(approachPath);await page.keyboard.press('f');if(!await page.evaluate(()=>window.__sunny.flyCollision))await page.keyboard.press('b');assert(await page.evaluate(()=>window.__sunny.flyCollision));
 // Closed stop is at each actual external shutter, beyond the formerly blocked lining.
 for(const o of meta.exterior.mechanisms.dockOpenings){
  const side=o.side==='port'?1:-1,outer=-o.centre[1];await flyTo([cx,feet,-cy+side*11.8]);await altitude(feet)
  const passed=await driveFlight([cx,feet,outer+side*.9]),s=await page.evaluate(()=>({position:window.__sunny.position,collision:window.__sunny.flyCollision,state:window.__sunnyNavigation.state}))
  assert(!passed&&Math.abs(s.position[2]-(outer-side*.342))<.30,`closed shutter must stop actual body at mouth ${o.side}`)
  trace.push({phase:'closed shutter stop',side:o.side,...s});console.log('PASS closed shutter body stop',o.side,s.position);await flyTo([cx,feet,-cy+side*11.8])
 }
 await flyTo([approachTarget[0],feet,approachTarget[2]]);await page.keyboard.press('f');await sleep(500);await page.keyboard.press('r');await sleep(500)

 }
 const controls=meta.exterior.mechanisms.controls,three=p=>[p[0],p[2],-p[1]]
 /** Aim/use only the existing actual selector and lever with E. */
 async function use(id){assert(await driveTo(page,three(controls[id]),.12));await page.evaluate(t=>{const p=window.__sunny.position,dx=t[0]-p[0],dy=t[1]-p[1]-1.7,dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(dy,Math.hypot(dx,dz)))},three(controls.targets[id]));await sleep(300);await page.keyboard.press('e');await sleep(350)}
 let state
 const helmTrace=await walkJourney(page,loadColliders('public/models/sunny.glb'),'helm','port',{returnToLawn:true,onCheckpoint:async checkpoint=>{
  if(checkpoint.label!=='helm deck')return
  await use('selector');assert.equal((await page.evaluate(()=>window.__sunnyNavigation.state)).channel,2);await use('lever');await sleep(4800)
  state=await page.evaluate(()=>window.__sunnyNavigation.state);assert(state.dockOpen&&state.shutter>.98);trace.push({phase:'real selector2 and lever fully open',state});console.log('PASS real selector2/lever opening',state.channel,state.shutter)
 }})
 assert(state&&helmTrace.every(r=>r.ok));trace.push({phase:'normal helm walking and stair return',records:helmTrace})
 /** R resets voyage as well as player; retain opening through real continuous walking. */
 async function assertOpen(){const s=await page.evaluate(()=>window.__sunnyNavigation.state);assert(s.channel===2&&s.dockOpen&&s.shutter>.98,'actual selected/open state must remain intact');return s}
 await assertOpen();await walk(approachPath);await assertOpen();await page.keyboard.press('f');if(!await page.evaluate(()=>window.__sunny.flyCollision))await page.keyboard.press('b');assert(await page.evaluate(()=>window.__sunny.flyCollision));await altitude(feet)
 const b=meta.interiors.dockSolids.find(b=>b.name==='DockVehicle2'),base=[(b.min[0]+b.max[0])/2,floor,(b.min[1]+b.max[1])/2],bay=rotatePoint([base[0],base[1],-base[2]],state.dockAngle,[cx,floor,-cy]),dx=bay[0]-cx,dz=bay[2]+cy,len=Math.hypot(dx,dz)
 const bayEdge=[cx+dx/len*7.3,feet,-cy+dz/len*7.3];await flyTo(bayEdge);trace.push({phase:'actual selected bay2 outer region',vehicleCentre:bay,position:await page.evaluate(()=>window.__sunny.position)})
 // Native collision-enabled movement connects the selected bay region to both
 // local mouths. Water-bearing channel support/vehicle launch is separate C03/M10.
 await flyTo([cx,feet,-cy+7.3])
 for(const o of meta.exterior.mechanisms.dockOpenings){
  const side=o.side==='port'?1:-1,outer=-o.centre[1],inside=[cx,feet,-cy+side*11.8],outside=[cx,feet,outer+side*.9]
  await assertOpen();await flyTo(inside);await flyTo(outside);const crossed=await page.evaluate(()=>({position:window.__sunny.position,collision:window.__sunny.flyCollision,recoveries:window.__sunny.recoveries,state:window.__sunnyNavigation.state}));assert(crossed.collision&&crossed.state.channel===2&&crossed.state.shutter>.98);await page.screenshot({path:`${out}/body-outside-${o.side}.png`});trace.push({phase:'open mouth actual body crossing',side:o.side,...crossed});await flyTo(inside);trace.push({phase:'open mouth actual body return',side:o.side,position:await page.evaluate(()=>window.__sunny.position)})
 }
 await flyTo([approachTarget[0],feet,approachTarget[2]]);await page.keyboard.press('f');await sleep(600);await walk([...approachPath].reverse());const end=await page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries}));assert.equal(end.recoveries,0,'no fall recovery may substitute for return');assert(end.grounded&&Math.hypot(end.position[0]-plan.spawn[0],end.position[2]-plan.spawn[2])<.6);assert.deepEqual(errors,[])
 fs.writeFileSync(`${out}/body-access.json`,JSON.stringify({notice:'Actual normal walking, selector/lever E, full-size native F flight with B collision ON. Closed mouth stops and open crossings/returns on both sides. No teleport/body/collision bypass. Not a C03 water-support or vehicle-launch acceptance.',url,hashes,closedProof:openOnly?'closed-controls-proof.json':'same continuous run',trace,end,errors},null,2));console.log('PASS C02 actual closed/open paired-mouth full-body control/access and return')
}finally{await browser.close()}
