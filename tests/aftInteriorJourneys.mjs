/** Human-scale aft galley circulation using normal walking input. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import puppeteer from 'puppeteer'
import {roomRoutes} from './roomRoutes.mjs'
import {driveTo} from './stairFlights.mjs'

const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const kitchen=meta.interiors.rooms.find(room=>room.name==='Kitchen')
const layout=kitchen?.galleyLayout
assert(layout,'Run the aft interior walk against the rebuilt galley')
const plan=roomRoutes(),route=plan.routes.find(route=>route.name==='Kitchen')
assert(route?.ok,'The standard lawn route must reach the galley')
const level=meta.interiors.levels.F2A
const toward=([x,y],dx,dy)=>[x+dx,level,-y+dy]
const trace=[],errors=[]
const out=process.env.AFT_WALK_EVIDENCE??'docs/review/aft-interior-journey'
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
 const snapshot=()=>page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,
  blocker:window.__sunny.blocker,recoveries:window.__sunny.recoveries}))
 async function walk(label,path){
  assert(path.length>1,`${label}: no connected path`)
  for(const target of path.slice(1)){
   const reached=await driveTo(page,target,.14)
   const state=await snapshot()
   assert(reached&&state.recoveries===0,`${label}: ${JSON.stringify({target,...state})}`)
  }
  const state=await snapshot()
  assert(state.grounded&&state.recoveries===0,label)
  trace.push({label,...state})
  console.log('PASS',label,state.position)
 }
 async function visit(label,target){
  await walk(label,plan.pathBetween((await snapshot()).position,target))
  const state=await snapshot()
  assert(Math.hypot(state.position[0]-target[0],state.position[2]-target[2])<.62,label)
 }
 await walk('lawn to open galley',route.path)
 await visit('stone serving island work side',toward(layout.island,0,-1.30))
 await visit('inset sink approach',toward(layout.sink,.23,.83))
 await visit('stove working position',toward(layout.stove,0,.99))
 const pantry=meta.interiors.doors.find(door=>door.id==='PantryInDoor')
 await visit('Kitchen side of Pantry doorway',toward(pantry.pos,-.83,0))
 await visit('galley return to lawn',plan.spawn)
 assert.deepEqual(errors,[])
}catch(error){
 await page.screenshot({path:`${out}/stall.png`}).catch(()=>{})
 throw error
}finally{
 fs.writeFileSync(`${out}/galley-journey.json`,JSON.stringify({trace,errors},null,2)+'\n')
 await browser.close()
}
