/** Full reference ladder journey using real E/W/S and the unchanged controller. */
import assert from 'node:assert/strict'
import {pointAt,CLIMB_SPEED} from '../src/systems/climbing.js'
import {EYE_HEIGHT_M} from '../src/config/shipConfig.js'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))

export async function ladderJourney(page,path,{descending=false,trace=[],closedStop=false,capture=true}={}){
 const start=pointAt(path,descending?path.length:0),end=pointAt(path,descending?0:path.length),floor=path.points.at(-1)[1]
 const read=()=>page.evaluate(id=>({p:window.__sunny.position,c:window.__sunny.climbing,g:window.__sunny.grounded,
  r:window.__sunny.recoveries,h:window.__sunnyDoors.state[id],near:window.__sunnyDoors.near,t:performance.now()}),path.hatch)
 const before=await read()
 assert(before.g&&before.r===0,'ladder begins with supported walking and no recovery')
 assert(Math.hypot(...before.p.map((v,i)=>v-start[i]))<.20,'ladder endpoint must be reached physically')
 await page.keyboard.press('e');await sleep(100)
 const attached=await read()
 assert.equal(attached.c?.id,path.id,'E attaches only the reached ladder')
 assert(Math.hypot(...attached.p.map((v,i)=>v-before.p[i]))<.20,'attachment cannot place the player')
 /** One real hatch interaction, from a reachable body-clear stance. */
 const toggle=async(open)=>{
  const state=await read()
  assert.equal(state.near?.id,path.hatch,'actual hatch must be reachable before E')
  // Door HUD updates before the moving player each frame. Wait for the real
  // opening prompt at this stopped pose before pressing its interaction key.
  const prompt='E · '+(state.near.open?'Close':'Open')+' '+state.near.label
  await page.waitForFunction(prompt=>document.body.innerText.includes(prompt),{timeout:2000},prompt)
  await page.keyboard.press('e')
  try{await page.waitForFunction(({id,open})=>open?window.__sunnyDoors.state[id].openness>.95:window.__sunnyDoors.state[id].openness<.05,{timeout:5000},{id:path.hatch,open})}
  catch(e){trace.push({label:path.id+' hatch interaction failed',...await read()});throw e}
  trace.push({label:path.id+(open?' E open':' E close'),...await read()})
 }
 if(descending){
  // A hinged lid must open from beside its hole; opening beneath supported
  // feet would lift through the body and correctly remains blocked.
  if((await read()).h.latched)await toggle(false)
  await toggle(true)
 }
 const key=descending?'s':'w',deadline=Date.now()+30000
 let previous=await read(),stall=0,checked=false,shut=!previous.h.latched,screenshot=false
 await page.keyboard.down(key)
 try{
  while(Date.now()<deadline){
   await sleep(75);let s=await read()
   const delta=Math.hypot(...s.p.map((v,i)=>v-previous.p[i])),elapsed=(s.t-previous.t)/1000
   assert(s.r===0,'ladder journey cannot recover')
   assert(delta<=CLIMB_SPEED*elapsed+.08,'ladder movement exceeds human speed')
   trace.push({label:path.id+(descending?' descent':' ascent'),...s})
   if(!s.c){
    assert(s.g&&Math.hypot(...s.p.map((v,i)=>v-end[i]))<.14,'ladder arrival needs real endpoint footing')
    if(closedStop)assert(checked,'ascent must prove the shut lid stops the full human body')
    console.log('PASS',path.label,descending?'complete descent':'complete ascent',s.p)
    return s
   }
   // If previously opened by another journey, shut it from below while the
   // head is still clear, then prove the real solid stops upward movement.
   if(closedStop&&!descending&&!shut&&s.near?.id===path.hatch){
    await page.keyboard.up(key);await toggle(false);shut=true
    previous=await read();await page.keyboard.down(key);continue
   }
   stall=delta<.003?stall+1:0
   if(!descending&&shut&&!checked&&stall>=3&&s.near?.id===path.hatch){
    assert(s.p[1]<floor-1.70,'closed hatch must stop a full-height human below the lid')
    if(capture){
     const target=[path.points[1][0]-.10,floor+.04,path.points[1][2]]
     await page.evaluate(({t,eye})=>{const p=window.__sunny.position,dx=t[0]-p[0],dz=t[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(t[1]-p[1]-eye,Math.hypot(dx,dz)))},{t:target,eye:EYE_HEIGHT_M})
     await page.screenshot({path:'docs/review/walk-'+path.id+'-closed-hatch.png'})
    }
    checked=true;await page.keyboard.up(key);await toggle(true)
    previous=await read();stall=0;await page.keyboard.down(key);continue
   }
   if(capture&&!screenshot&&s.p[1]>path.points[0][1]+.60&&s.p[1]<floor-.60){
    const target=pointAt(path,s.c.progress+(descending?-.8:3.0));target[0]-=.48
    await page.evaluate(({target,eye})=>{const p=window.__sunny.position,dx=target[0]-p[0],dz=target[2]-p[2];window.__sunny.look(Math.atan2(-dx,-dz),Math.atan2(target[1]-p[1]-eye,Math.hypot(dx,dz)))},{target,eye:EYE_HEIGHT_M})
    await page.screenshot({path:'docs/review/walk-'+path.id+(descending?'-descent':'-ascent')+'.png'});screenshot=true
   }
   assert(stall<24,'ladder stalled at '+JSON.stringify(s));previous=s
  }
  throw Error(path.label+' journey timed out')
 }finally{await page.keyboard.up(key)}
}
