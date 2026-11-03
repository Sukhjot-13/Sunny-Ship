/** Real WASD/E journeys to rooms: continuous room tour and forced stair journeys, without teleporting. */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import {roomRoutes} from './roomRoutes.mjs'
import {driveTo} from './stairFlights.mjs'
import {ladderJourney} from './ladderJourney.mjs'
import {pointAt} from '../src/systems/climbing.js'
const plan=roomRoutes(),failures=[]
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(process.env.URL||'http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ship,{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny&&window.__sunnyDoors)
 await page.mouse.click(720,450)
 /** Follow a planned route with actual input; interact with hatches in reach. */
 async function walk(path){
  const recoveries=await page.evaluate(()=>window.__sunny.recoveries)
  let last=null
  for(const target of path.slice(1)){
   const hatch=await page.evaluate(target=>{
    const p=window.__sunny.position
    // Floor walking can cross a supported shut lid. Operate it only for a
    // planned below-lid transition, rather than grabbing an adjacent ladder
    // while merely passing its landing during the room tour.
    return window.__sunnyDoors.doors.find(d=>d.kind==='hatch'&&!d.state.latched&&Math.hypot(p[0]-d.pos[0],p[2]-d.pos[2])<2&&p[1]>=d.bandLow&&p[1]<=d.bandHigh&&(p[1]<d.pos[1]-.20||target[1]<d.pos[1]-.20))?.id
   },target)
   if(hatch){await page.keyboard.press('e');await new Promise(r=>setTimeout(r,650))}
   const ok=await driveTo(page,target,.14)
   last=await page.evaluate(()=>({pos:window.__sunny.position,grounded:window.__sunny.grounded,blocker:window.__sunny.blocker}))
   if(!ok){console.log('STALL waypoint',target,last);return {ok:false,last}}
  }
  const now=await page.evaluate(()=>window.__sunny.recoveries)
  return {ok:!!last?.grounded&&now===recoveries,last}
 }
 let tour=false,lastRoom=null
 for(const route of [...plan.routes,...plan.stairs,...plan.ladders,...plan.approaches]){
  if(process.env.ROOM_FILTER&&!route.name.includes(process.env.ROOM_FILTER))continue
  if(!route.ok){console.log('FAIL',route.name,'no connected planned route');failures.push(route.name);tour=false;continue}
  const isLadder=route.name.startsWith('Ladder: '),isStair=isLadder||route.name.startsWith('Stair: ')||route.name.startsWith('Fore cabin approach: ')
  const continued=tour&&!isStair&&!process.env.ROOM_FILTER
  if(!continued){await page.evaluate(()=>window.__sunny.respawn());await new Promise(r=>setTimeout(r,400))}
  let result=await walk(continued?route.tourPath:route.path)
  if(result.ok&&isLadder){
   try{
    // Grid-cell arrival is not arrival at the physical grab endpoint. Finish
    // with the same real-input approach used by exterior access, retaining
    // ladderJourney's strict 0.20 m check and all full return coverage.
    const endpoint=pointAt(route.climb,route.descendingFirst?route.climb.length:0)
    if(!await driveTo(page,endpoint,.10))throw Error('normal walking approach did not reach the ladder endpoint')
    console.log('Physical ladder endpoint approach',route.name,{endpoint,feet:await page.evaluate(()=>window.__sunny.position)})
    await ladderJourney(page,route.climb,{descending:!!route.descendingFirst,closedStop:!route.descendingFirst});result={ok:true,last:await page.evaluate(()=>({pos:window.__sunny.position,grounded:window.__sunny.grounded}))}
   }
   catch(e){console.log('FAIL',route.name,e.message);result.ok=false}
  }
  let ok=result.ok&&Math.abs(result.last.pos[1]-route.target[1])<.35
  console.log(ok?'PASS':'FAIL',continued?'tour to':'lawn to',route.name,result.last)
  if(!ok){failures.push(route.name);await page.screenshot({path:`docs/review/stall-${route.name.replace(/[^a-z0-9]+/gi,'-')}.png`})}
  if(ok&&!isStair){lastRoom=route;tour=true}
  if(ok){await page.screenshot({path:`docs/review/walk-${route.name.replace(/[^a-z0-9]+/gi,'-')}.png`})}
  else tour=false
  if(ok&&(isStair||process.env.ROOM_FILTER)){
   if(isLadder){
    try{await ladderJourney(page,route.climb,{descending:!route.descendingFirst,closedStop:!!route.descendingFirst})}catch(e){console.log('FAIL',route.name,'return climb',e.message);failures.push(`${route.name} return climb`);tour=false;continue}
   }
   const back=await walk([...route.path].reverse()),p=await page.evaluate(()=>window.__sunny.position)
   ok=back.ok&&Math.hypot(p[0]-plan.spawn[0],p[2]-plan.spawn[2])<.6&&Math.abs(p[1]-plan.spawn[1])<.35
   console.log(ok?'PASS':'FAIL',route.name,'return to lawn',p)
   if(!ok)failures.push(`${route.name} return`)
   tour=false
  }
  // Complete the continuous room tour before starting forced stair journeys.
  if(ok&&route===plan.routes.at(-1)&&!process.env.ROOM_FILTER&&lastRoom){
   const back=await walk(lastRoom.returnPath),p=await page.evaluate(()=>window.__sunny.position)
   const returned=back.ok&&Math.hypot(p[0]-plan.spawn[0],p[2]-plan.spawn[2])<.6&&Math.abs(p[1]-plan.spawn[1])<.35
   console.log(returned?'PASS':'FAIL','room tour return to lawn',p)
   if(!returned)failures.push('room tour return')
   tour=false
  }
 }

 if(errors.length){failures.push('runtime errors');console.log(errors)}
}finally{await browser.close()}
console.log('Interior journey failures:',failures)
process.exitCode=failures.length?1:0
