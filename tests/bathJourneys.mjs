import assert from 'node:assert/strict'
import fs from 'node:fs'
import puppeteer from 'puppeteer'
import {roomRoutes} from './roomRoutes.mjs'
import {driveTo} from './stairFlights.mjs'
import {pointAt} from '../src/systems/climbing.js'
import {ladderJourney} from './ladderJourney.mjs'

const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const plan=roomRoutes()
const ladder=plan.ladders.find(route=>route.climb.id==='library-bath-ladder')
assert(ladder?.ok&&!ladder.descendingFirst,'must reach the lower ladder from the ordinary lawn route')
const bath=meta.interiors.rooms.find(room=>room.name==='Bath')
assert(bath?.bathLayout,'Bath finish must be present in the served room generation')
const bathDoor=meta.interiors.doors.find(spec=>spec.id==='BathDoor')
const wcDoor=meta.interiors.doors.find(spec=>spec.id==='BathWCDoor')
const floor=meta.interiors.levels.F3B,trace=[],errors=[]
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const out=process.env.BATH_EVIDENCE??'docs/review'
try{
 fs.mkdirSync(out,{recursive:true})
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(process.env.URL??'http://localhost:5173',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny&&window.__sunnyDoors)
 await page.mouse.click(720,450)
 const snapshot=()=>page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,
  blocker:window.__sunny.blocker,recoveries:window.__sunny.recoveries}))
 async function walk(label,path){
  assert(path.length>1,`${label}: no connected path`)
  for(const target of path.slice(1)){
   const success=await driveTo(page,target,.14),state=await snapshot()
   assert(success&&state.recoveries===0,`${label}: ${JSON.stringify({target,...state})}`)
  }
  const state=await snapshot();assert(state.grounded&&state.recoveries===0,label)
  trace.push({label,...state});console.log('PASS',label,state.position)
 }
 const approach=ladder.path
 await walk('lawn to Library bath ladder',approach)
 const lower=pointAt(ladder.climb,0),upper=pointAt(ladder.climb,ladder.climb.length)
 assert(await driveTo(page,lower,.10))
 await ladderJourney(page,ladder.climb,{trace,closedStop:true,capture:false})
 const visit=async(label,target)=>{
  await walk(label,plan.pathBetween((await snapshot()).position,target))
  await page.screenshot({path:`${out}/walk-${label.trim().replaceAll(' ','-')}.png`})
 }
 await visit('upper washroom',[bathDoor.pos[0]+.85,floor,-bathDoor.pos[1]-.68])
 await visit('bath tub approach',[bath.bathLayout.centre[0]-.1,floor,-bath.bathLayout.centre[1]-1.5])
 await visit('separate toilet',[wcDoor.pos[0],floor,-wcDoor.pos[1]-.61])
 await walk('return to upper ladder',plan.pathBetween((await snapshot()).position,upper))
 assert(await driveTo(page,upper,.10))
 await ladderJourney(page,ladder.climb,{trace,descending:true,capture:false})
 await walk('Library bath return to lawn',approach.toReversed())
 assert.deepEqual(errors,[])
}catch(error){
 const page=(await browser.pages()).at(-1)
 await page?.screenshot({path:`${out}/stall-Bath.png`}).catch(()=>{})
 throw error
}finally{
 fs.writeFileSync(`${out}/bath-journey.json`,JSON.stringify({trace,errors},null,2)+'\n')
 await browser.close()
}
