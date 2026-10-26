/** Real visible cannon use from Inspect and normal spawn, never helm/placement hooks. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import puppeteer from 'puppeteer'
const out='docs/review/cannon-ui',records=[],errors=[]
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const pause=ms=>new Promise(r=>setTimeout(r,ms))
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:800})
 page.on('pageerror',e=>errors.push(e.message))
 /** Start exactly through the title card, without injecting app state. */
 async function start(){
  await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000})
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
 await page.keyboard.press('Enter')
 await page.waitForFunction(()=>window.__sunnyNavigation.state.cola===0&&window.__sunnyNavigation.state.gaon>0)
 await sample('inspect-fired');await page.screenshot({path:out+'-inspect-fired.png'})
 const fire=await page.evaluate(()=>[...document.querySelectorAll('#cannon-panel button')].find(b=>b.textContent==='Fire Gaon')?.disabled)
 assert(fire,'Fire must disable during blast/empty cola')
 await pause(3000)
 assert((await page.$eval('#cannon-readiness',el=>el.textContent)).includes('Needs 3 cola'))
 await sample('inspect-empty');await page.screenshot({path:out+'-empty.png'})
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.textContent==='Cannon · X')
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
 await page.keyboard.press('Tab');await page.keyboard.press('Enter')
 await page.waitForFunction(()=>window.__sunnyNavigation.state.cola===0&&window.__sunnyNavigation.state.gaon>0)
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
 fs.writeFileSync(out+'-results.json',JSON.stringify({records,errors,notice:'All actions through actual visible controls or user keys. Read-only hooks measure results; no placement/flight used to reach a control. Final fly mode is only a global-availability check.'},null,2))
 console.log('PASS universal cannon: Inspect and ordinary spawn, actual jaw/colliders/blast/cola/recoil, mouse + keyboard + pointer-lock handoff, no jump/placement/helm, narrow fly UI')
}finally{await browser.close()}
