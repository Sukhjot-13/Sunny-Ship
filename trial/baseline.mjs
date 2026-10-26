/** Neutral current baseline render/rays, without hiding meshes or placing a player. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import puppeteer from 'puppeteer'
const url=process.env.SUNNY_BASE_URL||'http://localhost:8171/',out='trial/results/common-baseline'
fs.mkdirSync(out,{recursive:true})
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hashes={}
for(const name of ['sunny.glb','sunny-collision.glb','ship-metadata.json']){
 const local=sha(fs.readFileSync(`public/models/${name}`)),served=sha(Buffer.from(await(await fetch(new URL(`/models/${name}`,url))).arrayBuffer()))
 if(local!==served)throw Error('Wrong served workspace asset: '+name)
 hashes[name]={local,served}
}
const views=JSON.parse(fs.readFileSync('trial/original-evidence/whole-ship-audit-room-views.json')).samples.filter(v=>['mens','womens','storage','soldier-dock'].includes(v.name)).map(v=>[v.name,v.eye,v.target])
const supplemental=JSON.parse(fs.readFileSync('trial/original-evidence/whole-ship-audit-supplemental-views.json')).records
const three=p=>[p[0],p[2],-p[1]]
for(const row of supplemental.filter(v=>/^cannon-(men|women)-/.test(v.name)))views.push([row.name,three(row.eye),three(row.target)])
views.push(['dock-port-outside',[.495,-45.94,25],[.495,-45.94,10]],['dock-starboard-outside',[.495,-45.94,-25],[.495,-45.94,-10]])
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const errors=[],records=[]
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000});await page.mouse.click(720,450)
 await page.evaluate(async()=>{
  const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const s=window.__trialState=_roots.get(document.querySelector('canvas')).store.getState();s.controls.enabled=false
  s.scene.onBeforeRender=function cameraSurvey(_r,_s,c){if(c!==s.camera||!window.__trialPose)return;window.__ship.updateWorldMatrix(true,false);const m=window.__ship.matrixWorld,p=window.__trialPose;c.position.fromArray(p.eye).applyMatrix4(m);c.up.set(0,1,0).transformDirection(m);c.lookAt(c.position.clone().fromArray(p.target).applyMatrix4(m));c.updateMatrixWorld(true)}
 })
 for(const [name,eye,target] of views){
  await page.evaluate(p=>window.__trialPose=p,{eye,target});await new Promise(r=>setTimeout(r,1000))
  await page.screenshot({path:`${out}/${name}.png`});records.push({name,eye,target})
 }
 const rays=await page.evaluate(()=>{
  const s=window.__trialState,root=window.__ship,results=[];root.updateWorldMatrix(true,true)
  for(const side of ['port','starboard']){
   const port=side==='port',wall=root.getObjectByName(port?'Sunny_InteriorWall_B1_73_seg0':'Sunny_InteriorWall_B1_199_seg0')
   // Geometry-only lining probe, separately from rendered closed shutters.
   const o=s.camera.position.clone().set(.495,-45.94072,port?25:-25).applyMatrix4(root.matrixWorld),d=s.camera.position.clone().set(0,0,port?-1:1).transformDirection(root.matrixWorld)
   s.raycaster.set(o,d);results.push({side,hits:wall?s.raycaster.intersectObject(wall,true).map(h=>({name:h.object.name,distance:h.distance})):[],wallFound:!!wall})
  }return results
 })
 fs.writeFileSync(`${out}/receipt.json`,JSON.stringify({url,hashes,records,rays,errors,notice:'Current before images retain all geometry. Shutters remain CLOSED in these new outside views; old supplied open-shutter image is separately labeled original audit. Lining rays directly test actual original geometry; no player placement or current functional claim.'},null,2))
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS baseline render/shader/served hashes; lining obstructions reproduced:',JSON.stringify(rays))
}finally{await browser.close()}
