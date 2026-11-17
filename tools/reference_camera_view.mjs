/** Render the actual unchanged ship at independently fitted source cameras. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer'
const [out,...files]=process.argv.slice(2);assert(out&&files.length)
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
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(fit.models,'sunny.glb'))).digest('hex'),fit.modelSha256)
  await page.setViewport({width:fit.width,height:fit.height})
  await page.evaluate(({position,target,fov,roll})=>{
   const s=window.__cameraStudy;s.controls.enabled=false;s.camera.fov=fov;s.camera.up.set(0,1,0)
   s.camera.position.set(...position);s.camera.lookAt(...target);s.camera.rotateZ(roll);s.camera.updateProjectionMatrix();s.camera.updateMatrixWorld()
  },{position,target,fov,roll})
  await new Promise(r=>setTimeout(r,500))
  const name=path.basename(file,'.json')+'.png';await page.screenshot({path:path.join(out,name)})
  receipts.push({file,name,source:fit.source,modelSha256:fit.modelSha256,weightedHullFit:fit.weightedScore,parameters:fit.parameters})
 }
 fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({url,receipts,errors,note:'Actual renderer camera only. No hidden meshes or body placement. Camera-fit uncertainty and differing source sail states remain disclosed; this is diagnostic appearance evidence, not accepted geometry.'},null,2)+'\n')
 assert.deepEqual(errors,[]);console.log('PASS',receipts.length,'actual fitted-camera diagnostic views')
}finally{await browser.close()}
