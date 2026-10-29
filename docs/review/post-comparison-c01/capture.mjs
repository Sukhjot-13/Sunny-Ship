/** Matched C01 scope-only appearance capture, retaining meshes/materials/physics. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import puppeteer from 'puppeteer'
const url=process.argv[2]||'http://127.0.0.1:8180/',label=process.argv[3]||'after',out='docs/review/post-comparison-c01'
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hashes={},records=[],errors=[]
for(const n of ['sunny.glb','sunny-collision.glb','ship-metadata.json']){const local=sha(fs.readFileSync(`public/models/${n}`)),served=sha(Buffer.from(await(await fetch(new URL(`/models/${n}`,url))).arrayBuffer()));if(local!==served)throw Error('wrong served model '+n);hashes[n]={local,served}}
const views=JSON.parse(fs.readFileSync('docs/review/model-comparison-20261026/sol/views/receipt.json')).records.filter(r=>r.phase==='before')
views.push({name:'storage-upper-port',eye:[-19,-45.451,8],target:[-19,-40.9,14]}, {name:'storage-upper-starboard',eye:[-19,-45.451,-9],target:[-19,-40.9,-16]}, {name:'storage-low-port',eye:[-25,-45.451,5],target:[-25,-46.65,10.6]}, {name:'storage-low-starboard',eye:[-25,-45.451,-6],target:[-25,-46.65,-13]})
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000});await page.mouse.click(720,450)
 await page.evaluate(async()=>{
  const {_roots}=await import('/.vite-repair-cache/deps/@react-three_fiber.js');const s=window.__c01State=_roots.get(document.querySelector('canvas')).store.getState();s.controls.enabled=false
  s.scene.onBeforeRender=function followShip(_r,_s,c){if(c!==s.camera||!window.__c01Pose)return;window.__ship.updateWorldMatrix(true,false);const m=window.__ship.matrixWorld,p=window.__c01Pose;c.position.fromArray(p.eye).applyMatrix4(m);c.up.set(0,1,0).transformDirection(m);c.lookAt(c.position.clone().fromArray(p.target).applyMatrix4(m));c.updateMatrixWorld(true)}
 })
 for(const v of views){await page.evaluate(p=>window.__c01Pose=p,v);await new Promise(r=>setTimeout(r,500));const path=`${out}/${label}-${v.name}.png`;await page.screenshot({path});records.push({...v,path})}
 fs.writeFileSync(`${out}/${label}-views.json`,JSON.stringify({notice:'Appearance only; all real geometry/finishes retained. No player placement or access claim.',url,hashes,records,errors},null,2));if(errors.length)throw Error(errors.join('\n'));console.log('PASS C01 scoped captures',records.length)
}finally{await browser.close()}
