/** Continuous walking to real controls, operation, and return descent. */
import puppeteer from 'puppeteer'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import {loadColliders} from './glb.mjs'
import {walkJourney,driveTo,stairFlights,walkFlight} from './stairFlights.mjs'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const meshes=loadColliders('public/models/sunny.glb'),meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const controls=meta.exterior.mechanisms.controls,three=p=>[p[0],p[2],-p[1]]
/** Compare real dynamic lower-face colliders with exported bounds/hinge. */
function checkJawBounds(boxes,amount){
 const lion=meta.exterior.mechanisms.lion,pivot=new THREE.Vector3(...three(lion.jawPivot)),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),amount*lion.jawAngle)
 assert.equal(boxes.length,2,'both moving lower-face bodies need physical collision')
 for(const name of ['Sunny_Gaon_jaw','Sunny_Gaon_chin']){
  const mesh=meshes.find(m=>m.name===name),actual=boxes.find(b=>b.name===name),expected=new THREE.Box3()
  assert(mesh&&actual,name+' must have its own moving collider')
  for(const x of [mesh.min.x,mesh.max.x])for(const y of [mesh.min.y,mesh.max.y])for(const z of [mesh.min.z,mesh.max.z])expected.expandByPoint(new THREE.Vector3(x,y,z).sub(pivot).applyQuaternion(q).add(pivot))
  assert(expected.min.toArray().every((v,i)=>Math.abs(v-actual.min[i])<.002)&&expected.max.toArray().every((v,i)=>Math.abs(v-actual.max[i])<.002),name+' collider must follow the actual exported hinge/angle')
 }
}
/** The rendered hull must carry the actual human eye during steering/Burst. */
async function checkCameraFrame(page){
 const error=await page.evaluate(async()=>{
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js')
  const camera=_roots.get(document.querySelector('canvas')).store.getState().camera
  const eye=camera.position.clone().fromArray(window.__sunny.position);eye.y+=1.7
  window.__ship.updateWorldMatrix(true,false);eye.applyMatrix4(window.__ship.matrixWorld)
  return eye.distanceTo(camera.getWorldPosition(camera.position.clone()))
 })
 assert(error<.005,'actual human camera must follow the rendered hull within 5 mm: '+error+' m')
}
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text())})
 await page.goto('http://localhost:5173/',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450);await page.keyboard.press('v');await page.waitForFunction(()=>window.__sunny&&window.__sunnyNavigation);await page.mouse.click(720,450)
 const trace=await walkJourney(page,meshes,'helm','port',{returnToLawn:false})
 assert(trace.length>5&&trace.every(p=>p.ok),'continuous lawn-to-helm route failed: '+JSON.stringify(trace))
 console.log('PASS continuous lawn-to-helm walking without recovery')
 const recoveries=await page.evaluate(()=>window.__sunny.recoveries)
 const aim=async id=>{await page.evaluate(t=>{const p=window.__sunny.position,dx=t[0]-p[0],dy=t[1]-p[1]-1.7,dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(dy,Math.hypot(dx,dz)))},three(controls.targets[id]));await sleep(300)}
 const useControl=async id=>{assert(await driveTo(page,three(controls[id]),.12),'physical '+id+' approach blocked');await aim(id);await page.keyboard.press('e');await sleep(350)}
 await aim('helm');await page.screenshot({path:'docs/review/walk-Helm-controls.png'});await page.keyboard.press('e');await sleep(300)
 assert(await page.evaluate(()=>window.__sunnyNavigation.state.helm),'E did not take the helm')
 const pos=await page.evaluate(()=>window.__sunny.position)
 const markingSpace=()=>page.evaluate(()=>{const result=[];window.__ship.traverse(o=>{const u=o.material?.uniforms?.uShipInverse;if(u)result.push(u.value.clone().multiply(o.matrixWorld).elements)});return result})
 const sailSpace=await markingSpace()
 await page.keyboard.down('w');await sleep(1600);await page.keyboard.up('w');await page.keyboard.down('d');await sleep(1700);await page.keyboard.up('d')
 const state=await page.evaluate(()=>({nav:window.__sunnyNavigation.state,p:window.__sunny.position,yaw:window.__ship.parent.rotation.y,oceanYaw:window.__sunnyOcean.material.uniforms.uShipYaw.value}))
 assert(state.nav.speed>.2&&state.nav.heading!==270&&Math.hypot(state.nav.east,state.nav.south)>.3)
 assert(Math.hypot(state.p[0]-pos[0],state.p[2]-pos[2])<.25,'helm keys moved the walker')
 assert(Math.abs(state.yaw)>.005&&Math.abs(state.oceanYaw-state.yaw)<.05,'water cutout failed to follow ship yaw')
 await checkCameraFrame(page)
 const steeredSpace=await markingSpace();assert(sailSpace.length>=3&&steeredSpace.length===sailSpace.length)
 assert(steeredSpace.every((m,i)=>m.every((v,j)=>Math.abs(v-sailSpace[i][j])<.0001)),'markings slipped while steering')
 await page.keyboard.press('t');await page.keyboard.press('j');await sleep(1100)
 const mechanisms=await page.evaluate(()=>({nav:window.__sunnyNavigation.state,jaw:window.__ship.getObjectByName('Sunny_Gaon_jaw')?.quaternion.toArray(),jawColliders:window.__sunnyNavigation.jawColliders,petals:(()=>{let n=0;window.__ship.traverse(o=>{if(o.userData.sunny_mane)n++});return n})()}))
 assert(mechanisms.nav.maneAngle>.2&&mechanisms.nav.jaw>.95&&mechanisms.petals===7&&Math.abs(mechanisms.jaw[2])>.1)
 checkJawBounds(mechanisms.jawColliders,mechanisms.nav.jaw)
 await aim('helm')
 await page.screenshot({path:'docs/review/walk-Helm-mane-mouth.png'})
 await page.keyboard.press('t');await page.keyboard.press('j');await page.keyboard.press('g');await sleep(2800)
 const airborne=await page.evaluate(()=>({nav:window.__sunnyNavigation.state,p:window.__sunny.position,lift:window.__ship.parent.position.y,waterLift:window.__sunnyOcean.material.uniforms.uShipLift.value}))
 assert.equal(airborne.nav.cola,0);assert(airborne.lift>28&&airborne.waterLift>28,'Burst did not lift the hull and clear its water cutout')
 assert(Math.hypot(...airborne.p.map((v,i)=>v-pos[i]))<.25,'airborne local feet drifted')
 await checkCameraFrame(page)
 await page.screenshot({path:'docs/review/walk-Burst-airborne.png'});await sleep(3700)
 assert.equal((await page.evaluate(()=>window.__sunnyNavigation.state)).lift,0,'Burst failed to land')
 await checkCameraFrame(page)
 const closedJaw=await page.evaluate(()=>({amount:window.__sunnyNavigation.state.jaw,boxes:window.__sunnyNavigation.jawColliders}));assert(closedJaw.amount<.01);checkJawBounds(closedJaw.boxes,closedJaw.amount)
 await page.keyboard.press('e');await sleep(200)
 assert(!(await page.evaluate(()=>window.__sunnyNavigation.state.helm)))
 await useControl('selector');assert.equal((await page.evaluate(()=>window.__sunnyNavigation.state)).channel,2)
 await useControl('lever');assert((await page.evaluate(()=>window.__sunnyNavigation.state)).dockOpen)
 await sleep(4800)
 const dock=await page.evaluate(()=>({nav:window.__sunnyNavigation.state,slats:window.__sunnyNavigation.shutters,bounds:window.__sunnyNavigation.dockColliders.length,digits:(()=>{const a=[];window.__ship.traverse(o=>{if(o.visible&&'sunny_dock_digit' in o.userData)a.push(o.userData.sunny_dock_digit)});return a})()}))
 assert(dock.nav.shutter>.98&&dock.slats.length===64&&dock.bounds>=6&&Math.abs(dock.nav.dockAngle)>.5)
 assert(dock.digits.length>0&&dock.digits.every(d=>d===2),'shutter number did not follow selected channel')
 assert(dock.slats.some(s=>Math.abs(s.quaternion[0])>.1),'slats did not roll around the aperture axis')
 await aim('log')
 await page.screenshot({path:'docs/review/walk-Navigation-instruments.png'})
 await useControl('lever');await sleep(2500)
 await useControl('log');assert.equal((await page.evaluate(()=>window.__sunnyNavigation.state)).logNeedle,1)
 assert((await page.evaluate(()=>document.body.innerText)).includes('simulation'),'illustrative bearings lack their simulation label')
 await aim('log');await page.screenshot({path:'docs/review/walk-Log-Pose.png'})
 // Continue from the instrument position over actual treads back to the lawn.
 const flights=stairFlights(meshes),upper=flights.find(f=>f.name==='fore upper'),lower=flights.find(f=>f.name==='fore lower port'),end=upper.treads.at(-1),first=upper.treads[0],helm=meshes.find(o=>o.name==='Sunny_Helm_pedestal')
 const hx=(helm.min.x+helm.max.x)/2+.81
 for(const p of [[hx,helm.min.y,-4.5],[end[0]-1.9,end[1],-4.5],[end[0]-.55,end[1],end[2]]])assert(await driveTo(page,p),'control return approach blocked')
 assert((await walkFlight(page,upper,{teleport:false,descending:true})).climbed,'upper return descent failed')
 const lowEnd=lower.treads.at(-1)
 assert(await driveTo(page,[first[0]+.55,lowEnd[1],lowEnd[2]]),'lower return transfer failed')
 assert((await walkFlight(page,lower,{teleport:false,descending:true})).climbed,'lower return descent failed')
 const spawn=await page.evaluate(()=>window.__sunny.spawn)
 assert(await driveTo(page,[spawn[0],spawn[1],lower.treads[0][2]]));assert(await driveTo(page,spawn))
 assert.equal(await page.evaluate(()=>window.__sunny.recoveries),recoveries)
 await page.screenshot({path:'docs/review/walk-Controls-return-lawn.png'})
 // A fresh spawn-to-helm walk funds the separate Gaon/recoil runtime check.
 await page.keyboard.press('r');await sleep(300)
 const reset=await page.evaluate(()=>window.__sunnyNavigation.state);assert.equal(reset.heading,270);assert.equal(reset.cola,3);assert.equal(reset.speed,0)
 const gaonTrace=await walkJourney(page,meshes,'helm','starboard',{returnToLawn:false});assert(gaonTrace.length>5&&gaonTrace.every(p=>p.ok))
 await aim('helm');await page.keyboard.press('e');await sleep(250);await page.keyboard.press('k');await sleep(700)
 const gaon=await page.evaluate(()=>window.__sunnyNavigation.state);assert.equal(gaon.cola,0);assert(gaon.jaw>.9&&gaon.gaon>0&&gaon.speed<0)
 await page.screenshot({path:'docs/review/walk-Gaon-recoil.png'})
 assert.deepEqual(errors,[])
 console.log('PASS actual walking to integrated controls; steering/water/UVs, seven petals/jaw, airborne Burst/landing, rolling channel digits/collision, Log Pose simulation, continuous return descent, reset and separate Gaon/recoil')
}finally{await browser.close()}
