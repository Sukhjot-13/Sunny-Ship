/** Shared Suspense resource for the plain static collision world. */
import {decodeCollisionBoxes} from './collisionData.js'
import {createCollisionIndex} from './collisionIndex.js'
const resources=new Map()

function resource(url){
  let entry=resources.get(url)
  if(!entry){
    entry={status:'pending',world:null,error:null,promise:null}
    resources.set(url,entry)
    entry.promise=fetch(url).then(response=>{
      if(!response.ok)throw new Error(`Collision load failed: ${response.status}`)
      return response.arrayBuffer()
    }).then(buffer=>{
      const boxes=decodeCollisionBoxes(buffer),floorEntries=boxes.filter(item=>item.isFloor)
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
