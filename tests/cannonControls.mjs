/** Real visible cannon use from Inspect and normal spawn, never helm/placement hooks. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import puppeteer from 'puppeteer'
const out=process.env.CANNON_EVIDENCE??'docs/review/cannon-ui',records=[],errors=[]
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const pause=ms=>new Promise(r=>setTimeout(r,ms))
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:800})
 page.on('pageerror',e=>errors.push(e.message))
 await page.evaluateOnNewDocument(()=>{
  const start=AudioBufferSourceNode.prototype.start
  window.__cannonAudio=[]
  AudioBufferSourceNode.prototype.start=function(...args){
   const data=this.buffer?.getChannelData(0)
   let peak=0
   if(data)for(let i=0;i<data.length;i+=8)peak=Math.max(peak,Math.abs(data[i]))
   window.__cannonAudio.push({duration:this.buffer?.duration,peak,context:this.context,cola:window.__sunnyNavigation?.state.cola})
   return start.apply(this,args)
  }
 })
 /** Start exactly through the title card, without injecting app state. */
 async function start(){
  await page.goto(process.env.URL??'http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000})
  await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
  await page.mouse.click(640,400)
  await page.waitForSelector('button[aria-controls="cannon-panel"]')
 }
 /** Read actual navigation state and rendered moving-jaw pose as evidence only. */
 async function sample(name){
  records.push({name,...await page.evaluate(()=>({navigation:window.__sunnyNavigation.state,
   jawQuaternion:window.__ship.getObjectByName('Sunny_Gaon_jaw').quaternion.toArray(),
   jawColliders:window.__sunnyNavigation.jawColliders,
   feet:window.__sunny?.position,recoveries:window.__sunny?.recoveries,
   locked:!!document.pointerLockElement,focused:document.activeElement?.textContent,
   text:document.body.innerText}))})
 }
 await start()
 const initial=await page.evaluate(()=>window.__ship.getObjectByName('Sunny_Gaon_jaw').quaternion.toArray())
 await page.click('button[aria-controls="cannon-panel"]')
 assert((await page.$eval('#cannon-panel',el=>el.textContent)).includes('60 shots available'))
 assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Open Mouth')
 await page.keyboard.press('Space')
 await page.waitForFunction(()=>window.__sunnyNavigation.state.jaw>.98)
 const open=await page.evaluate(()=>window.__ship.getObjectByName('Sunny_Gaon_jaw').quaternion.toArray())
 assert(open.some((v,i)=>Math.abs(v-initial[i])>.1),'UI must move the real rendered jaw')
 await sample('inspect-open');await page.screenshot({path:out+'-inspect-open.png'})
 assert.equal(records.at(-1).navigation.helm,false)
 assert.equal(records.at(-1).jawColliders.length,2,'real moving jaw collision remains active')
 // Same focused toggle closes the actual mouth, then keyboard opens it again.
 await page.keyboard.press('Enter');await page.waitForFunction(()=>window.__sunnyNavigation.state.jaw<.02)
 await sample('inspect-closed')
 await page.keyboard.press('Enter');await page.waitForFunction(()=>window.__sunnyNavigation.state.jaw>.98)
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Fire Gaon')
 await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter')
 await page.waitForFunction(()=>window.__cannonAudio.length===1&&window.__sunnyNavigation.state.gaon>0)
 await sample('inspect-fired');await page.screenshot({path:out+'-inspect-fired.png'})
 const fire='button[aria-describedby="cannon-readiness"]'
 for(let shot=2;shot<=6;shot++){
  assert(await page.evaluate(()=>window.__sunnyNavigation.state.gaon>0),'rapid repeated firing must work during a blast')
  await page.waitForFunction(selector=>!document.querySelector(selector)?.disabled,{},fire)
  await page.click(fire)
  await page.waitForFunction(count=>window.__cannonAudio.length===count,{},shot)
 }
 const audio=await page.evaluate(()=>window.__cannonAudio.map(({duration,peak,context,cola})=>({duration,peak,state:context.state,cola})))
 assert.equal(audio.length,6,'Every successful shot plays exactly once')
 assert(audio.every(({duration,peak,state})=>duration>=1.8&&peak>.25&&peak<.9&&state==='running'),'Each shot uses an audible, unclipped blast on a running audio context')
 assert.equal(audio[0].cola,29.5)
 assert(audio.every(shot=>shot.cola<=29.5),'every successful shot uses half a cola')
 await sample('inspect-after-six')
 await page.waitForFunction(()=>window.__sunnyNavigation.state.cola===30,{timeout:2500})
 await page.waitForFunction(()=>document.querySelector('#cannon-panel')?.textContent.includes('60 shots available'))
 await sample('inspect-refilled');await page.screenshot({path:out+'-refilled.png'})
 await page.click(fire)
 await page.waitForFunction(()=>window.__cannonAudio.length===7&&window.__sunnyNavigation.state.gaon>0)
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.textContent==='Cannon · X')
 await start()
 await page.keyboard.down('k');await page.keyboard.down('k');await page.keyboard.up('k')
 await page.waitForFunction(()=>window.__cannonAudio.length===1&&window.__sunnyNavigation.state.gaon>0)
 await page.keyboard.press('l')
 await page.waitForFunction(()=>window.__sunnyNavigation.state.shutter===1)
 await page.keyboard.press('4')
 const pending=await page.evaluate(()=>window.__sunnyNavigation.state)
 assert.equal(pending.channel,4);assert.equal(pending.dockGateChannel,1);assert.equal(pending.dockAngle,0)
 await page.keyboard.press('l')
 await page.waitForFunction(()=>{
  const s=window.__sunnyNavigation.state
  return s.dockGateChannel===4&&Math.abs(s.dockAngle+Math.PI)<.02&&s.shutter===1
 })
 await sample('inspect-keyboard-dock-and-cannon')
 assert.equal(records.at(-1).navigation.helm,false)
 assert.equal(records.at(-1).navigation.east,0,'Inspect shortcuts must not start a voyage')
 await page.keyboard.press('Numpad2')
 await page.waitForFunction(()=>window.__sunnyNavigation.state.channel===2&&!window.__sunnyNavigation.state.dockOpen)
 await start();await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny)
 await page.mouse.click(640,400);await page.waitForFunction(()=>!!document.pointerLockElement)
 await pause(400);const feet=await page.evaluate(()=>window.__sunny.position)
 await page.keyboard.press('x');await page.waitForFunction(()=>!document.pointerLockElement&&document.activeElement?.textContent==='Open Mouth')
 await page.keyboard.press('Space');await page.waitForFunction(()=>window.__sunnyNavigation.state.jaw>.98)
 await sample('spawn-panel-open');await page.screenshot({path:out+'-spawn-open.png'})
 const current=records.at(-1)
 assert.equal(current.navigation.helm,false,'panel works without walking to the helm')
 assert.equal(current.recoveries,0)
 assert(Math.abs(current.feet[1]-feet[1])<.05,'Space on focused UI must not jump the player')
 assert(Math.hypot(current.feet[0]-feet[0],current.feet[2]-feet[2])<.05,'panel must not walk/teleport the player')
 await page.keyboard.press('k')
 await page.waitForFunction(()=>window.__cannonAudio.length===1&&window.__sunnyNavigation.state.gaon>0)
 await sample('spawn-fired');assert(records.at(-1).navigation.speed<0,'ordinary Explore fire retains reverse recoil')
 await page.screenshot({path:out+'-spawn-fired.png'})
 await page.mouse.click(640,400)
 assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false,'clicking outside the open panel must not recapture the pointer')
 assert(!(await page.evaluate(()=>document.body.innerText)).includes('Click to Capture Mouse'),'resume overlay must wait until controls close')
 await page.keyboard.press('Escape')
 await page.mouse.click(640,400);await page.waitForFunction(()=>!!document.pointerLockElement)
 await page.keyboard.press('f');await page.waitForSelector('button[aria-pressed]')
 await page.keyboard.press('x');await page.setViewport({width:390,height:740})
 const bounds=await page.$eval('#cannon-panel',el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}})
 assert(bounds.left>=0&&bounds.right<=390&&bounds.bottom<=740,'panel must fit a narrow viewport')
 await sample('fly-narrow');await page.screenshot({path:out+'-fly-narrow.png'})
 assert.equal(errors.length,0,errors.join('\n'))
 fs.writeFileSync(out+'-results.json',JSON.stringify({records,errors,audio,notice:'All actions through actual visible controls or user keys. Read-only hooks measure results; no placement/flight used to reach a control. Final fly mode is only a global-availability check.'},null,2))
 console.log('PASS rapid audible shots, automatic refill and seventh shot on the same page, global K, exact Dock keys, guarded switching, actual jaw/colliders/recoil')
}finally{await browser.close()}
