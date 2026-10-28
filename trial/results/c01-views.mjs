/** Matched baseline/candidate render comparison; only camera placement, no geometry changes. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import puppeteer from 'puppeteer'
const url=process.env.SUNNY_BASE_URL||'http://localhost:8171/',out='trial/results/c01-views'
fs.mkdirSync(out,{recursive:true})
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hashes={}
for(const name of ['sunny.glb','sunny-collision.glb','ship-metadata.json']){
 const local=sha(fs.readFileSync(`public/models/${name}`)),served=sha(Buffer.from(await(await fetch(new URL(`/models/${name}`,url))).arrayBuffer()))
 if(local!==served)throw Error('Wrong served workspace asset: '+name)
 hashes[name]={local,served}
}
const views=JSON.parse(fs.readFileSync('trial/original-evidence/whole-ship-audit-room-views.json')).samples.filter(v=>['mens','womens','storage'].includes(v.name)).map(v=>[v.name,v.eye,v.target])
const supplemental=JSON.parse(fs.readFileSync('trial/original-evidence/whole-ship-audit-supplemental-views.json')).records
const three=p=>[p[0],p[2],-p[1]]
for(const row of supplemental.filter(v=>/^cannon-(men|women)-/.test(v.name)))views.push([row.name,three(row.eye),three(row.target)])
views.push(['exterior-bow-port',[-92,-8,88],[-18,-22,0]],['exterior-bow-starboard',[-92,-8,-88],[-18,-22,0]],['exterior-profile',[0,-5,125],[0,-20,0]])
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
const errors=[],records=[]
try{
 for(const phase of ['before','after']){
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 page.on('pageerror',e=>errors.push({phase,error:e.message}));page.on('console',m=>{if(m.type()==='error')errors.push({phase,error:m.text()})})
 if(phase==='before'){
 await page.setRequestInterception(true)
 page.on('request',request=>{const name=new URL(request.url()).pathname.split('/').pop(),files={'sunny.glb':'before-sunny.glb','sunny-collision.glb':'before-collision.glb','ship-metadata.json':'before-metadata.json'};if(files[name])request.respond({status:200,contentType:name.endsWith('.json')?'application/json':'model/gltf-binary',body:fs.readFileSync('trial/results/'+files[name])});else request.continue()})
 }
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000});await page.mouse.click(720,450)
 await page.evaluate(async()=>{
  const {_roots}=await import('/.vite-cache/deps/@react-three_fiber.js');const s=window.__trialState=_roots.get(document.querySelector('canvas')).store.getState();s.controls.enabled=false
  s.scene.onBeforeRender=function cameraSurvey(_r,_s,c){if(c!==s.camera||!window.__trialPose)return;window.__ship.updateWorldMatrix(true,false);const m=window.__ship.matrixWorld,p=window.__trialPose;c.position.fromArray(p.eye).applyMatrix4(m);c.up.set(0,1,0).transformDirection(m);c.lookAt(c.position.clone().fromArray(p.target).applyMatrix4(m));c.updateMatrixWorld(true)}
 })
 for(const [name,eye,target] of views){await page.evaluate(p=>window.__trialPose=p,{eye,target});await new Promise(r=>setTimeout(r,800));await page.screenshot({path:`${out}/${phase}-${name}.png`});records.push({phase,name,eye,target})}
 await page.close()
 }
 fs.writeFileSync(`${out}/receipt.json`,JSON.stringify({url,hashes,records,errors,before:'Saved unmodified GLBs/metadata served by explicit browser interception; actual candidate HTTP assets hash-verified before loading after views.',notice:'Camera inspection only. No geometry or materials hidden. Ordinary body journeys are separate.'},null,2))
 if(errors.length)throw Error(JSON.stringify(errors));console.log('PASS matched before/after images, served hashes, zero runtime/shader errors')
}finally{await browser.close()}
