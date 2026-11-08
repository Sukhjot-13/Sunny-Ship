/** Stair routes derived from the actual exported tread geometry. */
const groups=[['aft port',b=>/^Box/.test(b.name)&&+b.name.slice(3).split('.')[0]>=8&&+b.name.slice(3).split('.')[0]<=28],['aft starboard',b=>/^Box/.test(b.name)&&+b.name.slice(3).split('.')[0]>=29&&+b.name.slice(3).split('.')[0]<=49],['fore upper',b=>/^Box/.test(b.name)&&+b.name.slice(3).split('.')[0]>=52&&+b.name.slice(3).split('.')[0]<=69],['fore lower starboard',b=>/^Box/.test(b.name)&&+b.name.slice(3).split('.')[0]>=85&&+b.name.slice(3).split('.')[0]<=103],['fore lower port',b=>/^Box/.test(b.name)&&+b.name.slice(3).split('.')[0]>=104&&+b.name.slice(3).split('.')[0]<=117],['garden port',b=>/^Sunny_GardenStair_tread/.test(b.name)&&!b.name.includes('.')],['garden starboard',b=>/^Sunny_GardenStair_tread/.test(b.name)&&b.name.includes('.')]];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
export function stairFlights(meshes) {
  return groups.map(([name,filter])=>({name, treads:meshes.filter(filter)
    .filter(t=>t.max.y-t.min.y<0.4).sort((a,b)=>a.max.y-b.max.y)
    .map(t=>[(t.min.x+t.max.x)/2,t.max.y,(t.min.z+t.max.z)/2])}))
}
export async function walkFlight(page,flight,{teleport=true,descending=false}={}) {
  const t=descending?[...flight.treads].reverse():flight.treads,first=t[0],last=t.at(-1)
  if(!first||!last) throw new Error(`Missing ${flight.name} treads`)
  const dir=Math.sign(last[0]-first[0])
  const start=[first[0]-dir*0.45,first[1]+0.02,first[2]]
  const end=[last[0]+dir*0.4,last[1],last[2]]
  if(teleport) await page.evaluate(s=>window.__sunny.teleport(...s),start)
  await sleep(400)
  const pre=await page.evaluate(()=>window.__sunny.position)
  await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'})))
  try {
    for(let i=0;i<65;i++) {
      const pos=await page.evaluate(()=>window.__sunny.position)
      const target=t.find(q=>dir*(q[0]-pos[0])>0.45)||end
      await page.evaluate(({pos,target})=>window.__sunny.look(Math.atan2(-(target[0]-pos[0]),-(target[2]-pos[2])),-0.03),{pos,target})
      if(dir*(pos[0]-end[0])>-0.2)break
      await sleep(100)
    }
  } finally {
    await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'})))
  }
  await sleep(250)
  const result=await page.evaluate(()=>({pos:window.__sunny.position,grounded:window.__sunny.grounded,blocker:window.__sunny.blocker}))
  return {start,pre,end,result,stable:Math.hypot(pre[0]-start[0],pre[2]-start[2])<0.65,
    climbed:dir*(result.pos[0]-last[0])>-0.3&&(descending?Math.abs(result.pos[1]-last[1])<0.35:result.pos[1]>last[1]-0.35)&&result.grounded}
}

/** Walk to a horizontal waypoint using the actual controller, stopping on stalls. */
export async function driveTo(page,target,tolerance=0.3) {
  let nearest=Infinity,stall=0,forward=false
  async function setForward(value){
    if(value===forward)return
    await page.evaluate(value=>window.dispatchEvent(new KeyboardEvent(value?'keydown':'keyup',{code:'KeyW'})),value)
    forward=value
  }
  try {
    for(let i=0;i<200;i++) {
      const pos=await page.evaluate(()=>window.__sunny.position)
      const distance=Math.hypot(target[0]-pos[0],target[2]-pos[2])
      if(distance<tolerance){
        await setForward(false);await sleep(150)
        const stopped=await page.evaluate(()=>window.__sunny.position)
        if(Math.hypot(target[0]-stopped[0],target[2]-stopped[2])<tolerance)return true
        continue
      }
      if(distance<nearest-Math.min(.08,tolerance*.5)){nearest=distance;stall=0}else stall++
      if(stall>25)return false
      // The real controller coasts after key-up. Brake before a precise turn
      // or ladder endpoint, then use ordinary short W pulses from rest.
      if(distance<.35&&forward){await setForward(false);await sleep(150);continue}
      await page.evaluate(({pos,target})=>window.__sunny.look(Math.atan2(-(target[0]-pos[0]),-(target[2]-pos[2])),-0.06),{pos,target})
      await setForward(true)
      if(distance<.35){
        await sleep(Math.min(28,Math.max(5,(distance-tolerance*.4)*120)))
        await setForward(false);await sleep(100)
      }else await sleep(distance<0.7?20:70)
    }
    return false
  } finally {
    await setForward(false)
    await sleep(150)
  }
}

/** Whole routes begin at spawn; no teleport/jump is used between landings. */
export async function walkJourney(page,meshes,kind,side,{returnToLawn=true,onCheckpoint,approachPath=null,firstFlightOnly=false}={}) {
  await page.evaluate(()=>window.__sunny.respawn())
  await sleep(400)
  const flights=stairFlights(meshes),trace=[]
  const base=kind==='garden'?`aft ${side}`:`fore lower ${side}`
  const first=flights.find(f=>f.name===base)
  const tread=first.treads[0],last=first.treads.at(-1),dir=Math.sign(last[0]-tread[0])
  const spawn=await page.evaluate(()=>window.__sunny.position)
  const recoveries=await page.evaluate(()=>window.__sunny.recoveries)
  const waypoint=async(label,point,tolerance=0.3)=>{
    const moved=await driveTo(page,point,tolerance)
    const state=await page.evaluate(()=>({pos:window.__sunny.position,grounded:window.__sunny.grounded,blocker:window.__sunny.blocker,recoveries:window.__sunny.recoveries}))
    const ok=moved&&state.grounded&&state.recoveries===recoveries
    trace.push({label,ok,...state})
    if(ok&&onCheckpoint)await onCheckpoint({label,...state})
    return ok
  }
  const climb=async(flight,descending=false)=>{
    const result=await walkFlight(page,flight,{teleport:false,descending})
    const recovery=await page.evaluate(()=>window.__sunny.recoveries)
    const ok=result.climbed&&recovery===recoveries
    const label=flight.name+(descending?' descent':'')
    trace.push({label,ok,recoveries:recovery,...result.result})
    if(ok&&onCheckpoint)await onCheckpoint({label,recoveries:recovery,...result.result})
    return ok
  }
  if(!approachPath&&kind==='garden'&&side==='starboard') {
    // Walk around the lawn dock hatch and its real rail, whose position does
    // not enlarge with the hull. The new spawn aligns with that obstruction.
    const hatch=meshes.find(m=>m.name.startsWith('Sunny_SoldierDockHatch_leaf'))
    const x=(hatch?.min.x??-7.1)-.8
    if(!await waypoint('around dock hatch',[x,spawn[1],spawn[2]]))return trace
    if(!await waypoint('clear hatch side',[x,spawn[1],tread[2]]))return trace
  }
  const approachX=kind==='garden'&&side==='starboard'?(meshes.find(m=>m.name.startsWith('Sunny_SoldierDockHatch_leaf'))?.min.x??-7.1)-.8:spawn[0]
  if(approachPath){
    for(const [i,p] of approachPath({spawn,tread}).entries())if(!await waypoint('lawn approach '+i,p))return trace
  }else if(!await waypoint('lawn approach',[approachX,spawn[1],tread[2]]))return trace
  if(!await waypoint('lower entrance',[tread[0]-dir*0.65,tread[1],tread[2]]))return trace
  if(!await climb(first))return trace
  if(firstFlightOnly){
    if(!await climb(first,true))return trace
    if(approachPath){
      for(const [i,p] of [...approachPath({spawn,tread})].reverse().entries())if(!await waypoint('return lawn approach '+i,p))return trace
    }else if(!await waypoint('return lawn approach',[approachX,spawn[1],tread[2]]))return trace
    await waypoint('back to lawn',spawn)
    return trace
  }
  const second=flights.find(f=>f.name===(kind==='garden'?`garden ${side}`:'fore upper'))
  const t=second.treads[0],end=second.treads.at(-1)
  if(kind==='helm') {
    const landing=meshes.find(m=>m.name==='Sunny_ForeLanding')
    const x=t[0]+0.55
    if(!await waypoint('cross landing',[x,last[1],last[2]]))return trace
    if(!await waypoint('upper entrance',[x,t[1],t[2]]))return trace
  }else if(!await waypoint('garden entrance',[t[0]-0.55,t[1],t[2]]))return trace
  if(!await climb(second))return trace
  if(kind==='garden') {
    const landing=meshes.find(m=>m.name===(side==='port'?'Sunny_GardenStair_upperLanding':'Sunny_GardenStair_upperLanding.001'))
    const x=(landing.min.x+landing.max.x)/2,z=(landing.min.z+landing.max.z)/2
    if(!await waypoint('inward landing',[x,end[1],end[2]]))return trace
    if(!await waypoint('garden exit',[x,end[1],z]))return trace
    await waypoint('garden deck',[x,end[1],z+(side==='port'?-1:1)*1.6])
  }else {
    const helm=meshes.find(m=>m.name==='Sunny_Helm_pedestal')
    const x=(helm.min.x+helm.max.x)/2+0.81,z=(helm.min.z+helm.max.z)/2+1.0
    if(!await waypoint('mast bypass',[end[0]-1.9,end[1],-4.5]))return trace
    if(!await waypoint('forward helm approach',[x,helm.min.y,-4.5],0.04))return trace
    await waypoint('helm deck',[x,helm.min.y,z])
  }
  if(trace.some(t=>!t.ok))return trace
  if(!returnToLawn)return trace
  // Return over the same connections: descending and leaving a staircase must
  // also work without jumping, respawning, or crossing a side handrail.
  if(kind==='garden') {
    const landing=meshes.find(m=>m.name===(side==='port'?'Sunny_GardenStair_upperLanding':'Sunny_GardenStair_upperLanding.001'))
    const x=(landing.min.x+landing.max.x)/2
    if(!await waypoint('return upper landing',[x,end[1],end[2]]))return trace
    if(!await climb(second,true))return trace
    if(!await waypoint('return dining deck',[last[0]+0.55,last[1],last[2]]))return trace
  }else {
    const helm=meshes.find(m=>m.name==='Sunny_Helm_pedestal')
    const x=(helm.min.x+helm.max.x)/2+0.81
    if(!await waypoint('return mast bypass',[x,helm.min.y,-4.5]))return trace
    if(!await waypoint('return upper exit',[end[0]-1.9,end[1],-4.5]))return trace
    if(!await waypoint('return upper stairs',[end[0]-0.55,end[1],end[2]]))return trace
    if(!await climb(second,true))return trace
    if(!await waypoint('return lower landing',[t[0]+0.55,last[1],last[2]]))return trace
  }
  if(!await climb(first,true))return trace
  if(approachPath){
    for(const [i,p] of [...approachPath({spawn,tread})].reverse().entries())if(!await waypoint('return lawn approach '+i,p))return trace
  }else{
    if(!await waypoint('return lawn approach',[approachX,spawn[1],tread[2]]))return trace
    if(kind==='garden'&&side==='starboard'&&!await waypoint('return around hatch',[approachX,spawn[1],spawn[2]]))return trace
  }
  await waypoint('back to lawn',spawn)
  return trace
}
