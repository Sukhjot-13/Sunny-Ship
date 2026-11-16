/** Cross each actual lower fore threshold from its own lawn approach and return. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import puppeteer from 'puppeteer'
import {roomRoutes} from './roomRoutes.mjs'
import {driveTo} from './stairFlights.mjs'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')),plan=roomRoutes(),trace=[],errors=[]
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(process.env.URL??'http://localhost:5173',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v')
 await page.waitForFunction(()=>window.__sunny&&window.__sunnyDoors);await page.mouse.click(720,450)
 const read=()=>page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries,blocker:window.__sunny.blocker}))
 async function step(label,target,tolerance=.12){
  assert(await driveTo(page,target,tolerance),label+' stalled: '+JSON.stringify(await read()))
  const state=await read();assert(state.grounded&&state.recoveries===0,label+' requires supported normal walking')
  trace.push({label,target,...state})
 }
 for(const id of ['ForeDoor','ForeDoorStarboard']){
  const door=meta.interiors.doors.find(d=>d.id===id),outside=[door.pos[0]+.9,door.pos[2],-door.pos[1]],inside=[door.pos[0]-.9,door.pos[2],-door.pos[1]]
  const path=plan.pathBetween((await read()).position,outside)
  assert(path.length>1,id+' has no physical lawn approach')
  for(const point of path.slice(1))await step(id+' lawn approach',point)
  await step(id+' precise outside stance',outside,.08)
  // This is a direct crossing, so the planner cannot substitute the other door.
  await step(id+' actual threshold crossing',inside,.08)
  const state=await read();assert(state.position[0]<door.pos[0]-.7&&Math.abs(state.position[2]+door.pos[1])<.12,id+' must cross its own doorway')
  assert((await page.evaluate(id=>window.__sunnyDoors.state[id].openness,id))>.95,id+' real leaf must open for the passage')
  await page.screenshot({path:'docs/review/walk-'+id+'-inside.png'})
  await step(id+' reverse threshold crossing',outside,.08)
  for(const point of path.toReversed().slice(1))await step(id+' lawn return',point)
  await step(id+' original spawn',plan.spawn)
  console.log('PASS',id,'own threshold and continuous grounded lawn return')
 }
 assert.deepEqual(errors,[])
}finally{
 fs.writeFileSync('docs/review/fore-threshold-journeys.json',JSON.stringify({trace,errors},null,2));await browser.close()
}
