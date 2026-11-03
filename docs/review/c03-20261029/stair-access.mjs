/** Normal full-body walking down the retained Dock stair and back. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
import {driveTo} from '../../../tests/stairFlights.mjs'
const out='docs/review/c03-20261029',url='http://127.0.0.1:8187/',sleep=ms=>new Promise(r=>setTimeout(r,ms)),sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const path=JSON.parse(fs.readFileSync(`${out}/outer-approach-baseline.json`)).path,hashes={},trace=[]
for(const n of ['sunny.glb','sunny-collision.glb','ship-metadata.json']){const local=sha(fs.readFileSync('public/models/'+n)),served=sha(Buffer.from(await(await fetch(new URL('/models/'+n,url))).arrayBuffer()));assert.equal(local,served,n);hashes[n]=local}
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage(),errors=[];await page.setViewport({width:1440,height:900});page.on('pageerror',e=>errors.push(e.message));await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000});await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny&&window.__sunnyDoors);await page.mouse.click(720,450)
 async function walk(points){for(const target of points.slice(1)){
  const hatch=await page.evaluate(t=>{const p=window.__sunny.position;return window.__sunnyDoors.doors.find(d=>d.kind==='hatch'&&!d.state.latched&&Math.hypot(p[0]-d.pos[0],p[2]-d.pos[2])<2&&p[1]>=d.bandLow&&p[1]<=d.bandHigh&&(p[1]<d.pos[1]-.20||t[1]<d.pos[1]-.20))?.id},target)
  if(hatch){await page.keyboard.press('e');await sleep(650)}
  const ok=await driveTo(page,target,.14),state=await page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries}));trace.push({target,ok,...state});assert(ok,'normal Dock stair stalled at '+JSON.stringify(target))
 }}
 await walk(path);await walk([...path].reverse());const end=await page.evaluate(()=>({position:window.__sunny.position,grounded:window.__sunny.grounded,recoveries:window.__sunny.recoveries}));assert(end.grounded&&end.recoveries===0&&Math.hypot(end.position[0]-path[0][0],end.position[2]-path[0][2])<.6);assert.deepEqual(errors,[])
 fs.writeFileSync(`${out}/stair-access.json`,JSON.stringify({url,hashes,trace,end,errors},null,2));console.log('PASS retained Dock stair normal body walk and return')
}catch(e){fs.writeFileSync(`${out}/stair-access-failure.json`,JSON.stringify({url,hashes,trace,error:String(e)},null,2));throw e}finally{await browser.close()}
