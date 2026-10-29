/** Survey evidence only. Never writes source/assets, rebuilds, or places the player. */
import fs from 'node:fs'
import puppeteer from 'puppeteer'
import {loadColliders} from '../../tests/glb.mjs'
import {walkJourney,driveTo} from '../../tests/stairFlights.mjs'
const out='docs/review/whole-ship-audit',controlOut=out+'-verified',meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const L=meta.interiors.levels,cy=.585*meta.exterior.experienceScale,meshes=loadColliders('public/models/sunny.glb')
const three=p=>[p[0],p[2],-p[1]],pause=ms=>new Promise(r=>setTimeout(r,ms))
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const records=[],errors=[]
try {
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.screenshot({path:out+'-title.png'})
 await page.mouse.click(720,450)
 await page.evaluate(async()=>{
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js')
  window.__wholeAudit=_roots.get(document.querySelector('canvas')).store.getState()
  window.__wholeAudit.controls.enabled=false
  window.__wholeAudit.scene.onBeforeRender=function followShipForSurvey(_renderer,_scene,camera){
   if(!window.__wholePose)return
   window.__ship.updateWorldMatrix(true,false)
   const m=window.__ship.matrixWorld,p=window.__wholePose
   camera.position.fromArray(p.eye).applyMatrix4(m)
   camera.up.set(0,1,0).transformDirection(m)
   camera.lookAt(camera.position.clone().fromArray(p.target).applyMatrix4(m));camera.updateMatrixWorld(true)
  }
 })
 /** Ship-relative camera placement for appearance only; the player is never moved. */
 async function view(name,eye,target,notice='Inspect camera appearance; not walking proof'){
  await page.evaluate(p=>{window.__wholePose=p;if(window.__wholeAudit.controls)window.__wholeAudit.controls.enabled=false},{eye:three(eye),target:three(target)})
  await pause(350)
  const data=await page.evaluate(()=>{
   const s=window.__wholeAudit;s.raycaster.setFromCamera({x:0,y:0},s.camera)
   const hits=s.raycaster.intersectObject(window.__ship,true).slice(0,4).map(h=>({name:h.object.name,distance:h.distance}))
   return {worldEye:s.camera.position.toArray(),hits,nav:window.__sunnyNavigation.state}
  })
  await page.screenshot({path:out+'-'+name+'.png'});records.push({name,eye,target,notice,...data})
 }
 const views=[
 ['mens-reverse',[-27.2,-3.5,L.F1+1.7],[-23.7,5.0,L.F1+1.2]],
 ['womens-reverse',[-27.2,3.0,L.F2F+1.7],[-23.7,-4.8,L.F2F+1.2]],
 ['mens-wash-wide',[-20.8,5.9,L.F1+1.7],[-19.8,7.35,L.F1+1.1]],
 ['womens-wash-wide',[-22.2,5.8,L.F2F+1.7],[-21.0,8.3,L.F2F+1.1]],
 ['cannon-men-starboard',[-23.8,9.0,L.F1+1.5],[-25.8,9.35,L.F1+.5]],
 ['cannon-men-port',[-23.8,-9.7,L.F1+1.5],[-25.8,-10.1,L.F1+.5]],
 ['cannon-women-starboard',[-24.5,9.0,L.F2F+1.5],[-26.92,9.25,L.F2F+.5]],
 ['cannon-women-port',[-24.5,-9.7,L.F2F+1.5],[-26.92,-10.0,L.F2F+.5]],
 ['aquarium-reverse',[19.0,cy-4,L.F1+1.7],[10,cy,L.F1+1.6]],
 ['aquarium-lift',[13.6,cy+1.2,L.F1+1.7],[17.5,cy,L.F1+1.4]],
 ['aquarium-entrance',[5.4,cy,L.F1+1.7],[8.65,cy,L.F1+1.2]],
 ['aquarium-overhead',[24.55,cy,L.F1+1.7],[24.6,cy+5,L.F1+3.0]],
 ['dining-reverse',[19.5,cy-8.7,L.F2A+1.7],[13.7,cy-2.2,L.F2A+1.35]],
 ['kitchen-reverse',[19.5,cy+7.4,L.F2A+1.7],[13.0,cy+4.2,L.F2A+1.2]],
 ['dining-stair-enclosure',[17.5,cy-7.5,L.F2A+1.7],[14.7,cy-13,L.F2A+3]],
 ['kitchen-stair-enclosure',[17.5,cy+7.5,L.F2A+1.7],[14.7,cy+13,L.F2A+3]],
 ['pantry-reverse',[23.9,cy+9.6,L.F2A+1.7],[21.0,cy+3,L.F2A+1.1]],
 ['infirmary-reverse',[23.9,cy-9.6,L.F2A+1.7],[21.0,cy-2,L.F2A+1.1]],
 ['bath-reverse',[29.2,cy-2.9,L.F3B+1.7],[29.2,cy+2.9,L.F3B+1.2]],
 ['bath-wc-wide',[29.1,cy+3.8,L.F3B+1.7],[29.6,cy+4.4,L.F3B+.7]],
 ['library-reverse',[32.6,cy,L.F3L+1.7],[25.4,cy,L.F3L+1.3]],
 ['factory-reverse',[18.3,-8,L.B1+1.7],[10,-3,L.B1+1.1]],
 ['weapons-reverse',[18.3,10,L.B1+1.7],[10,5,L.B1+1.1]],
 ['energy-front',[23.1,5.5,L.B1+1.7],[23.15,8.55,L.B1+1.7]],
 ['dock-centre',[0.5,cy,L.B1+1.7],[6,cy,L.B1+1.1]],
 ['dock-waiting',[-7.8,cy-4,L.B1+1.7],[0.5,cy+4,L.B1+1.2]],
 ['lookout-reverse',[-15.8,-.4,L.F3C+1.7],[-10.1,1.4,L.F3C+1.0]],
 ['lawn-aft',[-7,cy,L.F1+1.7],[12,cy,L.F1+3.0]],
 ['lawn-fore',[-7,cy,L.F1+1.7],[-16,cy,L.F1+3.4]],
 ['dock-hatch-closed',[-5.5,6.7,L.F1+1.7],[-3.5,8.8,L.F1+.25]],
 ['fore-toilet-port',[-13,-3.7,L.F1+1.7],[-15.8,-3.7,L.F1+1.05]],
 ['fore-toilet-starboard',[-13,3.7,L.F1+1.7],[-15.8,3.7,L.F1+1.05]],
 ['garden-plants',[17,-5,L.F3G+1.7],[21,3,L.F3G+.7]],
 ['garden-office',[14,-10,L.F3G+1.7],[20,-6,L.F3G+.8]],
 ['garden-library',[21.8,cy,L.F3G+1.7],[26,cy,L.F3L+1.4]],
 ['gallery-slide',[11,10.5,L.F2A+1.7],[6,12.5,L.F2A-1]],
 ['lawn-swing',[3,-9,L.F1+1.7],[7,-11,L.F1+1.1]],
 ['figurehead-close',[-53,cy,-30.5],[-40,cy,-32]],
 ['anchor-port',[-33,-20,-32.5],[-27.5,-13.5,-35.5]],
 ['anchor-starboard',[-33,22,-32.5],[-27.5,16.1,-35.5]],
 ['stern-barrel',[46,cy,-38],[34,cy,-41]],
 ['rigging-near',[-7,17,-18],[-11,cy,6]],
 ['helm-inspect',[-24,cy,-30.9],[-27.7,cy,-31.9]],
 ]
 for(let i=1;i<=6;i++){
  const a=(i-1)*Math.PI/3,bx=.495+Math.cos(a)*5.3,by=cy+Math.sin(a)*5.3
  views.push(['vehicle-'+i,[bx-2.8*Math.cos(a)+2.8*Math.sin(a),by-2.8*Math.sin(a)-2.8*Math.cos(a),L.B1+2.15],[bx,by,L.B1+1.1]])
 }
 if(process.argv.includes('--extra-only'))views.splice(0,views.length,
  ['extra-popgreens',[12.7,-8.0,L.F3G+1.7],[15.04,-9.68,L.F3G+.65]],
  ['extra-robin',[12.7,8.0,L.F3G+1.7],[15.04,9.68,L.F3G+.65]],
  ['extra-office',[11.7,.4,L.F3G+1.7],[13.94,.44,L.F3G+.8]],
  ['extra-swing',[-1.4,-5.8,L.F1+1.7],[.7,-7.37,L.F1+1.1]],
  ['extra-toilet-port',[-15.6,-4.25,L.F1+1.7],[-16.2,-3.4,L.F1+.75]],
  ['extra-toilet-starboard',[-15.6,3.15,L.F1+1.7],[-16.2,4.0,L.F1+.75]],
  ['extra-kotatsu',[-21.8,cy,L.F1+1.7],[-25.1,2.64,L.F1+.25]],
  ['extra-lockers',[-26,cy+3,L.F1+1.7],[-28.8,cy,L.F1+1.1]],
  ['extra-women-furniture',[-24,-.2,L.F2F+1.7],[-28,-3,L.F2F+1.0]],
  ['extra-curtains',[18,cy,L.F1+1.7],[19,cy+6,L.F1+3.1]],
  ['extra-aquarium-hatch',[11.5,-5.8,L.F2A+1.7],[11.55,-7.513,L.F2A+.15]],
  ['extra-lookout-ladder',[-11.5,1.3,22.8],[-10.48,2.26,29.22]],
  ['extra-bow-side',[-43,-22,-32],[-34,cy,-34]]
 )
 if(process.argv.includes('--curtain-only'))views.splice(0,views.length,['extra-curtains-directed',[12,cy,L.F1+1.7],[15,cy+8.96,L.F1+2.8]])
 if(!process.argv.includes('--controls-only'))for(const row of views)await view(...row)
 if(!process.argv.includes('--controls-only'))fs.writeFileSync(out+(process.argv.includes('--curtain-only')?'-curtain-views.json':process.argv.includes('--extra-only')?'-extra-views.json':'-supplemental-views.json'),JSON.stringify({records,errors,notice:'All original meshes retained. Camera only; no player placement. Not route/functional proof.'},null,2))
 console.log('Appearance captures:',records.length)
 if(process.argv.includes('--controls')||process.argv.includes('--controls-only')){
  await page.evaluate(()=>{window.__wholePose=null;window.__wholeAudit.scene.onBeforeRender=function auditNoCameraOverride(){}})
  await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny&&window.__sunnyNavigation);await page.mouse.click(720,450)
  const walk=await walkJourney(page,meshes,'helm','port',{returnToLawn:false})
  const functional={notice:'Actual normal-size WASD route. Driver sets look orientation; no player placement/flight/respawn. Mechanism close-ups use remote render camera only.',walk,actions:[],errors}
  const save=()=>fs.writeFileSync(controlOut+'-functional.json',JSON.stringify(functional,null,2))
  save()
  if(!walk.every(p=>p.ok))throw Error('Helm walking route incomplete; see functional evidence')
  const controls=meta.exterior.mechanisms.controls
  /** Aim only. Locomotion remains real keyboard movement. */
  async function aim(id){await page.evaluate(t=>{const p=window.__sunny.position,dx=t[0]-p[0],dy=t[1]-p[1]-1.7,dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(dy,Math.hypot(dx,dz)))},three(controls.targets[id]));await pause(350)}
  /** Record user-visible help/prompts and read-only mechanism state. */
  async function action(name,key,delay=600){if(key)await page.keyboard.press(key);await pause(delay);functional.actions.push({name,key,...await page.evaluate(()=>({nav:window.__sunnyNavigation.state,feet:window.__sunny.position,recoveries:window.__sunny.recoveries,text:document.body.innerText}))});save()}
  await aim('helm');await action('physical-helm-prompt',null);await page.screenshot({path:controlOut+'-control-helm-prompt.png'})
  await action('take-helm','e');await page.keyboard.press('h');await pause(300);await page.screenshot({path:controlOut+'-control-help.png'})
  await action('mouth-open','j',1200);await page.screenshot({path:controlOut+'-control-mouth-from-helm.png'})
  const install=()=>page.evaluate(()=>{window.__wholeAudit.scene.onBeforeRender=function followShipForSurvey(_r,_s,c){if(!window.__wholePose)return;window.__ship.updateWorldMatrix(true,false);const m=window.__ship.matrixWorld,p=window.__wholePose;c.position.fromArray(p.eye).applyMatrix4(m);c.up.set(0,1,0).transformDirection(m);c.lookAt(c.position.clone().fromArray(p.target).applyMatrix4(m));c.updateMatrixWorld(true)}})
  await install();await view('verified-mouth-open-close',[-53,cy,-32.3],[-39.5,cy,-34.0],'Remote appearance camera after physically taking helm and pressing J')
  await action('gaon-fire','k',150);await view('verified-gaon-fire-close',[-54,cy,-32],[-41,cy,-34],'Remote mechanism camera after real K from the helm')
  await pause(3000);await action('gaon-finished',null)
  await action('chicken-on','t',800);await view('verified-chicken-close',[-53,cy,-32],[-40,cy,-32],'Remote mechanism camera after real T from helm');await action('chicken-off','t')
  await action('release-helm','e')
  await page.evaluate(()=>{window.__wholePose=null;window.__wholeAudit.scene.onBeforeRender=function auditNoCameraOverride(){}})
  for(const id of ['selector','lever','log']){
   const approached=await driveTo(page,three(controls[id]),.12);await aim(id);await action(id+'-prompt',null)
   await page.screenshot({path:controlOut+'-control-'+id+'.png'});await action(id+'-E','e',id==='lever'?5500:800)
   functional.actions.at(-1).approached=approached;save()
  }
  await install();await view('verified-dock-open-port',[.5,-29,-43],[.5,-17.1,-45.9],'Remote appearance after physical E controls; current channel 2')
  fs.writeFileSync(controlOut+'-views.json',JSON.stringify({records,errors},null,2));save();if(errors.length)throw Error('Audit browser errors: '+[...new Set(errors)].join('; '));console.log('Functional actions:',functional.actions.length)
 }
} finally {await browser.close()}
