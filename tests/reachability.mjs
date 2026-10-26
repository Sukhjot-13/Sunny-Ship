/** Layered outdoor navigation audit: stairs can lie beneath another deck. */
import fs from 'node:fs'
import { loadColliders } from './glb.mjs'

const STEP_HEIGHT = 0.8
const RADIUS = 0.34
const HEIGHT = 1.75
const CELL = 0.1
const meta = JSON.parse(fs.readFileSync('public/models/ship-metadata.json','utf8'))
const boxes = loadColliders('public/models/sunny-collision.glb')
const floors = boxes.filter(b => b.name.startsWith('COLL_Floor'))
const solids = boxes.filter(b => !b.name.startsWith('COLL_Floor') && b.name !== 'COLL_Hull')
const toThree = (x,y,z) => [x,z,-y]
const spawn = toThree(...meta.spawn.position)
const origin = [floors[0].min.x+CELL/2,floors[0].min.z+CELL/2]
const colKey = (i,j) => `${i},${j}`
const columns = new Map()
for (const f of floors) {
  for (let i=Math.ceil((f.min.x-origin[0])/CELL);i<=(f.max.x-origin[0])/CELL;i++) {
    for (let j=Math.ceil((f.min.z-origin[1])/CELL);j<=(f.max.z-origin[1])/CELL;j++) {
      const x=origin[0]+i*CELL,z=origin[1]+j*CELL,y=f.max.y
      const key=colKey(i,j)
      const list=columns.get(key) ?? []
      if (!list.some(n => Math.abs(n.y-y)<0.08)) list.push({x,y,z,i,j,id:`${key},${y.toFixed(3)}`})
      columns.set(key,list)
    }
  }
}

function blocker(node) {
  // The controller stands on the highest tread touched by its feet, rather
  // than dropping to the centre-ray tread after every step.
  let supportY=node.y
  for(let di=-4;di<=4;di++) for(let dj=-4;dj<=4;dj++) {
    for(const f of columns.get(colKey(node.i+di,node.j+dj))??[]) {
      if(Math.abs(f.x-node.x)<=RADIUS && Math.abs(f.z-node.z)<=RADIUS &&
         f.y<=node.y+STEP_HEIGHT && f.y>supportY) supportY=f.y
    }
  }
  for (const b of solids) {
    if (node.x+RADIUS<b.min.x || node.x-RADIUS>b.max.x) continue
    if (supportY+HEIGHT<b.min.y || supportY+0.04>b.max.y) continue
    if (node.z+RADIUS<b.min.z || node.z-RADIUS>b.max.z) continue
    return b.name
  }
  return null
}

const nodes=[...columns.values()].flat()
const start=nodes.filter(n=>Math.abs(n.y-spawn[1])<0.6).sort((a,b)=>Math.hypot(a.x-spawn[0],a.z-spawn[2])-Math.hypot(b.x-spawn[0],b.z-spawn[2]))[0]
if (!start) throw new Error('No supported spawn cell')
const seen=new Map([[start.id,start]])
const queue=[start]
const blocked=new Map()
while (queue.length) {
  const n=queue.pop()
  for (const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]) {
    for (const next of columns.get(colKey(n.i+di,n.j+dj)) ?? []) {
      if (seen.has(next.id) || Math.abs(next.y-n.y)>STEP_HEIGHT) continue
      const hit=blocker(next)
      if (hit) {blocked.set(hit,(blocked.get(hit)??0)+1);continue}
      seen.set(next.id,next)
      queue.push(next)
    }
  }
}
const reached=[...seen.values()]
console.log(`REACHABLE floor layers: ${seen.size} of ${nodes.length} (${(100*seen.size/nodes.length).toFixed(1)}%)`)
console.log(`Reach along ship: ${reached.reduce((min,p)=>Math.min(min,p.x),Infinity).toFixed(1)} to ${reached.reduce((max,p)=>Math.max(max,p.x),-Infinity).toFixed(1)} m`)
console.log('Blocked boundaries:',[...blocked].sort((a,b)=>b[1]-a[1]).slice(0,8))
let failures=0
for (const [name,point] of Object.entries(meta.exterior.landmarks)) {
  const [x,y,z]=toThree(...point)
  const close=reached.filter(p=>Math.abs(p.y-y)<0.65)
  const connected=close.some(p=>Math.hypot(p.x-x,p.z-z)<1.25)
  console.log(`  ${connected?'PASS':'FAIL'}  outdoor route to ${name}`)
  if (!connected) {
    failures++
    console.log('    nearest:',close.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z)).slice(0,1))
    console.log('    destination blockers:',nodes.filter(n=>Math.hypot(n.x-x,n.z-z)<1.25 && Math.abs(n.y-y)<0.65).map(n=>[n.x,n.z,blocker(n)]).slice(0,8))
  }
}
process.exitCode=failures?1:0
