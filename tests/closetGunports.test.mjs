/** Read all exported surfaces between each closet cannon and its outboard opening. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import {decodeCollisionBoxes} from '../src/systems/collisionData.js'
import {loadColliders,nodeMatrix,readAccessor,readGLB} from './glb.mjs'

const file='public/models/sunny.glb'
const metadata=JSON.parse(fs.readFileSync('public/models/ship-metadata.json'))
const ports=metadata.exterior.mechanisms.closetGunports
const covers=metadata.interiors.workshopPortCovers
if(ports){
 assert.equal(ports.length,4)
 assert.equal(covers.length,4)
 const gltf=readGLB(file),bounds=new Map(loadColliders(file).map(item=>[item.name,item]))
 const colliders=decodeCollisionBoxes(fs.readFileSync('public/models/sunny-collision.glb'))
 const hardware=new Map()
 for(const cover of covers){
  const fitting=bounds.get(cover.node),solid=colliders.find(box=>box.name==='COLL_Solid_'+cover.node)
  assert(fitting&&solid&&!solid.isFloor,cover.node+' requires a physical cover')
  assert(solid.box.min.distanceTo(fitting.min)<.002&&solid.box.max.distanceTo(fitting.max)<.002)
  const sheltered=new THREE.Box3(fitting.min.clone().addScalar(.018),fitting.max.clone().addScalar(-.018))
  for(const name of cover.hardware)hardware.set(name,sheltered)
 }
 const shots=[],sleeves=new Map(ports.map(port=>[port.node,new Map()]))
 for(const port of ports){
  const barrel=bounds.get(port.barrel),liner=bounds.get(port.node),[x,y]=port.axis
  const barrelRim=bounds.get(port.barrel.replace(/_barrel$/,'_rim'))
  const centre=barrel.min.clone().lerp(barrel.max,.5),direction=-port.direction
  assert(Math.hypot(centre.x-x,centre.y-y)<.002,'aperture must align with the actual barrel axis')
  assert(liner&&port.clearRadius>.15&&port.clearRadius<.34)
  const muzzle=direction*Math.max(direction*barrelRim.min.z,direction*barrelRim.max.z)+direction*.005
  const heading=new THREE.Vector3(0,0,direction)
  for(const radius of [0,.12,.22])for(let index=0;index<(radius?12:1);index++){
   const angle=(index+.17)*Math.PI/6
   shots.push({port:port.node,clear:radius<.17,
    ray:new THREE.Ray(new THREE.Vector3(x+radius*Math.cos(angle),y+radius*Math.sin(angle),muzzle),heading),first:null})
  }
 }

 function visit(index,parent){
  const node=gltf.json.nodes[index],world=parent.clone().multiply(nodeMatrix(node))
  if(node.mesh!==undefined)for(const primitive of gltf.json.meshes[node.mesh].primitives){
   const accessor=gltf.json.accessors[primitive.attributes.POSITION]
   const box=new THREE.Box3(new THREE.Vector3(...accessor.min),new THREE.Vector3(...accessor.max)).applyMatrix4(world)
   const rays=shots.filter(shot=>shot.ray.intersectsBox(box)),edges=sleeves.get(node.name)
   const sheltered=hardware.get(node.name)
   if(!rays.length&&!edges&&!sheltered)continue
   const {data:positions,count}=readAccessor(gltf,primitive.attributes.POSITION)
   if(sheltered){
    const point=new THREE.Vector3()
    for(let i=0;i<count;i++){
     point.fromArray(positions,i*3).applyMatrix4(world)
     if(point.y>=metadata.interiors.levels.B1){
      assert(sheltered.containsPoint(point),node.name+' has exposed hardware above the B1 workshop deck')
     }
    }
   }
   const indices=primitive.indices===undefined?Array.from({length:count},(_,i)=>i):readAccessor(gltf,primitive.indices).data
   const a=new THREE.Vector3(),b=a.clone(),c=a.clone(),hit=a.clone()
   for(let i=0;i<indices.length;i+=3){
    a.fromArray(positions,indices[i]*3).applyMatrix4(world)
    b.fromArray(positions,indices[i+1]*3).applyMatrix4(world)
    c.fromArray(positions,indices[i+2]*3).applyMatrix4(world)
    if(edges){
     const vertices=[a,b,c].map(point=>point.toArray().map(value=>Math.round(value*1e5)).join(','))
     for(let j=0;j<3;j++){
      const label=[vertices[j],vertices[(j+1)%3]].sort().join('/')
      edges.set(label,(edges.get(label)??0)+1)
     }
    }
    for(const shot of rays)if(shot.ray.intersectTriangle(a,b,c,false,hit)){
     const distance=hit.distanceTo(shot.ray.origin)
     if(!shot.first||distance<shot.first.distance)shot.first={name:node.name,distance}
    }
   }
  }
  for(const child of node.children??[])visit(child,world)
 }
 for(const root of gltf.json.scenes[gltf.json.scene].nodes)visit(root,new THREE.Matrix4())

 for(const [name,edges] of sleeves)assert(edges.size&&[...edges.values()].every(count=>count===2),`${name} must be an actual closed sleeve`)
 for(const shot of shots){
  if(shot.clear)assert(!shot.first,`${shot.port} has an obstructed opening at ${JSON.stringify(shot.first)}`)
  else assert.equal(shot.first?.name,shot.port,'rim rays must hit the actual continuous port sleeve')
 }
 console.log(`PASS four measured barrel axes, closed sleeves, ${shots.length} real clearance and rim rays, and four physical B1 covers enclosing the above-floor hardware`)
}
