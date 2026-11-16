/** Conservative 3D broad phase for the unchanged exact body/box predicates. */
export function spatialBoxes(boxes,{radius=.34,height=1.75,step=.8,cell=2}={}){
 const buckets=new Map(),key=(x,y,z)=>`${x},${y},${z}`
 for(const box of boxes){
  const low=[box.min.x-radius,box.min.y-height-step,box.min.z-radius]
  const high=[box.max.x+radius,box.max.y,box.max.z+radius]
  for(let x=Math.floor(low[0]/cell);x<=Math.floor(high[0]/cell);x++)
   for(let y=Math.floor(low[1]/cell);y<=Math.floor(high[1]/cell);y++)
    for(let z=Math.floor(low[2]/cell);z<=Math.floor(high[2]/cell);z++){
     const k=key(x,y,z),list=buckets.get(k)??[];list.push(box);buckets.set(k,list)
    }
 }
 return point=>buckets.get(key(Math.floor(point.x/cell),Math.floor(point.y/cell),Math.floor(point.z/cell)))??[]
}
