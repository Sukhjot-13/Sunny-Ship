/** Matched SBS interior views: appearance evidence, separate from walking proof. */
import fs from 'node:fs'
import puppeteer from 'puppeteer'
import {loadColliders} from '../tests/glb.mjs'
const phase=process.argv[2]??'interior',out='docs/review'
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json','utf8'))
const cy=.585*meta.exterior.experienceScale,L=meta.interiors.levels
const room=name=>meta.interiors.rooms.find(r=>r.name===name)
const centre=name=>{const r=room(name);return [(r.x[0]+r.x[1])/2,(r.y[0]+r.y[1])/2]}
const lib=centre('Library')[0],men=centre("Men's Quarters")[0],women=centre("Women's Quarters")[0]
const views=[
 ['mens', [men+3,cy+3,L.F1+1.70],[men-3,cy-2,L.F1+1.05]],
 ['womens',[women+2.6,cy-3.0,L.F2F+1.70],[women-1.5,cy+2.5,L.F2F+1.05]],
 ['aquarium',[11.5,cy+4.0,L.F1+1.70],[18.0,cy,L.F1+1.60]],
 ['aquarium-service',[23.2,cy-7.5,L.F1+1.70],[23.2,cy+7.5,L.F1+2.00]],
 ['dining',[13.1,cy-1.5,L.F2A+1.70],[18.0,cy-6.3,L.F2A+1.30]],
 ['kitchen',[13.1,cy+4.2,L.F2A+1.70],[18.0,cy+8.5,L.F2A+1.15]],
 ['pantry',[22.0,cy+5.0,L.F2A+1.70],[24.0,cy+7.0,L.F2A+1.15]],
 ['infirmary',[21.4,cy-5.3,L.F2A+1.70],[23.6,cy-8.2,L.F2A+1.25]],
 ['library',[lib-3.9,cy,L.F3L+1.70],[lib+2.8,cy,L.F3L+1.10]],
 ['bath',[lib-.5,cy+.5,L.F3B+1.70],[lib-.5,cy-3.0,L.F3B+.85]],
 ['bath-washroom',[lib-.5,cy+3.1,L.F3B+1.70],[lib+2.8,cy+3.2,L.F3B+1.10]],
 ['factory',[10.0,-4.8,L.B1+1.70],[17.0,-7.8,L.B1+1.1]],
 ['weapons',[10.0,7.0,L.B1+1.70],[17.0,9.0,L.B1+1.1]],
 ['energy',[21.0,cy,L.B1+1.70],[23.15,8.2,L.B1+1.55]],
 ['soldier-dock',[7.2,cy-6.7,L.B1+1.70],[-1.5,cy,L.B1+1.2]],
 ['storage',[-15.0,cy,L.B1+1.70],[-23.0,-4,L.B1+.85]],
]
for(const [name,label] of [["Men's Washroom",'mens-washroom'],["Women's Washroom",'womens-washroom'],
 ['Bath Toilet','bath-toilet'],['Men Starboard Cannon Closet','mens-starboard-cannon'],
 ['Men Port Cannon Closet','mens-port-cannon'],['Women Starboard Cannon Closet','womens-starboard-cannon'],
 ['Women Port Cannon Closet','womens-port-cannon']]){
 const r=room(name),[x,y]=centre(name),z=L[r.level]
 views.push([label,[x-.45,y-.35,z+1.70],[x+.55,y+.35,z+1.15]])
}
const lookout=loadColliders('public/models/sunny.glb').find(o=>o.name==='Sunny_Lookout_floor')
const lx=(lookout.min.x+lookout.max.x)/2,ly=-(lookout.min.z+lookout.max.z)/2
views.push(['lookout',[lx+.5,ly-.7,L.F3C+1.70],[lx-1.2,ly+.7,L.F3C+1.10]])
const toThree=p=>[p[0],p[2],-p[1]]
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.goto((process.env.SUNNY_BASE_URL || 'http://localhost:5173/'),{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450)
 await page.evaluate(async()=>{
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js')
  const s=window.__roomAudit=_roots.get(document.querySelector('canvas')).store.getState()
  s.controls.enabled=false
  // Ship uses real Inspect bobbing each frame. Follow its actual transform at
  // render time, rather than claiming a one-time parent reset freezes it.
  s.scene.onBeforeRender=function placeAuditCamera(_renderer,_scene,camera){
   if(!window.__roomPose)return
   window.__ship.updateWorldMatrix(true,false)
   const matrix=window.__ship.matrixWorld,{eye,target}=window.__roomPose
   camera.position.fromArray(eye).applyMatrix4(matrix)
   camera.up.set(0,1,0).transformDirection(matrix)
   camera.lookAt(camera.position.clone().fromArray(target).applyMatrix4(matrix))
   camera.updateMatrixWorld(true)
  }
 })
 const samples=[]
 for(const [name,p,target] of views){
  await page.evaluate(pose=>{window.__roomPose=pose;window.__roomAudit.controls.enabled=false}, {eye:toThree(p),target:toThree(target)})
  await new Promise(r=>setTimeout(r,220))
  const actual=await page.evaluate(()=>{
   const s=window.__roomAudit
   s.raycaster.setFromCamera({x:0,y:0},s.camera)
   const hit=s.raycaster.intersectObject(window.__ship,true).find(h=>{
    const materials=Array.isArray(h.object.material)?h.object.material:[h.object.material]
    return materials.some(m=>!m.transparent||m.opacity>.8)
   })
   return {worldEye:s.camera.position.toArray(),direction:s.camera.getWorldDirection(s.camera.position.clone()).toArray(),firstOpaque:hit?{name:hit.object.name,distance:hit.distance}:null}
  })
  await page.screenshot({path:`${out}/${phase}-${name}.png`})
  samples.push({name,eye:toThree(p),target:toThree(target),...actual})
 }
 const context=await page.evaluate(()=>{const s=window.__roomAudit;return{drawCalls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles,viewport:[innerWidth,innerHeight]}})
 fs.writeFileSync(`${out}/${phase}-views.json`,JSON.stringify({samples,context,errors,notice:'Matched human-eye Inspect camera appearance views; not walking or contact proof'},null,2))
 if(errors.length)throw Error(errors.join('\n'))
 console.log(`PASS ${samples.length} matched interior appearance captures`,context)
}finally{await browser.close()}
