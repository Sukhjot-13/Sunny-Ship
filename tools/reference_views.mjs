/** Framed exterior review from the actual running renderer; no player placement. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import puppeteer from 'puppeteer'
import {loadColliders} from '../tests/glb.mjs'
const phase=process.argv[2]??'candidate',out=path.join('docs/review/2026-11-16',phase)
fs.mkdirSync(out,{recursive:true})
const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json')),bounds=loadColliders('public/models/sunny.glb')
const cy=-meta.interiors.dockCentre[1],lawn=meta.interiors.levels.F1,garden=meta.interiors.levels.F3G
const centre=name=>{const o=bounds.find(o=>o.name===name);if(!o)throw Error('Missing view target '+name);return o.min.clone().add(o.max).multiplyScalar(.5).toArray()}
const offset=(p,d)=>p.map((v,i)=>v+d[i])
const head=centre('Sphere001'),wheel=centre('Sunny_Helm_wheel'),lookout=centre('Cylinder006')
const views=[
 ['bow-front',offset(head,[-25,1,0]),head,'R01/R02/R08'],
 ['bow-port',offset(head,[-17,3,22]),head,'R01/R02/R08'],
 ['bow-starboard',offset(head,[-17,3,-22]),head,'R01/R02/R08'],
 ['port-quarter',[-88,-6,82],[0,-16,cy],'R01/R02/R03'],
 ['starboard-quarter',[-88,-6,-82],[0,-16,cy],'R01/R02/R03'],
 ['stern-quarter',[75,-6,-65],[8,-24,cy],'R01/R02/R13'],
 ['port-side',[0,-4,126],[0,-4,cy],'R01/R02/R03'],
 ['starboard-side',[0,-4,-126],[0,-4,cy],'R01/R02/R03'],
 ['stern',[76,-28,cy],[25,-31,cy],'R01/R02/R13'],
 ['lookout',offset(lookout,[-17,6,17]),lookout,'R01/R02/R13'],
 ['helm',offset(wheel,[5,1.8,3]),wheel,'R08'],
 ['lawn',[-15,lawn+8,14],[1,lawn+1,cy],'R04/R09/R13'],
 ['fore-facade',[0,lawn+3,cy],[-19,lawn+2,cy],'R04/R09'],
 ['aft-facade',[-3,lawn+9,cy],[15,lawn+5,cy],'R04/R10/R11/R13'],
 ['garden',[17,garden+8,16],[23,garden+.3,cy],'R04/R13/R15'],
 ['mikan',[18,garden+3,10],[22,garden+1,4],'R13/R15'],
 ['slide',[0,lawn+5,-22],[6,lawn+3,-12.5],'R04/R13'],
 ['swing',[-2,lawn+4,18],[6,lawn+2,10],'R04/R13'],
]
const dockHatch=meta.interiors.doors.find(d=>d.id==='DockLadderHatch')
if(dockHatch){
 const [hx,hy,hz]=dockHatch.pos
 views.push(['lawn-hatch',[hx+2.4,hz+2.1,-hy+1.3],[hx,hz,-hy],'R04/R14'])
 views.push(['restored-lawn',[-4.5,lawn+2.2,-5],[-3.5,lawn,-8.8],'R04/R14'])
}
for(const id of ['ForeDoor','WomensDoor','AquariumDoor','DiningEntrance','KitchenEntrance','LibraryDoor']){
 const spec=meta.interiors.doors.find(d=>d.id===id),[x,y,z]=spec.pos,normal=[-Math.sin(spec.rot),0,-Math.cos(spec.rot)]
 const target=[x,z+1.2,-y],fore=['ForeDoor','WomensDoor'].includes(id),close=['DiningEntrance','KitchenEntrance'].includes(id)
 const distance=close?1.25:3.6
 views.push(['door-'+id,offset(target,normal.map(v=>v*distance*(fore?-1:1))),target,'R09/R10/R11/R12/R13',close?92:62])
}
const browser=await puppeteer.launch({headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-unsafe-swiftshader','--enable-webgl']})
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:900})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://localhost:5173',{waitUntil:'domcontentloaded',timeout:120000})
 await page.waitForFunction(()=>window.__ship&&!document.body.innerText.includes('Loading the ship'),{timeout:120000})
 await page.mouse.click(720,450)
 await page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');window.__review=_roots.get(document.querySelector('canvas')).store.getState();window.__review.controls.enabled=false})
 const shots=[]
 for(const [name,p,t,reference,fov=62] of views){
  await page.evaluate(({p,t,fov})=>{const s=window.__review;s.camera.fov=fov;s.camera.updateProjectionMatrix();s.controls.enabled=false;s.camera.up.set(0,1,0);s.camera.position.set(...p);s.camera.lookAt(...t);s.camera.updateMatrixWorld()}, {p,t,fov})
  await new Promise(r=>setTimeout(r,350));await page.screenshot({path:path.join(out,name+'.png')})
  shots.push({name,camera:p,target:t,reference})
 }
 const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
 const context=await page.evaluate(()=>({drawCalls:window.__review.gl.info.render.calls,triangles:window.__review.gl.info.render.triangles}))
 fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({phase,shots,context,errors,
  assets:Object.fromEntries(['sunny.glb','sunny-collision.glb','ship-metadata.json'].map(f=>[f,sha('public/models/'+f)])),
  note:'Appearance survey only. Main camera moves; no mesh hiding, player placement or movement-proof claim.'},null,2))
 if(errors.length)throw Error(errors.join('\n'))
 console.log('PASS',shots.length,'framed actual exterior views',out)
}finally{await browser.close()}
