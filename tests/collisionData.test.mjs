/** Every decoded bound must equal the old actual Float32 mesh measurement. */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {decodeCollisionBoxes} from '../src/systems/collisionData.js'
import {loadColliders} from './glb.mjs'
const decoded=decodeCollisionBoxes(fs.readFileSync('public/models/sunny-collision.glb'))
const measured=loadColliders('public/models/sunny-collision.glb')
assert.equal(decoded.length,measured.length)
for(let i=0;i<measured.length;i++){
 assert.equal(decoded[i].name,measured[i].name,'retain every collider in original resolution order')
 assert(decoded[i].box.min.equals(measured[i].min)&&decoded[i].box.max.equals(measured[i].max),'exact old Float32 vertex bounds: '+measured[i].name)
 assert.equal(decoded[i].isFloor,measured[i].name.startsWith('COLL_Floor'))
}
/** Tiny format fixture to isolate malformed-header/transform rejection. */
function fixture(transform=false){
 const json={asset:{version:'2.0',generator:'Sunny axis-aligned collision proxy'},scene:0,scenes:[{nodes:[0]}],
  nodes:[{name:'COLL_Floor_fixture',mesh:0,...(transform?{translation:[1,0,0]}:{})}],
  meshes:[{primitives:[{attributes:{POSITION:0}}]}],
  accessors:[{componentType:5126,type:'VEC3',count:8,min:[.10000000001,-40.550717163,-2],max:[1.2,-40.3,2]}]}
 const raw=new TextEncoder().encode(JSON.stringify(json)),length=Math.ceil(raw.length/4)*4,bytes=new Uint8Array(20+length),view=new DataView(bytes.buffer)
 view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,bytes.length,true)
 view.setUint32(12,length,true);view.setUint32(16,0x4e4f534a,true);bytes.fill(32,20);bytes.set(raw,20)
 return bytes
}
assert.equal(decodeCollisionBoxes(fixture())[0].box.min.y,Math.fround(-40.550717163))
assert.throws(()=>decodeCollisionBoxes(fixture(true)),/transformed/)
assert.throws(()=>decodeCollisionBoxes(new Uint8Array(8)),/Incomplete/)
const wrong=fixture();wrong[0]=0;assert.throws(()=>decodeCollisionBoxes(wrong),/header/)
const {readCollisionWorld,preloadCollisionWorld}=await import('../src/systems/collisionWorld.js')
const originalFetch=globalThis.fetch;let requests=0
try{
 globalThis.fetch=async url=>{requests++;return url==='fixture:missing'?{ok:false,status:404}:{ok:true,arrayBuffer:async()=>fixture().buffer}}
 let suspended=null
 try{readCollisionWorld('fixture:shared')}catch(value){suspended=value}
 assert(suspended instanceof Promise,'first reader suspends on actual load promise')
 assert.equal(preloadCollisionWorld('fixture:shared'),suspended,'concurrent readers share one load')
 await suspended
 const world=readCollisionWorld('fixture:shared')
 assert.equal(readCollisionWorld('fixture:shared'),world);assert.equal(requests,1)
 assert.equal(world.boxes.length,1);assert.equal(world.floors.length,1)
 assert.equal(world.index.entries,world.boxes,'ready world uses the same physical entries')
 await preloadCollisionWorld('fixture:missing')
 assert.throws(()=>readCollisionWorld('fixture:missing'),/404/,'failed loads propagate through the reader')
 assert.equal(requests,2,'failed/ready resources are cached rather than refetched each render')
}finally{globalThis.fetch=originalFetch}
console.log('PASS exact original names/order/floor roles and Float32 mesh bounds for',decoded.length,'real boxes, format guards and shared Suspense loading/error lifecycle')
