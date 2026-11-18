/** Follow a scoped list of connected rooms using the ordinary player controls. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import puppeteer from 'puppeteer'
import {roomRoutes} from './roomRoutes.mjs'
import {driveTo} from './stairFlights.mjs'
import {ladderJourney} from './ladderJourney.mjs'
import {pointAt} from '../src/systems/climbing.js'

const rooms=process.argv.length>2?process.argv.slice(2):[
 "Men's Quarters","Men's Washroom",'Men Starboard Cannon Closet','Men Port Cannon Closet',
 "Women's Quarters","Women's Washroom",'Women Starboard Cannon Closet','Women Port Cannon Closet',
 'Fore Port Toilet','Fore Starboard Toilet',
]
const plan=roomRoutes(),trace=[],errors=[]
const out=process.env.ROOM_SET_EVIDENCE??'docs/review/fore-room-journey'
const storage=rooms.includes('Storage Room')?plan.ladders.find(route=>route.climb.id==='storage-ladder'):null
if(rooms.includes('Storage Room'))assert(storage?.ok&&storage.descendingFirst,'Storage requires its supported cabin ladder')
const routes=rooms.filter(name=>name!=='Storage Room').map(name=>{
 const route=plan.routes.find(route=>route.name===name)
 assert(route?.ok,`${name}: the normal lawn approach must be connected`)
 return route
})
fs.mkdirSync(out,{recursive:true})
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const page=await browser.newPage()
try{
 await page.setViewport({width:1440,height:900})
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(process.env.URL??'http://localhost:5173',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450)
 await page.keyboard.press('v')
 await page.waitForFunction(()=>window.__sunny&&window.__sunnyDoors)
 await page.mouse.click(720,450)
 const read=()=>page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,
  blocker:window.__sunny.blocker,recoveries:window.__sunny.recoveries}))
 async function follow(label,path,target){
  assert(path.length>1,`${label}: no body-clear path`)
  for(const point of path.slice(1)){
   const reached=await driveTo(page,point,.14)
   const state=await read()
   assert(reached&&state.recoveries===0,`${label}: ${JSON.stringify({point,...state})}`)
  }
  const state=await read()
  assert(state.grounded&&state.recoveries===0,label)
  assert(Math.hypot(...state.position.map((value,i)=>value-target[i]))<.45,`${label}: does not reach the room`)
  trace.push({label,...state})
  console.log('PASS',label,state.position)
 }
 if(storage){
  const climb=storage.climb,top=pointAt(climb,climb.length),bottom=pointAt(climb,0)
  await follow('Men’s cabin storage hatch approach',storage.path,storage.path.at(-1))
  assert(await driveTo(page,top,.10))
  await ladderJourney(page,climb,{descending:true,trace,capture:false})
  const stockAisle=[bottom[0]-1,bottom[1],-3]
  await follow('Storage Room stock aisle',plan.pathBetween((await read()).position,stockAisle),stockAisle)
  await follow('Storage ladder footing',plan.pathBetween((await read()).position,bottom),bottom)
  assert(await driveTo(page,bottom,.10))
  await ladderJourney(page,climb,{trace,capture:false})
  await follow('return from Storage to lawn',plan.pathBetween((await read()).position,plan.spawn),plan.spawn)
 }
 for(const [index,route] of routes.entries()){
  const path=index?plan.pathBetween((await read()).position,route.target):route.path
  await follow(route.name,path,route.target)
 }
 if(routes.length)await follow('return to lawn',plan.pathBetween((await read()).position,plan.spawn),plan.spawn)
 assert.deepEqual(errors,[])
}catch(error){
 await page.screenshot({path:`${out}/stall.png`}).catch(()=>{})
 throw error
}finally{
 fs.writeFileSync(`${out}/room-set-journey.json`,JSON.stringify({trace,errors},null,2)+'\n')
 await browser.close()
}
