/** Real control journey, followed by fixed survey camera views with shutters open. */
import puppeteer from 'puppeteer'
import fs from 'node:fs'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import {loadColliders} from '../../../tests/glb.mjs'
import {walkJourney,driveTo} from '../../../tests/stairFlights.mjs'
const insideOnly=process.argv.includes('--inside-only');const url=process.env.SUNNY_BASE_URL||'http://127.0.0.1:8180/', sleep=ms=>new Promise(r=>setTimeout(r,ms)), sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const records=[],hashes={};for(const n of ['sunny.glb','sunny-collision.glb','ship-metadata.json']){const local=sha(fs.readFileSync('public/models/'+n)),served=sha(Buffer.from(await(await fetch(new URL('/models/'+n,url))).arrayBuffer()));assert.equal(local,served,n);hashes[n]=local}
const meshes=loadColliders('public/models/sunny.glb'),meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')), controls=meta.exterior.mechanisms.controls,three=p=>[p[0],p[2],-p[1]]
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage(),errors=[];await page.setViewport({width:1440,height:900});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text())})
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000});await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny&&window.__sunnyNavigation);await page.mouse.click(720,450)
 const trace=await walkJourney(page,meshes,'helm','port',{returnToLawn:false});assert(trace.length>5&&trace.every(p=>p.ok),'helm walking failed')
 const aim=async id=>{await page.evaluate(t=>{const p=window.__sunny.position,dx=t[0]-p[0],dy=t[1]-p[1]-1.7,dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(dy,Math.hypot(dx,dz)))},three(controls.targets[id]));await sleep(300)}
 const use=async id=>{assert(await driveTo(page,three(controls[id]),.12),id+' approach failed');await aim(id);await page.keyboard.press('e');await sleep(350)}
 await use('selector');assert.equal((await page.evaluate(()=>window.__sunnyNavigation.state)).channel,2);await use('lever');await sleep(4800)
 const state=await page.evaluate(()=>window.__sunnyNavigation.state);assert(state.shutter>.98&&state.dockOpen)
 await page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=window.__trialState=_roots.get(document.querySelector('canvas')).store.getState();if(s.controls)s.controls.enabled=false;s.scene.onBeforeRender=function(_r,_s,c){if(c!==s.camera||!window.__trialPose)return;window.__ship.updateWorldMatrix(true,false);const m=window.__ship.matrixWorld,p=window.__trialPose;c.position.fromArray(p.eye).applyMatrix4(m);c.up.set(0,1,0).transformDirection(m);c.lookAt(c.position.clone().fromArray(p.target).applyMatrix4(m));c.updateMatrixWorld(true)}})
 for(const o of meta.exterior.mechanisms.dockOpenings){
  const side=o.side,sgn=side==='port'?1:-1,outer=-o.centre[1]
  for(const inside of (insideOnly?[true]:[false,true])){
   const pose=inside?{eye:[o.centre[0],o.centre[2],outer-sgn*11],target:[o.centre[0],o.centre[2],sgn*25]}:{eye:[.495,-45.94,sgn*25],target:[.495,-45.94,sgn*10]}
   await page.evaluate(p=>window.__trialPose=p,pose);await sleep(1000)
   const path=`docs/review/c03-20261029/open-${inside?'inside-':''}${side}.png`;await page.screenshot({path});records.push({side,inside,path,...pose})
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(insideOnly?'docs/review/c03-20261029/inside-views.json':'docs/review/c03-20261029/views.json',JSON.stringify({url,hashes,state,trace,records,errors},null,2));console.log('PASS real helm walk, selection, opening, hashes and matched survey screenshots')
}finally{await browser.close()}
