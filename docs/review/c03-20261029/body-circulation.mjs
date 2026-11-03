/** Real helm control and continuous normal-body Dock ladder descent/return. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
import {loadColliders} from '../../../tests/glb.mjs'
import {driveTo,walkJourney} from '../../../tests/stairFlights.mjs'
import {normalizeClimbs,pointAt} from '../../../src/systems/climbing.js'
import {ladderJourney} from '../../../tests/ladderJourney.mjs'
const out='docs/review/c03-20261029',url=process.env.SUNNY_BASE_URL||'http://127.0.0.1:8187/'
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')),meshes=loadColliders('public/models/sunny.glb'),hashes={},trace=[]
const path=normalizeClimbs(meta.exterior.mechanisms.climbs).find(p=>p.id==='dock-waiting-ladder')
assert(path&&path.hatch==='DockLadderHatch','actual central ladder and lawn hatch required')
for(const n of ['sunny.glb','sunny-collision.glb','ship-metadata.json']){
 const local=sha(fs.readFileSync('public/models/'+n)),served=sha(Buffer.from(await(await fetch(new URL('/models/'+n,url))).arrayBuffer()))
 assert.equal(local,served,`served ${n}`);hashes[n]=local
}
const three=p=>[p[0],p[2],-p[1]],browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']}),errors=[]
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text())})
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny&&window.__sunnyNavigation);await page.mouse.click(720,450)
 const initial=await page.evaluate(()=>window.__sunny.recoveries),controls=meta.exterior.mechanisms.controls
 async function use(id){assert(await driveTo(page,three(controls[id]),.12),`${id} approach`);await page.evaluate(t=>{const p=window.__sunny.position,dx=t[0]-p[0],dy=t[1]-p[1]-1.7,dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(dy,Math.hypot(dx,dz)))},three(controls.targets[id]));await sleep(300);await page.keyboard.press('e');await sleep(350)}
 let closed,opened
 const helm=await walkJourney(page,meshes,'helm','port',{returnToLawn:true,onCheckpoint:async checkpoint=>{
  if(checkpoint.label!=='helm deck')return
  await use('selector');await sleep(2200);closed=await page.evaluate(()=>({state:window.__sunnyNavigation.state,gates:window.__sunnyNavigation.innerGates}))
  assert.equal(closed.state.channel,2);assert.equal(closed.gates.length,84)
  await use('lever');await sleep(4800);opened=await page.evaluate(()=>({state:window.__sunnyNavigation.state,gates:window.__sunnyNavigation.innerGates}))
  assert(opened.state.dockOpen&&opened.state.shutter>.98)
  const mean=(a,c)=>a.gates.filter(g=>g.channel===c).reduce((s,g)=>s+g.position[1],0)/14
  assert(mean(opened,2)>mean(closed,2)+1,'selected inner gate actually opens')
  assert(Math.abs(mean(opened,1)-mean(closed,1))<.02,'unselected gate stays closed')
 }})
 trace.push({phase:'real selector, lever and helm return',closed,opened,helm})
 assert(helm.length>5&&helm.every(t=>t.ok),'real helm walking and return')
 const upper=pointAt(path,path.length),spawn=three(meta.spawn.position)
 assert(await driveTo(page,upper,.10),'normal walking approach to lawn ladder endpoint')
 let s=await page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries}))
 assert(s.grounded&&s.recoveries===initial,'lawn endpoint has real footing');trace.push({phase:'lawn endpoint',...s})
 await ladderJourney(page,path,{descending:true,trace,capture:false})
 s=await page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries,state:window.__sunnyNavigation.state}))
 assert(s.grounded&&s.recoveries===initial&&Math.abs(s.position[1]-(meta.interiors.dockWaterLevel+.45))<.10,'real waiting-room landing without recovery')
 trace.push({phase:'actual waiting-room landing',...s});await page.screenshot({path:`${out}/waiting-body.png`})
 await ladderJourney(page,path,{descending:false,closedStop:true,trace,capture:false})
 // Walk around the still-open shaft instead of trying to cross its hole.
 const aroundZ=upper[2]+1.6
 for(const target of [[upper[0],upper[1],aroundZ],[spawn[0],spawn[1],aroundZ],spawn])
  assert(await driveTo(page,target,.15),'normal walking return around open lawn hatch to '+JSON.stringify(target))
 const end=await page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries,state:window.__sunnyNavigation.state}))
 assert(end.grounded&&end.recoveries===initial&&Math.hypot(end.position[0]-spawn[0],end.position[2]-spawn[2])<.6,'complete grounded return without recovery')
 assert(end.state.channel===2&&end.state.shutter>.98,'selected open state retained');assert.deepEqual(errors,[])
 fs.writeFileSync(`${out}/body-circulation.json`,JSON.stringify({url,hashes,trace,end,errors},null,2));console.log('PASS real selector/lever, central ladder descent, closed-hatch ascent and lawn return')
}catch(error){fs.writeFileSync(`${out}/body-circulation-failure.json`,JSON.stringify({url,hashes,trace,errors,error:String(error)},null,2));throw error}
finally{await browser.close()}
