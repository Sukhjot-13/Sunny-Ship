/** Render the actual unchanged ship at independently fitted source cameras. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
import {loadColliders} from '../tests/glb.mjs'
const [out,...files]=process.argv.slice(2);assert(out&&files.length)
const yardAngles=process.env.REFERENCE_YARD_ANGLES?.split(',').map(Number)??[0]
assert(yardAngles.length&&yardAngles.every(angle=>Number.isFinite(angle)&&Math.abs(angle)<=90))
fs.mkdirSync(out,{recursive:true})
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
 const url=process.env.REFERENCE_URL??'http://localhost:5173'
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 const viewport=page.viewport();await page.mouse.click(viewport.width/2,viewport.height/2)
 await page.waitForFunction(()=>!document.body.innerText.includes('Click to Explore'),{timeout:10000})
 await page.evaluate(async()=>{
  const moduleURL=performance.getEntriesByType('resource').map(e=>e.name).find(url=>url.includes('/deps/@react-three_fiber.js'))
  const {_roots}=await import(moduleURL);window.__cameraStudy=_roots.get(document.querySelector('canvas')).store.getState()
  window.__cameraStudy.controls.enabled=false
 })
 const receipts=[]
 for(const file of files){
  const fit=JSON.parse(fs.readFileSync(file)),{position,target,fov,roll}=fit.parameters
  const model=path.join(fit.models,'sunny.glb')
  const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex')
  assert.equal(digest(fs.readFileSync(model)),fit.modelSha256)
  const response=await fetch(new URL('/models/sunny.glb',url))
  assert(response.ok);assert.equal(digest(Buffer.from(await response.arrayBuffer())),fit.modelSha256)
  const geometry=loadColliders(model)
  const assemblies=[['Cylinder003','Cylinder004','Plane004'],['Cylinder007','Cylinder010','Plane005']].map(([mast,yard,sail])=>{
   const bounds=geometry.find(box=>box.name===mast)
   const yardBounds=geometry.find(box=>box.name===yard)
   const pivot=bounds.min.clone().lerp(bounds.max,.5);pivot.y=(yardBounds.min.y+yardBounds.max.y)/2
   return {pivot:pivot.toArray(),names:[yard,sail,...Array.from({length:13},(_,index)=>`Sunny_SailTie_${sail}${index}`)]}
  })
  await page.setViewport({width:fit.width,height:fit.height})
  await page.evaluate(({position,target,fov,roll})=>{
   const s=window.__cameraStudy;s.controls.enabled=false;s.camera.fov=fov;s.camera.up.set(0,1,0)
   s.camera.position.set(...position);s.camera.lookAt(...target);s.camera.rotateZ(roll);s.camera.updateProjectionMatrix();s.camera.updateMatrixWorld()
  },{position,target,fov,roll})
  for(const degrees of yardAngles){
   await page.evaluate(({degrees,assemblies})=>{
    const ship=window.__ship
    ship.updateMatrixWorld(true)
    const before=window.__yardStudyOriginals??=new Map()
    for(const {pivot,names} of assemblies) for(const name of names){
     const object=ship.getObjectByName(name)
     if(!object)throw Error(`Missing study assembly mesh: ${name}`)
     if(!before.has(object))before.set(object,object.matrixWorld.clone())
     const world=before.get(object).clone()
     const rotation=world.clone().makeRotationY(degrees*Math.PI/180)
     const centre=object.position.clone().set(...pivot)
     const translated=centre.clone().sub(centre.clone().applyMatrix4(rotation))
     rotation.setPosition(translated)
     object.parent.matrixWorld.clone().invert().multiply(rotation).multiply(world)
      .decompose(object.position,object.quaternion,object.scale)
     object.updateMatrixWorld(true)
    }
   },{degrees,assemblies})
   await new Promise(r=>setTimeout(r,500))
   const name=path.basename(file,'.json')+(yardAngles.length>1||degrees?`-yaw-${degrees}`:'')+'.png'
   await page.screenshot({path:path.join(out,name)})
   receipts.push({file,name,source:fit.source,modelSha256:fit.modelSha256,weightedHullFit:fit.weightedScore,parameters:fit.parameters,degrees,assemblies})
  }
 }
 fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({url,receipts,errors,note:'Actual renderer; optional temporary rotation of square yards, sails and lashings. Attached mast ropes and collision were not refit. No hidden meshes or body placement. Camera and pose variations are diagnostic only; no assets are edited.'},null,2)+'\n')
 assert.deepEqual(errors,[]);console.log('PASS',receipts.length,'actual fitted-camera diagnostic views')
}finally{await browser.close()}
