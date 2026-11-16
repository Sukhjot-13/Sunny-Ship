/** Exact ordered walking push-out, optionally using a conservative static index. */
import {CONTACT_GAP} from './doors.js'
const EPS=.02

export function resolveList(list,p,v,playerMin,playerMax,radius,height,index=null){
  let blocker=null
  function resolveItem(item){
    const box=item.box,gap=item.name?.startsWith('DOOR_')?CONTACT_GAP+.001:0
    const minX=box.min.x-gap,maxX=box.max.x+gap,minZ=box.min.z-gap,maxZ=box.max.z+gap
    if(playerMax.x<minX||playerMin.x>maxX||playerMax.y<box.min.y-EPS||
       playerMin.y>box.max.y-EPS||playerMax.z<minZ||playerMin.z>maxZ)return false
    const overlapX=Math.min(playerMax.x-minX,maxX-playerMin.x)
    const overlapZ=Math.min(playerMax.z-minZ,maxZ-playerMin.z)
    if(overlapX<overlapZ){
      if(p.x<(box.min.x+box.max.x)/2)p.x-=overlapX;else p.x+=overlapX
      v.x=0
    }else{
      if(p.z<(box.min.z+box.max.z)/2)p.z-=overlapZ;else p.z+=overlapZ
      v.z=0
    }
    blocker=item.name
    playerMin.set(p.x-radius,p.y,p.z-radius)
    playerMax.set(p.x+radius,p.y+height,p.z+radius)
    return true
  }
  if(index)index.visit(playerMin,playerMax,resolveItem)
  else for(const item of list)resolveItem(item)
  return blocker
}
