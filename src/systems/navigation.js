/** Navigation is simulated; collision queries remain in ship coordinates. */
export const CHANNELS=['Shiro Mokuba I','Mini Merry II','Shark Submerge III','Kurosai FR-U IV','Brachio Tank V','Inflatable Pool']
export const LOG_BEARINGS=[35,145,285]
export const BURST={seconds:6,height:32,range:240,cost:3}
const initial=()=>({heading:270,throttle:0,speed:0,east:0,south:0,helm:false,channel:1,dockOpen:false,shutter:0,dockAngle:0,logNeedle:0,cola:3,burst:0,lift:0,pitch:0,wheel:0,chicken:false,maneAngle:0,jawOpen:false,jaw:0,gaon:0,paddleAngle:0})
export const voyage=initial()
const RAD=Math.PI/180
export function resetVoyage(){Object.assign(voyage,initial())}
export function shipYaw(){return (270-voyage.heading)*RAD}
export function channelName(channel){return channel===0?'Paddles':CHANNELS[channel-1]}
export function channelAngle(channel){return -(Math.max(1,channel)-1)*Math.PI/3}
/** Shared readiness for the visible panel and keyboard mechanism actions. */
export function cannonAvailability(state=voyage){
 const reason=state.gaon>0?'Gaon is firing.':state.burst>0?'Wait for Coup de Burst to land.':state.cola<3?'Needs 3 cola barrels.':''
 return {canFire:!reason,reason}
}
/** Operate the existing real cannon from either user interface. */
export function operateCannon(action){
 if(action==='toggle-mouth'){
  voyage.jawOpen=!voyage.jawOpen
  return {ok:true,message:voyage.jawOpen?'Gaon mouth opening':'Gaon mouth closing'}
 }
 if(action==='fire'){
  const {canFire,reason}=cannonAvailability()
  if(!canFire)return {ok:false,message:reason}
  return {ok:fireGaon(),message:'Gaon air blast · three barrels spent · reverse recoil'}
 }
 return {ok:false,message:'Unknown cannon action'}
}
/** Animate the real jaw/blast in Inspect as well as while walking. */
export function advanceCannon(dt){
 dt=Math.min(.1,Math.max(0,dt))
 voyage.jaw+=((voyage.jawOpen?1:0)-voyage.jaw)*Math.min(1,dt*4)
 voyage.gaon=Math.max(0,voyage.gaon-dt)
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
  for(const x of [b.min[0],b.max[0]])for(const z of [b.min[2],b.max[2]])points.push(rotatePoint([x,b.min[1],z],angle,centre))
  return {name:b.name,min:[Math.min(...points.map(p=>p[0])),b.min[1],Math.min(...points.map(p=>p[2]))],max:[Math.max(...points.map(p=>p[0])),b.max[1],Math.max(...points.map(p=>p[2]))],isFloor:false}
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
/** Closures pause for occupied apertures; carousel turns after full closure. */
export function advanceVoyage(dt,keys={},dockOccupied=false,shutterOccupied=false){
 dt=Math.min(.1,Math.max(0,dt))
 if(voyage.helm&&voyage.burst===0){
  const steering=(keys.right?1:0)-(keys.left?1:0)
  voyage.throttle=Math.max(0,Math.min(1,voyage.throttle+((keys.forward?1:0)-(keys.back?1:0))*dt*.35))
  voyage.heading=(voyage.heading+steering*dt*18*(.25+.75*Math.min(1,Math.abs(voyage.speed)/5))+360)%360
  voyage.wheel+=((steering*.55)-voyage.wheel)*Math.min(1,dt*6)
 }else voyage.wheel*=Math.exp(-dt*6)
 const target=channelAngle(voyage.channel),aligned=Math.abs(target-voyage.dockAngle)<.02
 const opening=voyage.dockOpen&&aligned
 if(opening||!shutterOccupied)voyage.shutter=Math.max(0,Math.min(1,voyage.shutter+(opening?1:-1)*dt*.45))
 if(!dockOccupied&&voyage.shutter<.001)voyage.dockAngle+=(target-voyage.dockAngle)*Math.min(1,dt*1.8)
 advanceCannon(dt)
 if(voyage.chicken)voyage.maneAngle=(voyage.maneAngle+dt*2.4)%(Math.PI*2)
 let distance
 if(voyage.burst>0){
  const used=Math.min(dt,voyage.burst)
  voyage.burst=Math.max(0,voyage.burst-dt)
  const t=1-voyage.burst/BURST.seconds
  voyage.lift=4*BURST.height*t*(1-t)
  voyage.pitch=-.18*Math.sin(t*Math.PI*2)
  voyage.speed=BURST.range/BURST.seconds;distance=voyage.speed*used
  if(voyage.burst===0){voyage.lift=0;voyage.pitch=0;voyage.speed=voyage.throttle*5}
 }else{
  const paddle=voyage.channel===0&&voyage.shutter>.98&&voyage.cola>0
  const desired=voyage.gaon>0?-8:voyage.throttle*(voyage.chicken?-2:paddle?4:5)
  voyage.speed+=(desired-voyage.speed)*(1-Math.exp(-dt*.6));distance=voyage.speed*dt
  if(paddle&&voyage.throttle>0){voyage.paddleAngle+=dt*voyage.throttle*1.5;voyage.cola=Math.max(0,voyage.cola-dt*.003)}
 }
 voyage.east+=Math.sin(voyage.heading*RAD)*distance
 voyage.south-=Math.cos(voyage.heading*RAD)*distance
 return voyage
}
/** Three tank barrels fund one Burst. Flight dimensions are simulated. */
export function startBurst(){if(voyage.cola<BURST.cost||voyage.burst>0||voyage.gaon>0)return false;voyage.cola-=BURST.cost;voyage.burst=BURST.seconds;return true}
/** Uncompensated Gaon spends three barrels and recoils; no damage simulation. */
export function fireGaon(){if(voyage.cola<3||voyage.burst>0||voyage.gaon>0)return false;voyage.cola-=3;voyage.jawOpen=true;voyage.gaon=2.5;return true}
