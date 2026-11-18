import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const [roomName,out,url='http://localhost:5174']=process.argv.slice(2)
assert(roomName&&out,'Pass room name, output directory and optional preview URL')
fs.mkdirSync(out,{recursive:true})
const asset=async name=>{
 const response=await fetch(new URL(`/models/${name}`,url));assert(response.ok)
 return Buffer.from(await response.arrayBuffer())
}
const [visual,metaBytes]=await Promise.all(['sunny.glb','ship-metadata.json'].map(asset))
const meta=JSON.parse(metaBytes)
const room=meta.interiors.rooms.find(room=>room.name===roomName)
assert(room,`Unknown room: ${roomName}`)
const x=(room.x[0]+room.x[1])/2,z=-(room.y[0]+room.y[1])/2,floor=meta.interiors.levels[room.level]
const views={
 Library:[['door-view',[-4.12,1.64,0],[3.3,1.38,0],76],['survey-books',[-1.35,1.67,2.0],[3.3,1.22,-.75],68],
  ['bench-and-windows',[-2.15,1.67,-1.70],[1.7,1.1,4.1],72],['from-desk',[3.33,1.68,1.25],[-2.8,1.08,0],72]],
 Bath:[['bath',[1.7,1.68,-.55],[-1,1.0,2.7],72],['shower',[2.35,1.65,2.9],[-2.3,1.0,2.2],68]],
 'Bath Washroom':[['entrance',[-1.95,1.66,.04],[1.2,1.28,.60],74]],
 'Bath Toilet':[['toilet',[-.11,1.50,.20],[.44,.58,-.21],74]],
 'Dining Room':[['from-entry',[-3.28,1.68,-4.02],[.65,1.21,-.34],78],['table-and-seating',[.2,1.69,-2.47],[.58,.92,1.66],76]],
 Kitchen:[['galley',[-3.25,1.68,3.58],[1.77,1.30,-.53],80],['appliances',[-1.87,1.68,-.36],[1.6,1.2,-3.45],75]],
 Pantry:[['stores',[-1.44,1.66,1.45],[1.15,1.38,-1.20],72]],
 'Sick Bay':[['bed-and-entry',[-1.32,1.68,-.02],[1.26,1.12,2.04],78]],
}
assert(views[roomName],`No camera study configured for ${roomName}`)
const point=([dx,dy,dz])=>[x+dx,floor+dy,z+dz]
if(room.libraryLayout)views.Library.push(['bath-ladder',[-.44,1.66,.75],[-2.16,1.58,-2.83],68])
if(roomName==='Bath'){
 for(const name of ['Bath Washroom','Bath Toilet']){
  const linked=meta.interiors.rooms.find(room=>room.name===name)
  const offsetX=(linked.x[0]+linked.x[1])/2-x,offsetZ=-(linked.y[0]+linked.y[1])/2-z
  const offset=([dx,dy,dz])=>[dx+offsetX,dy,dz+offsetZ]
  for(const [label,eye,focus,fov] of views[name])views.Bath.push([label,offset(eye),offset(focus),fov])
 }
}
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const errors=[],consoleErrors=[],shots=[]
let bathWater=false
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',error=>errors.push(error.message))
 page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())})
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450)
 await page.waitForFunction(()=>!document.body.innerText.includes('Click to Explore'),{timeout:10000})
 await page.evaluate(async()=>{
  const moduleURL=performance.getEntriesByType('resource').map(entry=>entry.name).find(url=>url.includes('/deps/@react-three_fiber.js'))
  const {_roots}=await import(moduleURL)
  window.__roomReview=_roots.get(document.querySelector('canvas')).store.getState()
  window.__roomReview.controls.enabled=false
 })
 for(const [name,eye,focus,fov] of views[roomName]){
  const camera=point(eye),target=point(focus)
  await page.evaluate(({camera,target,fov})=>{
   const scene=window.__roomReview
   scene.camera.position.set(...camera);scene.camera.lookAt(...target);scene.camera.fov=fov
   scene.camera.updateProjectionMatrix();scene.camera.updateMatrixWorld()
  },{camera,target,fov})
  await new Promise(resolve=>setTimeout(resolve,750))
  await page.screenshot({path:path.join(out,`${name}.png`)})
  shots.push({name,camera,target,fov})
 }
 if(room.bathLayout)bathWater=await page.evaluate(()=>{
  const tub=window.__ship.getObjectByName('Sunny_Bath_tub_water')
  let animated=false
  tub?.traverse(node=>{if(node.isMesh&&node.material.userData.bathOwned)animated=true})
  return animated
 })
} finally {await browser.close()}
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({roomName,url,shots,errors,consoleErrors,bathWater,
 assets:{'sunny.glb':sha(visual),'ship-metadata.json':sha(metaBytes)},note:'Actual renderer, inspection camera only. Keyboard routes are verified separately.'},null,2)+'\n')
assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[])
if(room.bathLayout)assert(bathWater,'The actual Bath material must use moving water')
console.log(`PASS ${roomName} actual renderer: ${shots.length} views`)
