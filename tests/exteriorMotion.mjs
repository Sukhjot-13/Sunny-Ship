/** Real WASD motion/stop comparison and exterior flight diagnostics, no teleport. */
import puppeteer from 'puppeteer'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {loadColliders} from './glb.mjs'
import {walkJourney,driveTo} from './stairFlights.mjs'
import {EYE_HEIGHT_M} from '../src/config/shipConfig.js'
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),out='docs/review'
const meshes=loadColliders('public/models/sunny.glb');fs.mkdirSync(out,{recursive:true})
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto((process.env.SUNNY_BASE_URL || 'http://localhost:5173'),{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.screenshot({path:`${out}/exterior-overview.png`})
 for(const [i,dx] of [[1,280],[2,280]]){
  await page.mouse.move(720,450);await page.mouse.down();await page.mouse.move(720+dx,450,{steps:20});await page.mouse.up();await sleep(700)
  await page.screenshot({path:`${out}/exterior-orbit-${i}.png`})
 }
 await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny,{timeout:90000});await page.mouse.click(720,450)
 await page.evaluate(()=>window.__sunny.look(-Math.PI/2,-.65));await sleep(800)
 const start=await page.evaluate(()=>({p:window.__sunny.position,r:window.__sunny.recoveries}))
 await page.keyboard.down('w')
 for(let i=1;i<=3;i++){await sleep(300);await page.screenshot({path:`${out}/exterior-walking-${i}.png`})}
 await page.keyboard.up('w');await sleep(1500)
 const stopped=await page.evaluate(()=>({p:window.__sunny.position,r:window.__sunny.recoveries,g:window.__sunny.grounded}))
 assert(stopped.g&&stopped.r===start.r,'walking triggered a fall or recovery')
 assert(Math.hypot(stopped.p[0]-start.p[0],stopped.p[2]-start.p[2])>2,'continuous WASD did not move at least 2 m')
 const a=await page.screenshot({path:`${out}/exterior-stopped.png`});await sleep(5000)
 const b=await page.screenshot({path:`${out}/exterior-stopped-5s.png`})
 const settled=await page.evaluate(()=>window.__sunny.position)
 assert(Math.hypot(...settled.map((v,i)=>v-stopped.p[i]))<.05,'stationary player drifted')
 const difference=await page.evaluate(async({a,b})=>{
  const images=await Promise.all([a,b].map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.src=src})))
  const canvas=document.createElement('canvas');canvas.width=600;canvas.height=180;const ctx=canvas.getContext('2d')
  const data=images.map(i=>{ctx.drawImage(i,420,680,600,180,0,0,600,180);return ctx.getImageData(0,0,600,180).data})
  let changed=0;for(let i=0;i<data[0].length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(data[0][i+c]-data[1][i+c])))>4)changed++
  return changed/(600*180)
 },{a:'data:image/png;base64,'+Buffer.from(a).toString('base64'),b:'data:image/png;base64,'+Buffer.from(b).toString('base64')})
 assert(difference<.01,`stationary deck pixels changed ${100*difference}%`)
 console.log(`PASS actual WASD motion, grounded stop, no recovery; stationary deck pixel changes ${(100*difference).toFixed(3)}%`)
 // Normal-eye garden walking adds vegetation and transparent roof coverage.
 // The broad regions include legitimately moving canvas/water, so their
 // differences are recorded for image review, not labelled universal flicker.
 const gardenJourney=await walkJourney(page,meshes,'garden','port',{returnToLawn:false})
 assert(gardenJourney.length>5&&gardenJourney.every(s=>s.ok),'garden material journey failed: '+JSON.stringify(gardenJourney))
 const samples=[]
 for(const name of ['plants','glass']){
  let target=[21.5,-27.2,3.9],paneName=null
  if(name==='glass'){
   assert(await driveTo(page,[23.5,-29.3747,9.0]),'glass passage approach blocked')
   assert(await driveTo(page,[23.5,-29.3747,-1.287]),'glass passage blocked')
   const balcony=meshes.find(m=>m.name==='Sunny_SternBalcony_floor'),c=balcony.min.clone().add(balcony.max).multiplyScalar(.5),size=balcony.max.clone().sub(balcony.min)
   assert(await driveTo(page,[c.x-size.x*.45,c.y,c.z],.20),'glass balcony entrance blocked')
   for(let i=1;i<=4;i++){
    const a=Math.PI-i*Math.PI*2/24
    assert(await driveTo(page,[c.x+size.x*.45*Math.cos(a),c.y,c.z+size.z*.45*Math.sin(a)],.20),'glass balcony sector blocked')
   }
   const p=await page.evaluate(()=>window.__sunny.position)
   const centre=m=>m.min.clone().add(m.max).multiplyScalar(.5)
   const pane=meshes.filter(m=>m.name.startsWith('Sunny_Library_lining_glass')).sort((a,b)=>centre(a).distanceToSquared({x:p[0],y:p[1]+EYE_HEIGHT_M,z:p[2]})-centre(b).distanceToSquared({x:p[0],y:p[1]+EYE_HEIGHT_M,z:p[2]}))[0]
   assert(pane,'actual exported library glazing is required')
   const q=centre(pane),dx=q.x-c.x,dz=q.z-c.z,r=Math.hypot(dx,dz)
   // Aim off the centre mullion, onto the actual pane rather than the roof.
   target=[q.x-.12*dz/r,q.y,q.z+.12*dx/r];paneName=pane.name
  }
  const aim=()=>page.evaluate(({t,eye})=>{const p=window.__sunny.position,dx=t[0]-p[0],dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(t[1]-p[1]-eye,Math.hypot(dx,dz)))},{t:target,eye:EYE_HEIGHT_M})
  await aim()
  await sleep(400)
  const before=await page.evaluate(()=>({p:window.__sunny.position,r:window.__sunny.recoveries}))
  await page.keyboard.down('a');await sleep(180);await page.screenshot({path:`${out}/exterior-${name}-moving.png`});await page.keyboard.up('a');await sleep(1300)
  await aim();await sleep(120)
  if(paneName){
   const visible=await page.evaluate(async({t,name})=>{
    const THREE=await import('/node_modules/three/build/three.module.js')
    let pane=null
    // GLTFLoader keeps the source name in userData while sanitizing periods
    // from runtime names for animation bindings. Compare the exact object.
    window.__ship.traverse(o=>{if(o.userData.name===name)pane=o})
    const origin=window.__sunnyCamera.clone(),point=new THREE.Vector3(...t),ray=new THREE.Raycaster(origin,point.clone().sub(origin).normalize())
    const first=ray.intersectObject(window.__ship,true).find(h=>h.object.visible)
    return {target:name,runtime:pane?.name,first:first?.object.name,distance:first?.distance,hasPane:!!pane,firstIsPane:first?.object===pane}
   },{t:target,name:paneName})
   assert(visible.hasPane&&visible.firstIsPane,'glass camera must actually see its intended pane: '+JSON.stringify(visible))
  }
  const p=await page.evaluate(()=>window.__sunny.position)
  const first=await page.screenshot({path:`${out}/exterior-${name}-stopped.png`});await sleep(5000)
  const second=await page.screenshot({path:`${out}/exterior-${name}-stopped-5s.png`})
  const state=await page.evaluate(()=>({p:window.__sunny.position,r:window.__sunny.recoveries,g:window.__sunny.grounded}))
  assert(state.g&&state.r===before.r&&Math.hypot(...state.p.map((v,i)=>v-p[i]))<.05,`${name} stop drifted or recovered`)
  const changes=await page.evaluate(async({a,b})=>{
   const images=await Promise.all([a,b].map(src=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.src=src})))
   const c=document.createElement('canvas');c.width=800;c.height=520;const ctx=c.getContext('2d');const d=images.map(i=>{ctx.drawImage(i,320,130,800,520,0,0,800,520);return ctx.getImageData(0,0,800,520).data})
   let changed=0,total=0;for(let i=0;i<d[0].length;i+=4){const max=Math.max(...[0,1,2].map(k=>Math.abs(d[0][i+k]-d[1][i+k])));if(max>4)changed++;total+=max}
   return {changed:changed/(800*520),meanChannelChange:total/(800*520)}
  },{a:'data:image/png;base64,'+Buffer.from(first).toString('base64'),b:'data:image/png;base64,'+Buffer.from(second).toString('base64')})
  samples.push({name,target,pane:paneName,region:[320,130,800,520],...changes,notice:'Includes transparent/moving backgrounds; inspect actual pair'})
 }
 const performanceContext=await page.evaluate(async()=>{
  let frames=0,first=performance.now();await new Promise(resolve=>{function frame(t){frames++;if(t-first>=3000)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)})
  const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info')
  return {fps:frames/((performance.now()-first)/1000),viewport:[innerWidth,innerHeight],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'}
 })
 fs.writeFileSync(`${out}/exterior-motion-regions.json`,JSON.stringify({deck:{changed:difference,region:[420,680,600,180]},samples,performanceContext},null,2))
 console.log('PASS grounded garden walking/moving and five-second stop captures; broader material measurements',JSON.stringify({samples,performanceContext}))
 // Fly to the bow with real movement keys, then face the lion. These captures
 // establish appearance only; outdoor walking proof is in gameplay journeys.
 await page.keyboard.press('f');await page.evaluate(()=>window.__sunny.look(Math.PI/2,0))
 await page.keyboard.down('w');await sleep(5100);await page.keyboard.up('w')
 await page.keyboard.down('Space');await sleep(750);await page.keyboard.up('Space');await sleep(600)
 const face=meshes.find(o=>o.name.split('.')[0]==='Sphere001'),target=[(face.min.x+face.max.x)/2,(face.min.y+face.max.y)/2,(face.min.z+face.max.z)/2]
 await page.evaluate(t=>{const p=window.__sunny.position,dx=t[0]-p[0],dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(t[1]-p[1]-1.7,Math.hypot(dx,dz)))},target)
 await sleep(600);await page.screenshot({path:`${out}/exterior-lion-flight-diagnostic.png`})
 assert.deepEqual(errors,[])
 console.log('PASS exterior orbit/flight captures and no runtime errors; flight is not walking proof')
}finally{await browser.close()}
