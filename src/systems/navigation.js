/** Navigation is simulated; collision queries remain in ship coordinates. */
export const CHANNELS=['Shiro Mokuba I','Mini Merry II','Shark Submerge III','Kurosai FR-U IV','Brachio Tank V','Inflatable Pool']
export const LOG_BEARINGS=[35,145,285]
export const COLA={capacity:30,perSecond:5}
const burstCharge=.68,burstFlight=6.1,burstLanding=1.55
export const BURST={
 charge:burstCharge,flight:burstFlight,landing:burstLanding,
 seconds:burstCharge+burstFlight+burstLanding,height:102,range:1000,cost:3,
}
export const GAON={seconds:2.5,cost:.5}
const initial=()=>({heading:270,throttle:0,speed:0,east:0,south:0,helm:false,channel:1,dockGateChannel:1,dockOpen:false,shutter:0,dockAngle:0,logNeedle:0,cola:COLA.capacity,burst:0,lift:0,pitch:0,wheel:0,chicken:false,maneAngle:0,jawOpen:false,jaw:0,gaon:0,paddleAngle:0,foodLift:0,foodLiftTarget:0})
export const voyage=initial()
const RAD=Math.PI/180
export function resetVoyage(){Object.assign(voyage,initial())}
export function shipYaw(){return (270-voyage.heading)*RAD}
export function channelName(channel){return channel===0?'Paddles':CHANNELS[channel-1]}
export function channelAngle(channel){return -(Math.max(1,channel)-1)*Math.PI/3}
export function selectDockChannel(channel){
 if(channel!==voyage.channel){voyage.channel=channel;voyage.dockOpen=false}
 return `Channel ${channel}: ${channelName(channel)}`
}
export function toggleDockShutters(){
 voyage.dockOpen=!voyage.dockOpen
 return voyage.dockOpen?'Soldier Dock: align, then roll shutters open':'Soldier Dock: close shutters'
}
const clamp01=t=>Math.max(0,Math.min(1,t))
const ease=t=>{t=clamp01(t);return t*t*(3-2*t)}

/** One ship-local trajectory for the hull, camera and effects. */
export function sampleBurst(age){
 if(age<BURST.charge){
  const load=ease(age/BURST.charge)
  return {phase:'charging',distance:0,lift:0,pitch:-.13*load}
 }
 const t=(age-BURST.charge)/BURST.flight
 if(t<1){
  const apex=.44
  const slope=(t-apex)/(t<apex?apex:1-apex)
  const pitch=-.13-.24*ease(t/.12)+.33*ease((t-.12)/.39)+.18*ease((t-.51)/.39)
  const distance=BURST.range*(t+.23*Math.sin(Math.PI*t)/Math.PI)
  return {phase:'airborne',distance,lift:BURST.height*(1-slope*slope),pitch}
 }
 const landing=clamp01((age-BURST.charge-BURST.flight)/BURST.landing)
 const decay=(1-landing)**2
 return {phase:landing<1?'landing':'idle',
  distance:BURST.range+32*BURST.landing*(1-(1-landing)**3)/3,
  lift:-2.5*Math.sin(landing*2*Math.PI)*decay,
  pitch:.14*Math.cos(landing*3*Math.PI)*decay}
}

export function burstStatus(state=voyage){
 if(state.burst>0)return sampleBurst(BURST.seconds-state.burst).phase
 return 'idle'
}

export function burstAvailability(state=voyage){
 const phase=burstStatus(state)
 const reason=phase==='charging'?'Cola pressure building…':phase==='airborne'?'Coup de Burst airborne':
  phase==='landing'?'Coup de Burst splashdown':state.gaon>0?'Wait for the Gaon blast to clear.':
  state.cola<BURST.cost?'Coup de Burst needs three cola barrels.':''
 return {phase,canFire:!reason,reason}
}
/** Shared readiness for the visible panel and keyboard mechanism actions. */
export function cannonAvailability(state=voyage){
 const shots=Math.floor(state.cola/GAON.cost)
 const reason=state.burst>0?'Wait for Coup de Burst to land.':shots===0?'Cola refilling…':''
 return {canFire:!reason,reason,shots}
}
/** Operate the existing real cannon from either user interface. */
export function operateCannon(action){
 if(action==='toggle-mouth'){
  voyage.jawOpen=!voyage.jawOpen
  return {ok:true,message:voyage.jawOpen?'Gaon mouth opening':'Gaon mouth closing'}
 }
 if(action==='fire'){
  if(!fireGaon())return {ok:false,message:cannonAvailability().reason}
  return {ok:true,message:'Gaon air blast · half a barrel spent · reverse recoil'}
 }
 return {ok:false,message:'Unknown cannon action'}
}
/** Animate the real jaw/blast and replenish cola in either camera mode. */
export function advanceCannon(elapsed){
 const dt=Math.min(.1,Math.max(0,elapsed))
 voyage.jaw+=((voyage.jawOpen?1:0)-voyage.jaw)*Math.min(1,dt*4)
 voyage.gaon=Math.max(0,voyage.gaon-dt)
 voyage.cola=Math.min(COLA.capacity,voyage.cola+Math.max(0,elapsed)*COLA.perSecond)
}
/** Rotate a ship-local point around a Y-up pivot. */
export function rotatePoint(point,angle,centre=[0,0,0]){
 const x=point[0]-centre[0],z=point[2]-centre[2],c=Math.cos(angle),s=Math.sin(angle)
 return [centre[0]+x*c+z*s,point[1],centre[2]-x*s+z*c]
}
/** Conservative physical bounds follow the carousel's exact mesh rotation. */
export function dockBounds(solids,centre,angle){
 return solids.map(b=>{
  const points=[]
  if(b.footprint)for(const [x,z] of b.footprint)points.push(rotatePoint([x,b.min[1],z],angle,centre))
  else for(const x of [b.min[0],b.max[0]])for(const z of [b.min[2],b.max[2]])points.push(rotatePoint([x,b.min[1],z],angle,centre))
  return {name:b.name,min:[Math.min(...points.map(p=>p[0])),b.min[1],Math.min(...points.map(p=>p[2]))],max:[Math.max(...points.map(p=>p[0])),b.max[1],Math.max(...points.map(p=>p[2]))],isFloor:b.isFloor===true}
 })
}
/** Slats travel vertically then wrap around an X-axis roller; digits share it. */
export function shutterPose(centre,top,radius,travel,progress,side){
 const y=centre[1]+travel*progress
 if(y<=top)return {centre:[centre[0],y,centre[2]],angle:0}
 const distance=y-top,angle=distance/radius,sign=side==='port'?1:-1
 const wound=radius+Math.floor(angle/(Math.PI*2))*.022
 return {centre:[centre[0],top+wound*Math.sin(angle),centre[2]+sign*wound*(1-Math.cos(angle))],angle:sign*angle}
}
/** Keep an open inner shutter with its physical bay until it has closed. */
export function advanceDock(dt,dockOccupied=false,shutterOccupied=false){
 dt=Math.min(.1,Math.max(0,dt))
 if(voyage.shutter===0)voyage.dockGateChannel=voyage.channel
 const target=channelAngle(voyage.channel),aligned=Math.abs(target-voyage.dockAngle)<.02
 const opening=voyage.dockOpen&&aligned&&voyage.dockGateChannel===voyage.channel
 if(opening||!shutterOccupied)voyage.shutter=Math.max(0,Math.min(1,voyage.shutter+(opening?1:-1)*dt*.45))
 if(!dockOccupied&&voyage.shutter===0)voyage.dockAngle+=(target-voyage.dockAngle)*Math.min(1,dt*1.8)
}

/** Advance the ship and its guarded moving mechanisms while sailing or bursting. */
export function advanceVoyage(elapsed,keys={},dockOccupied=false,shutterOccupied=false){
 const dt=Math.min(.1,Math.max(0,elapsed))
 if(voyage.helm&&voyage.burst===0){
  const steering=(keys.right?1:0)-(keys.left?1:0)
  voyage.throttle=Math.max(0,Math.min(1,voyage.throttle+((keys.forward?1:0)-(keys.back?1:0))*dt*.35))
  voyage.heading=(voyage.heading+steering*dt*18*(.25+.75*Math.min(1,Math.abs(voyage.speed)/5))+360)%360
  voyage.wheel+=((steering*.55)-voyage.wheel)*Math.min(1,dt*6)
 }else voyage.wheel*=Math.exp(-dt*6)
 advanceDock(dt,dockOccupied,shutterOccupied)
 voyage.foodLift+=(((voyage.foodLiftTarget>0)?1:0)-voyage.foodLift)*Math.min(1,dt*2.2)
 if(Math.abs(voyage.foodLift-voyage.foodLiftTarget)<.001)voyage.foodLift=voyage.foodLiftTarget>0?1:0
 if(voyage.chicken)voyage.maneAngle=(voyage.maneAngle+dt*2.4)%(Math.PI*2)
 let distance
 if(voyage.burst>0){
  const before=sampleBurst(BURST.seconds-voyage.burst)
  const used=Math.min(dt,voyage.burst)
  voyage.burst=voyage.burst-used<1e-9?0:voyage.burst-used
  const frame=sampleBurst(BURST.seconds-voyage.burst)
  voyage.lift=frame.lift;voyage.pitch=frame.pitch
  distance=frame.distance-before.distance
  if(used>0)voyage.speed=distance/used
  if(voyage.burst===0){voyage.lift=0;voyage.pitch=0;voyage.speed=voyage.throttle*5}
 }else{
  const paddle=voyage.dockGateChannel===0&&voyage.shutter>.98&&voyage.cola>0
  const desired=voyage.gaon>0?-8:voyage.throttle*(voyage.chicken?-2:paddle?4:5)
  voyage.speed+=(desired-voyage.speed)*(1-Math.exp(-dt*.6));distance=voyage.speed*dt
  if(paddle&&voyage.throttle>0){voyage.paddleAngle+=dt*voyage.throttle*1.5;voyage.cola=Math.max(0,voyage.cola-dt*.003)}
 }
 voyage.east+=Math.sin(voyage.heading*RAD)*distance
 voyage.south-=Math.cos(voyage.heading*RAD)*distance
 advanceCannon(elapsed)
 return voyage
}
/** Three cola barrels trigger a single stern impulse and airborne arc. */
export function startBurst(){
 if(!burstAvailability().canFire)return false
 voyage.cola-=BURST.cost
 voyage.burst=BURST.seconds
 return true
}
/** The Gaon uses part of the shared cola reserve and recoils. */
export function fireGaon(){
 if(!cannonAvailability().canFire)return false
 voyage.cola-=GAON.cost;voyage.jawOpen=true;voyage.gaon=GAON.seconds
 return true
}
