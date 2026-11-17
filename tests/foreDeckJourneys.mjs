/** Focused complete helm routes for fore-guard changes; actual walking only. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
import {loadColliders} from './glb.mjs'
import {walkJourney} from './stairFlights.mjs'
const meshes=loadColliders('public/models/sunny.glb'),trace=[],errors=[]
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(process.env.URL??'http://localhost:5173',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny);await page.mouse.click(720,450)
 for(const side of ['port','starboard']){
  const journey=await walkJourney(page,meshes,'helm',side)
  trace.push({side,journey})
  assert(journey.length>=6&&journey.every(step=>step.ok),side+' complete helm approach/transfers/return failed: '+JSON.stringify(journey))
  const final=await page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries}))
  assert(final.grounded&&final.recoveries===0,'normal helm round trip must retain real footing and use no recovery')
  await page.screenshot({path:'docs/review/walk-fore-helm-'+side+'-return.png'})
  console.log('PASS',side,'complete lawn/fore flights/helm/new upper gap/return',final)
 }
 assert.deepEqual(errors,[])
}finally{
 fs.writeFileSync('docs/review/fore-deck-journeys.json',JSON.stringify({trace,errors},null,2));await browser.close()
}
