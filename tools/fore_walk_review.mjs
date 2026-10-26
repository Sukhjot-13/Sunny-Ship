/** Photograph real fore stair/helm checkpoints and verify complete returns. */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import {loadColliders} from '../tests/glb.mjs'
import {walkJourney,stairFlights} from '../tests/stairFlights.mjs'
import {EYE_HEIGHT_M} from '../src/config/shipConfig.js'

const phase=process.argv[2]||'construction-fore-final',out='docs/review'
if(!/^[a-z0-9-]+$/.test(phase))throw new Error('Use a simple evidence phase name')
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const meshes=loadColliders('public/models/sunny.glb'),flights=stairFlights(meshes)
const helm=meshes.find(m=>m.name==='Sunny_Helm_pedestal')
const deck=meshes.find(m=>m.name==='Sunny_ForedeckSupport')
const upper=flights.find(f=>f.name==='fore upper'),cy=(helm.min.z+helm.max.z)/2
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--enable-webgl']})
try {
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 const errors=[],journeys=[],shots=[]
 page.on('pageerror',e=>errors.push(e.message))
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.goto('http://localhost:5173',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v')
 await page.waitForFunction(()=>!!window.__sunny,{timeout:120000})
 await page.mouse.click(720,450);await sleep(1200)

 for(const side of ['port','starboard']) {
  const lower=flights.find(f=>f.name===`fore lower ${side}`)
  const middle=lower.treads[Math.floor(lower.treads.length/2)]
  const onCheckpoint=async state=>{
   const q={
    'upper entrance':['upper-entrance',upper.treads.at(-1)],
    'helm deck':['helm',[deck.min.x+.2,deck.max.y+.36,cy]],
    'return lower landing':['lower-descent',middle],
   }[state.label]
   if(!q)return
   const [label,target]=q
   await page.evaluate(({eye,target})=>{
    const p=window.__sunny.position
    window.__sunny.look(Math.atan2(-(target[0]-p[0]),-(target[2]-p[2])),
     Math.atan2(target[1]-p[1]-eye,Math.hypot(target[0]-p[0],target[2]-p[2])))
   },{eye:EYE_HEIGHT_M,target})
   await sleep(180)
   const path=`${out}/${phase}-walk-${side}-${label}.png`
   await page.screenshot({path});shots.push({side,path,label,target,eyeHeight:EYE_HEIGHT_M,state})
  }
  const trace=await walkJourney(page,meshes,'helm',side,{onCheckpoint})
  const required=[`fore lower ${side}`,'fore upper',`fore lower ${side} descent`,'fore upper descent']
  const ok=trace.every(t=>t.ok)&&required.every(label=>trace.some(t=>t.label===label))&&trace.at(-1)?.label==='back to lawn'
  journeys.push({side,ok,trace});console.log('HELM JOURNEY',JSON.stringify({side,ok,trace}))
 }
 fs.writeFileSync(`${out}/${phase}-journeys.json`,JSON.stringify({journeys,shots,errors,eyeHeight:EYE_HEIGHT_M},null,2))
 if(errors.length||journeys.some(j=>!j.ok))throw new Error('Front journey failed; inspect saved traces')
 console.log('PASS both full front ascents and return descents; no runtime errors')
}finally{await browser.close()}
