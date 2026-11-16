/** Decode the deterministic box proxy without allocating render meshes. */
import * as THREE from 'three'

export function decodeCollisionBoxes(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input)
  if(bytes.byteLength<20)throw new Error('Incomplete collision GLB')
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength||view.getUint32(16,true)!==0x4e4f534a)
    throw new Error('Unsupported collision GLB header')
  const jsonLength=view.getUint32(12,true)
  if(20+jsonLength>bytes.byteLength)throw new Error('Incomplete collision JSON')
  const data=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+jsonLength)))
  if(data.asset?.generator!=='Sunny axis-aligned collision proxy')throw new Error('Collision proxy must use the deterministic box format')
  const active=data.scenes?.[data.scene??0]?.nodes
  if(!active||active.length!==data.nodes?.length||active.some((id,i)=>id!==i))throw new Error('Collision proxy requires flat active nodes')
  return data.nodes.map(node=>{
    if(['matrix','translation','rotation','scale','children'].some(key=>node[key]!==undefined))throw new Error('Collision proxy cannot contain transformed nodes')
    const primitives=data.meshes?.[node.mesh]?.primitives
    if(primitives?.length!==1)throw new Error('Collision node must contain one box')
    const accessor=data.accessors?.[primitives[0].attributes?.POSITION]
    if(accessor?.componentType!==5126||accessor.type!=='VEC3'||accessor.count!==8||accessor.min?.length!==3||accessor.max?.length!==3)
      throw new Error('Collision box requires its bounded Float32 accessor')
    // The old GLTFLoader world measured the eight Float32 vertices. Round the
    // deterministic writer's double bounds to those exact same values.
    const low=accessor.min.map(Math.fround),high=accessor.max.map(Math.fround)
    if(![...low,...high].every(Number.isFinite)||low.some((v,i)=>v>=high[i]))throw new Error('Invalid collision box bounds')
    return {name:node.name,isFloor:node.name.startsWith('COLL_Floor'),
      box:new THREE.Box3(new THREE.Vector3(...low),new THREE.Vector3(...high))}
  })
}
