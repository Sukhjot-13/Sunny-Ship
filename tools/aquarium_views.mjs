import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer'

const [out, url='http://localhost:5174'] = process.argv.slice(2)
assert(out, 'Pass an output directory and optional preview URL')
fs.mkdirSync(out,{recursive:true})
const asset=async name=>{
 const response=await fetch(new URL(`/models/${name}`,url));assert(response.ok)
 return Buffer.from(await response.arrayBuffer())
}
const [visual, metadata]=await Promise.all(['sunny.glb','ship-metadata.json'].map(asset))
const meta=JSON.parse(metadata), floor=meta.interiors.levels.F1
const layout=meta.interiors.rooms.find(room=>room.name==='Aquarium Bar')?.lounge
const mid=-(layout?.centre[1]??meta.interiors.doors.find(door=>door.id==='AquariumDoor').pos[1])
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const shots=[],errors=[],consoleErrors=[]
let materials
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
  window.__aquariumReview=_roots.get(document.querySelector('canvas')).store.getState()
  window.__aquariumReview.controls.enabled=false
 })
 for(const [name,camera,target,fov] of [
  ['lounge',[11.2,floor+1.70,mid],[22,floor+2.05,mid],77],
  ['tank-close',[18,floor+1.70,mid+5.1],[22,floor+2.20,mid+2.6],66],
  ['mast-table',[15.25,floor+1.70,mid-2.9],[19.6,floor+1.65,mid],70],
  ['aft-passage',[24.25,floor+1.70,mid+4.7],[24.22,floor+3.30,mid-3.9],77],
 ]){
  await page.evaluate(({camera,target,fov})=>{
   const scene=window.__aquariumReview
   scene.camera.position.set(...camera);scene.camera.lookAt(...target);scene.camera.fov=fov
   scene.camera.updateProjectionMatrix();scene.camera.updateMatrixWorld()
  },{camera,target,fov})
  await new Promise(resolve=>setTimeout(resolve,1000))
  await page.screenshot({path:path.join(out,`${name}.png`)})
  shots.push({name,camera,target,fov})
 }
 materials=await page.evaluate(()=>{
  const receipts={roles:{},finishes:{},halos:0}
  window.__ship.traverse(node=>{
   if(node.name==='AquariumWarmHalo')receipts.halos++
   if(!node.isMesh||!(/Aquarium.*(?:Floor|ceiling|drape|curtain)/i.test(node.name)||node.material?.userData?.aquariumFinish))return
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    const role=material?.userData?.aquariumFinish
    if(role)receipts.roles[role]=(receipts.roles[role]??0)+1
    if(/^Sunny_Aquarium(?:Floor|_ceiling)/.test(node.name))receipts.finishes[node.name]={name:material.name,colour:material.color.getHexString(),details:material.userData}
   }
  })
  return receipts
 })
} finally {await browser.close()}
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({url,shots,errors,consoleErrors,materials,assets:{'sunny.glb':sha(visual),'ship-metadata.json':sha(metadata)},note:'Actual room renderer, inspection camera only. Separate normal-controller tests cover access.'},null,2)+'\n')
assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[])
if(layout){
 assert.equal(materials.halos,3,'The current runtime must apply the Aquarium sconce halos')
 assert(materials.roles.backdrop&&materials.roles.glass&&materials.roles.fish,'The current runtime must apply Aquarium shaders')
 assert(Object.values(materials.finishes).some(material=>material.details.aquariumOwned),'The current runtime must apply the moving floor light')
}
console.log('PASS Aquarium captures',shots.length)
