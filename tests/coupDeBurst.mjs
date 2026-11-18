/** Real keyboard, camera, renderer, water and audio for Coup de Burst. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import puppeteer from 'puppeteer'
import {BURST} from '../src/systems/navigation.js'

const url=process.env.URL??'http://localhost:5173'
const evidence=process.env.BURST_EVIDENCE
if(evidence)fs.mkdirSync(evidence,{recursive:true})
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const trace={},errors=[]
try{
 const page=await browser.newPage()
 await page.setViewport({width:1440,height:900})
 page.on('pageerror',error=>errors.push(error.message))
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
 await page.evaluateOnNewDocument(()=>{
  window.__burstSounds=[]
  const start=AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start=function(...args){
   const signal=this.buffer?.getChannelData(0)??[]
   const peak=signal.reduce((max,x)=>Math.max(max,Math.abs(x)),0)
   window.__burstSounds.push({duration:this.buffer?.duration,peak,audioState:this.context.state,cola:window.__sunnyNavigation?.state.cola})
   return start.apply(this,args)
  }
 })
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&window.__sunnyOcean&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450)
 await page.waitForSelector('button[aria-keyshortcuts="G"]')
 const view=()=>page.evaluate(()=>{
  const hull=window.__ship.parent
  const cloud=hull.parent.getObjectByName('Coup de Burst mist and spray')
  const uniforms=window.__sunnyOcean.material.uniforms
  return {nav:window.__sunnyNavigation.state,lift:hull.position.y,pitch:hull.rotation.z,
   groundOffset:uniforms.uWorldOffset.value.toArray(),waterLift:uniforms.uShipLift.value,
   impact:uniforms.uBurstImpact.value.toArray(),particles:cloud.visible?cloud.geometry.drawRange.count:0,
   camera:window.__sunnyCamera.toArray(),feet:window.__sunny?.position,sounds:window.__burstSounds.slice()}
 })
 const waitAge=(from,to)=>page.waitForFunction(({from,to,total})=>{
  const left=window.__sunnyNavigation.state.burst,age=total-left
  return left>0&&age>=from&&age<to
 },{timeout:15000},{from,to,total:BURST.seconds})
 const settled=()=>page.waitForFunction(()=>window.__sunnyNavigation.state.burst===0,{timeout:17000})
 const shot=async name=>{if(evidence)await page.screenshot({path:`${evidence}/${name}.png`})}
 trace.before=await view()
 assert(!trace.before.nav.helm)
 await page.keyboard.down('g')
 await page.keyboard.down('g')
 await page.keyboard.up('g')
 trace.charge=await view()
 assert(trace.charge.nav.burst>BURST.flight)
 assert.equal(trace.charge.sounds.length,1,'holding G should only charge once')
 assert.equal(trace.charge.sounds[0].cola,27,'charging spends exactly three barrels before the first refill')
 await waitAge(BURST.charge+.20,BURST.charge+.78)
 trace.launch=await view()
 assert(trace.launch.lift>10&&trace.launch.pitch<-.16&&trace.launch.particles===116)
 assert.equal(trace.launch.sounds.length,2)
 await shot('stern-launch')
 await waitAge(BURST.charge+2.45,BURST.charge+3.3)
 trace.apex=await view()
 assert(trace.apex.lift>100&&Math.abs(trace.apex.lift-trace.apex.waterLift)<.001)
 assert(trace.apex.camera[1]>trace.before.camera[1]+20)
 assert(Math.abs(trace.apex.groundOffset[0]-trace.apex.nav.east)<.001)
 await page.keyboard.press('g')
 assert.equal((await view()).sounds.length,2,'a new press in midair must not restart the sequence')
 await shot('airborne')
 const touch=BURST.charge+BURST.flight
 await waitAge(touch+.24,touch+.82)
 trace.splash=await view()
 assert(trace.splash.particles===308&&trace.splash.impact[0]>=0&&trace.splash.waterLift<0)
 assert(Math.abs(Math.hypot(...trace.splash.groundOffset)-BURST.range)<20)
 await shot('splashdown')
 await settled()
 trace.after=await view()
 assert.equal(trace.after.nav.lift,0)
 assert.equal(trace.after.nav.pitch,0)
 assert.equal(trace.after.particles,0)
 assert.equal(trace.after.impact[0],-1)
 assert.equal(trace.after.nav.cola,30)
 assert(trace.after.camera.every((value,i)=>Math.abs(value-trace.before.camera[i])<.05),'Inspect must restore the original view')
 const durations=[BURST.charge,BURST.flight,BURST.landing+.45]
 assert.equal(trace.after.sounds.length,durations.length)
 for(const [i,sound] of trace.after.sounds.entries()){
  assert(Math.abs(sound.duration-durations[i])<.001&&sound.peak>.04)
 }
 assert(trace.after.sounds.slice(1).every(sound=>sound.audioState==='running'))

 await page.keyboard.press('v')
 await page.waitForFunction(()=>window.__sunny?.grounded)
 const onDeck=await view()
 await page.keyboard.press('g')
 await waitAge(BURST.charge+1.0,BURST.charge+2.0)
 trace.onDeck=await view()
 assert(!trace.onDeck.nav.helm&&trace.onDeck.lift>40)
 assert(trace.onDeck.feet.every((value,i)=>Math.abs(value-onDeck.feet[i])<.06))
 await settled()

 await page.keyboard.press('v')
 await page.waitForFunction(()=>!window.__sunny)
 await page.click('button[aria-keyshortcuts="G"]')
 await page.waitForFunction(()=>window.__sunnyNavigation.state.burst>0)
 trace.button=await view()
 assert.equal(trace.button.sounds.length,7)
 await page.keyboard.press('r')
 await settled()
 assert.deepEqual(errors,[])
 console.log('PASS global G, repeated-key guard, three live sounds, kilometre arc, actual splash and shader, camera restoration, on-deck flight and visible button')
}finally{
 if(evidence)fs.writeFileSync(`${evidence}/verification.json`,JSON.stringify({trace,errors},null,2)+'\n')
 await browser.close()
}
