/** Human-speed climbing along authored ropes/ladders. Coordinates are ship-local. */
import {FLIGHT_CONTACT_EPSILON} from './flightCollision.js'
export const CLIMB_SPEED = 1.05
const dist = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]))
const clamp = (n,a,b) => Math.max(a,Math.min(b,n))

/** A swept floor contact retains its separation gap; GLB coordinates are Float32. */
export function reachedClimbPoint(position,point) {
  return dist(position,point)<=FLIGHT_CONTACT_EPSILON+0.0001
}

/** Validate Blender paths and cache their metre lengths in Three coordinates. */
export function normalizeClimbs(raw=[]) {
  return raw.flatMap(spec=>{
    if(!spec?.id||!Array.isArray(spec.points)||spec.points.length<2)return []
    if(spec.points.some(p=>!Array.isArray(p)||p.length!==3||p.some(v=>!Number.isFinite(v))))return []
    const points=spec.points.map(([x,y,z])=>[x,z,-y]),lengths=[0]
    for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+dist(points[i],points[i-1]))
    const length=lengths.at(-1)
    return length>1?[{id:spec.id,label:spec.label||spec.id,points,lengths,length,hatch:spec.hatch}]:[]
  })
}

/** Interpolate continuously along the exact authored polyline. */
export function pointAt(path,distance) {
  const s=clamp(distance,0,path.length)
  for(let i=1;i<path.points.length;i++)if(s<=path.lengths[i]||i===path.points.length-1){
    const span=path.lengths[i]-path.lengths[i-1],t=span>0?(s-path.lengths[i-1])/span:0
    return path.points[i-1].map((v,k)=>v+(path.points[i][k]-v)*t)
  }
  return path.points[0].slice()
}

/** Closest physical position/progress on a path; no movement or teleport. */
export function closestOnPath(path,position) {
  let best={distance:Infinity,progress:0,point:path.points[0]}
  for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1],b=path.points[i],v=b.map((n,k)=>n-a[k]),length2=v.reduce((s,n)=>s+n*n,0)
    const t=length2?clamp(v.reduce((s,n,k)=>s+n*(position[k]-a[k]),0)/length2,0,1):0
    const point=a.map((n,k)=>n+v[k]*t),distance=dist(point,position)
    if(distance<best.distance)best={distance,progress:path.lengths[i-1]+Math.sqrt(length2)*t,point}
  }
  return best
}

/** Endpoint-only attachment and bounded proposals; the controller owns collision. */
export function createClimbingSystem(raw) {
  const paths=normalizeClimbs(raw)
  let active=null,progress=0
  function nearest(position) {
    return paths.flatMap(path=>[0,path.length].map(s=>({path,progress:s,distance:dist(position,pointAt(path,s))})))
      .filter(p=>p.distance<=1.05).sort((a,b)=>a.distance-b.distance)[0]||null
  }
  function attach(position) {
    const near=nearest(position)
    if(!near)return false
    active=near.path;progress=near.progress;return true
  }
  function restore(saved,position) {
    const path=paths.find(p=>p.id===saved?.id)
    if(!path||!Number.isFinite(saved.progress)||saved.progress<0||saved.progress>path.length)return false
    if(dist(position,pointAt(path,saved.progress))>.10)return false
    active=path;progress=saved.progress;return true
  }
  function propose(direction,dt) {
    if(!active)return null
    const next=clamp(progress+clamp(direction,-1,1)*CLIMB_SPEED*clamp(Number.isFinite(dt)?dt:0,0,1/30),0,active.length)
    return {point:pointAt(active,next),progress:next}
  }
  function commit(distance) {if(active&&Number.isFinite(distance))progress=clamp(distance,0,active.length)}
  function detach() {active=null;progress=0}
  return {paths,nearest,attach,restore,propose,commit,detach,get active(){return active},get progress(){return progress}}
}
