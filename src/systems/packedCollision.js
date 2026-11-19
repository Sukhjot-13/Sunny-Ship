import {Box3,Vector3} from 'three'

export const PACKED_COLLISION_FILE='models/sunny-collision.bin.gz'
const MAGIC=0x31584253 // SBX1
const HEADER=8
const BYTES_PER_BOX=24

/** Store the original Float32 bounds in order, followed by UTF-8 collider names. */
export function encodePackedCollision(boxes){
 const names=new TextEncoder().encode(boxes.map(entry=>entry.name+'\0').join(''))
 const namesOffset=HEADER+boxes.length*BYTES_PER_BOX
 const bytes=new Uint8Array(namesOffset+names.length),view=new DataView(bytes.buffer)
 view.setUint32(0,MAGIC,true)
 view.setUint32(4,boxes.length,true)
 let offset=HEADER
 for(const {box:{min,max}} of boxes){
  for(const point of [min,max]){
   view.setFloat32(offset,point.x,true)
   view.setFloat32(offset+4,point.y,true)
   view.setFloat32(offset+8,point.z,true)
   offset+=12
  }
 }
 bytes.set(names,namesOffset)
 return bytes
}

export function decodePackedCollision(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input)
 if(bytes.length<HEADER)throw new Error('Incomplete packed collision header')
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
 if(view.getUint32(0,true)!==MAGIC)throw new Error('Unsupported packed collision format')
 const count=view.getUint32(4,true),namesOffset=HEADER+BYTES_PER_BOX*count
 if(namesOffset>bytes.length)throw new Error('Incomplete packed collision bounds')
 if(count===0&&bytes.length===HEADER)return []
 const names=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(namesOffset)).split('\0')
 if(names.length!==count+1||names.pop()!=='')throw new Error('Invalid packed collision names')
 return names.map((name,i)=>{
  const offset=HEADER+i*BYTES_PER_BOX
  const x0=view.getFloat32(offset,true),y0=view.getFloat32(offset+4,true),z0=view.getFloat32(offset+8,true)
  const x1=view.getFloat32(offset+12,true),y1=view.getFloat32(offset+16,true),z1=view.getFloat32(offset+20,true)
  if(!name||![x0,y0,z0,x1,y1,z1].every(Number.isFinite)||x0>=x1||y0>=y1||z0>=z1)
   throw new Error('Invalid packed collision box')
  return {name,isFloor:name.startsWith('COLL_Floor'),box:new Box3(new Vector3(x0,y0,z0),new Vector3(x1,y1,z1))}
 })
}
