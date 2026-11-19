/** Shared Suspense resource for the plain static collision world. */
import {decodeCollisionBoxes} from './collisionData.js'
import {createCollisionIndex} from './collisionIndex.js'
import {decodePackedCollision,PACKED_COLLISION_FILE} from './packedCollision.js'
const resources=new Map()

export const COLLISION_PROXY_URL='/models/sunny-collision.glb'

async function loadBoxes(url){
  if(url===COLLISION_PROXY_URL&&typeof globalThis.DecompressionStream==='function'){
    const response=await fetch('/'+PACKED_COLLISION_FILE,{headers:{Accept:'application/gzip, application/octet-stream'}})
    if(response.ok&&!response.headers.get('content-type')?.startsWith('text/html')){
      const bytes=new Uint8Array(await response.arrayBuffer())
      // Static hosts may serve the gzip file with Content-Encoding. Fetch
      // has already decompressed it in that case.
      if(bytes[0]!==0x1f||bytes[1]!==0x8b)return decodePackedCollision(bytes)
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
      return decodePackedCollision(await new Response(stream).arrayBuffer())
    }
    // The older inspection servers still expose the original proxy.
    if(!response.ok&&response.status!==404)throw new Error(`Packed collision load failed: ${response.status}`)
  }
  const response=await fetch(url)
  if(!response.ok)throw new Error(`Collision load failed: ${response.status}`)
  return decodeCollisionBoxes(await response.arrayBuffer())
}

function resource(url){
  let entry=resources.get(url)
  if(!entry){
    entry={status:'pending',world:null,error:null,promise:null}
    resources.set(url,entry)
    entry.promise=loadBoxes(url).then(boxes=>{
      const floorEntries=boxes.filter(item=>item.isFloor)
      entry.world={boxes,floors:floorEntries.map(item=>item.box),
        index:createCollisionIndex(boxes),floorIndex:createCollisionIndex(floorEntries)}
      entry.status='ready'
    }).catch(error=>{entry.error=error;entry.status='error'})
  }
  return entry
}

export function preloadCollisionWorld(url){return resource(url).promise}

export function readCollisionWorld(url){
  const entry=resource(url)
  if(entry.status==='pending')throw entry.promise
  if(entry.status==='error')throw entry.error
  return entry.world
}
