/** Complete human-speed lookout ascent/return via real WASD/E, never placement. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
import {normalizeClimbs,pointAt,CLIMB_SPEED} from '../src/systems/climbing.js'
import {driveTo} from './stairFlights.mjs'
import {EYE_HEIGHT_M} from '../src/config/shipConfig.js'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const path=normalizeClimbs(meta.exterior.mechanisms.climbs).find(p=>p.id==='fore-lookout')
assert(path,'Authored lookout access is required')
const start=pointAt(path,0),end=pointAt(path,path.length),floor=end[1]
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),trace=[],errors=[]
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto((process.env.SUNNY_BASE_URL || 'http://localhost:5173'),{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny);await page.mouse.click(720,450)
 const read=()=>page.evaluate(()=>({p:window.__sunny.position,c:window.__sunny.climbing,g:window.__sunny.grounded,r:window.__sunny.recoveries,
   hatch:window.__sunnyDoors.state.CrowNestHatch,t:performance.now()}))
 const toggleHatch=async(open)=>{
  await page.keyboard.press('e')
  await page.waitForFunction(open=>open?window.__sunnyDoors.state.CrowNestHatch.openness>.95:window.__sunnyDoors.state.CrowNestHatch.openness<.05,{timeout:4000},open)
 }
 /** Aim at the real handholds/deck from the controller's normal human eyes. */
 const view=async(target)=>{
  await page.evaluate(({t,eye})=>{const p=window.__sunny.position,dx=t[0]-p[0],dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(t[1]-p[1]-eye,Math.hypot(dx,dz)))},{t:target,eye:EYE_HEIGHT_M})
  await sleep(120)
 }
 const walk=async(label,target)=>{
  assert(await driveTo(page,target,.12),label+' stalled')
  const s=await read();assert(s.g&&s.r===0,label+' must have actual footing and no recovery');trace.push({label,...s});console.log('PASS',label)
 }
 await walk('clear dock stair opening',[-1.2,start[1],-.99])
 await walk('rope-side lawn approach',[-1.2,start[1],start[2]])
 await walk('actual rope endpoint',start)
 const before=await read();await page.keyboard.press('e');await sleep(100)
 assert((await read()).c,'E grabs only a physically reachable endpoint')
 assert(Math.hypot(...(await read()).p.map((v,i)=>v-before.p[i]))<.20,'attachment must not place the player')
 /** Sample continuous actual movement, guarding speed/recoveries and stalls. */
 async function climb(key,until,label){
  const deadline=Date.now()+150000;let prev=await read(),stall=0
  await page.keyboard.down(key)
  try{
   while(Date.now()<deadline){
    await sleep(350);const s=await read()
    const delta=Math.hypot(...s.p.map((v,i)=>v-prev.p[i])),elapsed=(s.t-prev.t)/1000
    assert(s.r===0,label+' used automatic recovery')
    assert(delta<=CLIMB_SPEED*elapsed+.08,label+' exceeded human speed')
    trace.push({label,...s});if(until(s,prev)){console.log('PASS',label,s.p);return s}
    stall=delta<.01?stall+1:0
    assert(stall<12,label+' stalled at '+JSON.stringify(s));prev=s
   }
   throw new Error(label+' timed out')
  }finally{await page.keyboard.up(key)}
 }
 await page.evaluate(()=>window.__sunny.look(Math.PI/2,.6))
 await climb('w',s=>s.c?.progress>15,'rope ascent')
 const ropePose=await read(),handhold=pointAt(path,ropePose.c.progress+2.0);handhold[0]-=.50
 await view(handhold)
 await page.screenshot({path:'docs/review/walk-Lookout-rope-ascent.png'})
 const inspectPose=await read();await page.keyboard.press('v');await sleep(200);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny?.climbing)
 const restored=await read();assert(Math.hypot(...restored.p.map((v,i)=>v-inspectPose.p[i]))<.03,'Inspect preserves physical climb pose')
 assert(Math.abs(restored.c.progress-inspectPose.c.progress)<.03,'Inspect preserves progress')
 const blocked=await climb('w',(s,p)=>s.p[1]>floor-2.0&&Math.hypot(...s.p.map((v,i)=>v-p.p[i]))<.01,'ladder ascent to shut hatch')
 assert(blocked.p[1]<floor-1.70,'shut hatch blocks the full human body')
 await view([path.points[3][0]-.48,floor-.06,path.points[3][2]])
 await page.screenshot({path:'docs/review/walk-Lookout-shut-hatch.png'})
 await toggleHatch(true)
 assert((await read()).hatch.openness>.9,'actual E opens lookout hatch')
 await climb('w',s=>!s.c,'through hatch to lookout floor')
 assert((await read()).g,'arrival has real floor support')
 await walk('lookout floor excursion',[end[0]-.7,floor,end[2]+.8])
 await page.evaluate(()=>window.__sunny.look(Math.PI,-.12));await page.screenshot({path:'docs/review/walk-Lookout-floor.png'})
 await walk('return to ladder endpoint',end)
 await page.keyboard.press('e');await sleep(120);assert((await read()).c,'E reattaches for descent')
 await toggleHatch(false);assert((await read()).hatch.openness<.1,'hatch can shut safely beside climber')
 await climb('s',(s,p)=>s.c?.progress<path.length-1.3&&Math.hypot(...s.p.map((v,i)=>v-p.p[i]))<.01,'return to shut hatch')
 await toggleHatch(true);assert((await read()).hatch.openness>.9,'E reopens hatch for return descent')
 await climb('s',s=>s.p[1]<floor-10,'ladder return descent')
 const descent=await read(),lowerRope=pointAt(path,descent.c.progress-2.0);lowerRope[0]-=.50
 await view(lowerRope)
 await page.screenshot({path:'docs/review/walk-Lookout-return-descent.png'})
 await climb('s',s=>!s.c,'rope return to lawn')
 await walk('return from rope along lawn',[-1.2,start[1],start[2]])
 await walk('return around dock stair opening',[-1.2,start[1],-.99])
 await walk('return to original lawn spawn',[meta.spawn.position[0],meta.spawn.position[2],-meta.spawn.position[1]])
 assert.deepEqual(errors,[])
 console.log('PASS continuous lawn → rope → ladder → shut/open hatch → lookout floor → reverse descent → lawn; human speed, Inspect continuity, no placement/flight/recovery')
}catch(e){
 const page=(await browser.pages()).at(-1)
 if(page)trace.push({failure:e.message,...await page.evaluate(()=>({p:window.__sunny?.position,c:window.__sunny?.climbing,hatch:window.__sunnyDoors?.state.CrowNestHatch}))})
 await page?.screenshot({path:'docs/review/stall-Lookout-climb.png'});throw e
}finally{
 fs.writeFileSync('docs/review/lookout-climb-journey.json',JSON.stringify({trace,errors},null,2));await browser.close()
}
