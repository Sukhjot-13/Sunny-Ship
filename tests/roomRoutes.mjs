/** Collision-grid routes from lawn spawn to every intended room, with open leaves. */
import fs from 'node:fs'
import {loadColliders} from './glb.mjs'
import {stairFlights} from './stairFlights.mjs'
import {dockBounds} from '../src/systems/navigation.js'
import {createDoorSystem} from '../src/systems/doors.js'
import {normalizeClimbs,pointAt} from '../src/systems/climbing.js'
const CELL=.2, R=.34, H=1.75, STEP=.8
// Match resolveList's existing head contact band. Keep planned support changes
// gradual in both directions, including the reverse of an ascent path, so the
// real controller's waypoint tolerance cannot turn a descent into a large drop.
const HEAD_CONTACT=.02, ROUTE_STEP=.60
export function roomRoutes(){
 const meta=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
 const boxes=loadColliders('public/models/sunny-collision.glb')
 const floors=boxes.filter(b=>b.name.startsWith('COLL_Floor'))
 const solids=boxes.filter(b=>!b.name.startsWith('COLL_Floor')&&b.name!=='COLL_Hull'&&!b.name.startsWith('COLL_Wall'))
 const centre=meta.interiors.dockCentre,raw=meta.interiors.dockSolids??[]
 for(const b of dockBounds(raw.map(v=>({...v,min:[v.min[0],v.min[2],-v.max[1]],max:[v.max[0],v.max[2],-v.min[1]]})),[centre[0],centre[2],-centre[1]],0))solids.push({name:b.name,min:{x:b.min[0],y:b.min[1],z:b.min[2]},max:{x:b.max[0],y:b.max[1],z:b.max[2]}})
 const doors=createDoorSystem(meta.interiors.doors)
 for(const d of doors.doors)d.state.openness=1
 for(const b of doors.update(0,null).colliders)solids.push({name:b.name,min:{x:b.min[0],y:b.min[1],z:b.min[2]},max:{x:b.max[0],y:b.max[1],z:b.max[2]}})
 const key=(i,j)=>`${i},${j}`, columns=new Map(), buckets=new Map(), floorBuckets=new Map()
 for(const b of solids)for(let i=Math.floor(b.min.x-R);i<=Math.floor(b.max.x+R);i++)for(let j=Math.floor(b.min.z-R);j<=Math.floor(b.max.z+R);j++){
  const k=key(i,j), list=buckets.get(k)||[];list.push(b);buckets.set(k,list)
 }
 for(const f of floors)for(let i=Math.floor(f.min.x-R);i<=Math.floor(f.max.x+R);i++)for(let j=Math.floor(f.min.z-R);j<=Math.floor(f.max.z+R);j++){
  const k=key(i,j),list=floorBuckets.get(k)||[];list.push(f);floorBuckets.set(k,list)
 }
 for(const f of floors)for(let i=Math.ceil(f.min.x/CELL);i<=f.max.x/CELL;i++)for(let j=Math.ceil(f.min.z/CELL);j<=f.max.z/CELL;j++){
  const k=key(i,j), list=columns.get(k)||[], y=f.max.y
  if(!list.some(n=>Math.abs(n.y-y)<.045))list.push({x:i*CELL,y,z:j*CELL,i,j,parent:null,seen:false})
  columns.set(k,list)
 }
 const blocked=n=>{
  if(n.blocked!==undefined)return n.blocked
  let y=n.y
  const nearby=floorBuckets.get(key(Math.floor(n.x),Math.floor(n.z)))||[]
  for(const f of nearby){
   if(n.x+R>=f.min.x&&n.x-R<=f.max.x&&n.z+R>=f.min.z&&n.z-R<=f.max.z&&f.max.y<=n.y+STEP&&f.max.y>y)y=f.max.y
  }
  n.support=y
  n.blocked=(buckets.get(key(Math.floor(n.x),Math.floor(n.z)))||[]).find(b=>n.x+R>b.min.x&&n.x-R<b.max.x&&n.z+R>b.min.z&&n.z-R<b.max.z&&y+H+HEAD_CONTACT>=b.min.y&&y+.019<b.max.y)?.name||null
  if(!n.blocked)n.blocked=nearby.find(f=>n.x+R>f.min.x&&n.x-R<f.max.x&&n.z+R>f.min.z&&n.z-R<f.max.z&&f.min.y>y+.03&&f.min.y<=y+H+HEAD_CONTACT)?.name||null
  return n.blocked
 }
 const nodes=[...columns.values()].flat(),spawn=[meta.spawn.position[0],meta.spawn.position[2],-meta.spawn.position[1]]
 const start=nodes.filter(n=>Math.abs(n.y-spawn[1])<.15&&!blocked(n)).sort((a,b)=>Math.hypot(a.x-spawn[0],a.z-spawn[2])-Math.hypot(b.x-spawn[0],b.z-spawn[2]))[0]
 if(!start)throw Error('No supported spawn')
 const queue=[start];start.seen=true
 for(let qi=0;qi<queue.length;qi++){
  const n=queue[qi]
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[-2,0],[0,2],[0,-2]])for(const next of columns.get(key(n.i+di,n.j+dj))||[]){
   if(next.seen||Math.abs(next.y-n.y)>STEP||blocked(next))continue
   if(next.support-n.support>ROUTE_STEP||n.support-next.support>ROUTE_STEP)continue
   next.parent=n;next.seen=true;queue.push(next)
  }
 }
 if(process.env.NAV_DEBUG){
  const span=queue.reduce((s,n)=>[Math.min(s[0],n.x),Math.max(s[1],n.x),Math.min(s[2],n.y),Math.max(s[3],n.y)],[Infinity,-Infinity,Infinity,-Infinity])
  console.log('reachable span',...span)
 }
 if(process.env.NAV_DEBUG)for(const raw of [...meta.interiors.doors.filter(d=>d.kind==='door'),...stairFlights(loadColliders('public/models/sunny.glb')).map(f=>({id:f.name+' top',pos:[f.treads.at(-1)[0],-f.treads.at(-1)[2],f.treads.at(-1)[1]]}))]){
  const [x,y,z]=[raw.pos[0],raw.pos[2],-raw.pos[1]]
  const near=nodes.filter(n=>Math.hypot(n.x-x,n.z-z)<1.5&&Math.abs(n.y-y)<.2)
  const hits=new Map();for(const n of near)if(blocked(n))hits.set(blocked(n),(hits.get(blocked(n))||0)+1)
  console.log(raw.id,'near',near.length,'seen',near.filter(n=>n.seen).length,'blockers', [...hits].sort((a,b)=>b[1]-a[1]).slice(0,3))
 }
 /** Breadth-first walking path between two already validated floor nodes. */
 function between(from,to){
  const q=[from],parents=new Map([[from,null]])
  for(let i=0;i<q.length&&!parents.has(to);i++){
   const n=q[i]
   for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[-2,0],[0,2],[0,-2]])for(const next of columns.get(key(n.i+di,n.j+dj))||[]){
    if(parents.has(next)||Math.abs(next.y-n.y)>STEP||blocked(next)||next.support-n.support>ROUTE_STEP||n.support-next.support>ROUTE_STEP)continue
    parents.set(next,n);q.push(next)
   }
  }
  if(!parents.has(to))return []
  const points=[];for(let n=to;n;n=parents.get(n))points.push([n.x,n.support,n.z])
  return points.reverse()
 }
 /** Coalesce straight walk segments while keeping all direction changes. */
 function compress(full){
  if(!full.length)return []
  const path=[full[0]]
  for(let i=1;i<full.length-1;i++){
   const a=full[i-1],b=full[i],c=full[i+1],prev=path.at(-1)
   if(Math.abs(b[1]-a[1])>.03||Math.abs(c[1]-b[1])>.03||Math.abs((b[0]-a[0])*(c[2]-b[2])-(b[2]-a[2])*(c[0]-b[0]))>1e-6||Math.hypot(b[0]-prev[0],b[2]-prev[2])>.8)path.push(b)
  }
  path.push(full.at(-1));return path
 }
 function fromSpawn(target){
  const full=[];for(let n=target;n;n=n.parent)full.push([n.x,n.support,n.z])
  return compress([spawn,...full.reverse()])
 }
 let previous=start
 const routes=meta.interiors.rooms.map(room=>{
  const y=meta.interiors.levels[room.level],cx=(room.x[0]+room.x[1])/2,cz=-(room.y[0]+room.y[1])/2
  const inside=nodes.filter(n=>Math.abs(n.y-y)<.16&&n.x>room.x[0]+.4&&n.x<room.x[1]-.4&&n.z>-room.y[1]+.4&&n.z<-room.y[0]-.4&&!blocked(n))
  const target=inside.filter(n=>n.seen&&Math.abs(n.support-y)<.25).sort((a,b)=>Math.hypot(a.x-cx,a.z-cz)-Math.hypot(b.x-cx,b.z-cz))[0]
  if(!target)return {name:room.name,ok:false,available:inside.length,path:[],tourPath:[]}
  const path=fromSpawn(target),tourPath=compress(between(previous,target)),returnPath=compress(between(target,start));previous=target
  return {name:room.name,ok:true,target:[target.x,target.support,target.z],path,tourPath,returnPath}
 })
 const groups=new Map()
 for(const m of loadColliders('public/models/sunny.glb')){
  const match=m.name.match(/^Sunny_((?:SoldierDockStair|AquariumStair|KitchenStair|StorageStair|EnergyStair|BathStair)(?:_(?:up|over))?)_tread\d+$/)
  if(!match)continue
  const list=groups.get(match[1])||[];list.push([(m.min.x+m.max.x)/2,m.max.y,(m.min.z+m.max.z)/2]);groups.set(match[1],list)
 }
 /** Connected node close to the actual exported tread/landing, without teleport. */
 function at(point){
  return nodes.filter(n=>n.seen&&!blocked(n)&&Math.abs(n.y-point[1])<.2&&Math.hypot(n.x-point[0],n.z-point[2])<.6)
   .sort((a,b)=>Math.hypot(a.x-point[0],a.z-point[2])-Math.hypot(b.x-point[0],b.z-point[2]))[0]
 }
 const stairs=[...groups].map(([name,treads])=>{
  treads.sort((a,b)=>a[1]-b[1])
  const first=treads[0],last=treads.at(-1),length=Math.hypot(last[0]-first[0],last[2]-first[2]),dx=(last[0]-first[0])/length,dz=(last[2]-first[2])/length
  const lower=[first[0]-dx*.5,first[1]-.19,first[2]-dz*.5],upper=[last[0]+dx*.5,last[1],last[2]+dz*.5]
  const anchors=[lower,...treads,upper].map(at)
  if(anchors.some(n=>!n))return {name:'Stair: '+name,ok:false,path:[]}
  let full=fromSpawn(anchors[0])
  for(let i=1;i<anchors.length;i++){
   const part=between(anchors[i-1],anchors[i]);if(!part.length)return {name:'Stair: '+name,ok:false,path:[]}
   full.push(...part.slice(1))
  }
  return {name:'Stair: '+name,ok:true,path:compress(full),target:[anchors.at(-1).x,anchors.at(-1).support,anchors.at(-1).z]}
 })

 // Keep forced connection coverage when a reference ladder replaces an
 // invented stair: both real floor endpoints and the full body shaft matter.
 const ladders=normalizeClimbs(meta.exterior.mechanisms.climbs).filter(p=>p.id!=='fore-lookout').map(p=>{
  const lower=at(p.points[0]),upper=at(p.points.at(-1))
  const obstacles=[...solids,...floors]
  const clear=Array.from({length:Math.ceil(p.length/.10)+1},(_,i)=>pointAt(p,i*.10)).every(v=>
   !obstacles.some(b=>v[0]+R>b.min.x+.02&&v[0]-R<b.max.x-.02&&v[2]+R>b.min.z+.02&&v[2]-R<b.max.z-.02&&v[1]+H>b.min.y+.02&&v[1]<b.max.y-.02))
  return {name:'Ladder: '+p.label,ok:!!(lower&&upper&&clear),path:lower?fromSpawn(lower):[],target:p.points.at(-1),climb:p}
 })

 // Explicitly reproduce the reported doorway after each first fore flight.
 // Every tread is an anchor, so the solver cannot substitute a different stair.
 const women=routes.find(r=>r.name==="Women's Quarters")
 const approaches=stairFlights(loadColliders('public/models/sunny.glb')).filter(f=>f.name.startsWith('fore lower')).map(f=>{
  const anchors=f.treads.map(at)
  if(!women?.ok||anchors.some(n=>!n))return {name:'Fore cabin approach: '+f.name,ok:false,path:[]}
  const room=at(women.target)
  let full=fromSpawn(anchors[0])
  for(let i=1;i<anchors.length;i++){const part=between(anchors[i-1],anchors[i]);if(!part.length)return {name:'Fore cabin approach: '+f.name,ok:false,path:[]};full.push(...part.slice(1))}
  const entry=between(anchors.at(-1),room)
  if(!entry.length)return {name:'Fore cabin approach: '+f.name,ok:false,path:[]}
  full.push(...entry.slice(1))
  return {name:'Fore cabin approach: '+f.name,ok:true,path:compress(full),target:women.target}
 })

 /** Plan a connection between real supported poses using the same body checks. */
 function pathBetween(a,b){
  const from=at(a),to=at(b)
  return from&&to?compress(between(from,to)):[]
 }
 return {spawn,routes,stairs,ladders,approaches,pathBetween,visited:queue.length,total:nodes.length}
}
if(process.argv[1]?.endsWith('/roomRoutes.mjs')){
 const result=roomRoutes();fs.writeFileSync('/tmp/sunny-room-routes.json',JSON.stringify(result));for(const r of [...result.routes,...result.stairs,...result.ladders,...result.approaches])console.log(r.ok?'PASS':'FAIL',r.name,r.ok?`${r.path.length} waypoints, ${r.target}`:`${r.available??0} isolated walkable cells`)
 console.log(`Reachable ${result.visited}/${result.total} grid nodes`);process.exitCode=[...result.routes,...result.stairs,...result.ladders,...result.approaches].every(r=>r.ok)?0:1
}
