/** Swept axis movement: solid walls/decks block boosted flight without tunnelling. */
export const FLIGHT_CONTACT_EPSILON = 0.002
export function sweepFlight(boxes,position,velocity,dt,radius,height) {
  const p=position.clone(),v=velocity.clone()
  const epsilon=FLIGHT_CONTACT_EPSILON
  for(const axis of ['x','z','y']) {
    const delta=v[axis]*dt
    if(!delta)continue
    let next=p[axis]+delta
    const lowOffset=axis==='y'?0:radius,highOffset=axis==='y'?height:radius
    for(const {box,name} of boxes) {
      // Walking edge guards and the submerged safety catch are not physical walls.
      if(name==='COLL_Hull'||name.startsWith('COLL_Wall'))continue
      const others=['x','y','z'].filter(a=>a!==axis)
      if(others.some(a=>p[a]+(a==='y'?height:radius)<=box.min[a]+epsilon||
        p[a]-(a==='y'?0:radius)>=box.max[a]-epsilon))continue
      if(delta>0&&p[axis]+highOffset<=box.min[axis]+epsilon&&next+highOffset>box.min[axis]) {
        next=Math.min(next,box.min[axis]-highOffset-epsilon);v[axis]=0
      }else if(delta<0&&p[axis]-lowOffset>=box.max[axis]-epsilon&&next-lowOffset<box.max[axis]) {
        next=Math.max(next,box.max[axis]+lowOffset+epsilon);v[axis]=0
      }
    }
    p[axis]=next
  }
  return {position:p,velocity:v}
}
