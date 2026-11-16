/** Conservative index for immutable static boxes; all exact tests stay downstream. */
export function createCollisionIndex(entries,{cellSize=2,maxCells=256,padding=.03}={}){
  if(!(cellSize>0&&maxCells>=1&&padding>=0))throw new RangeError('Invalid collision index settings')
  const buckets=new Map(),global=[]
  const key=(x,y,z)=>`${x},${y},${z}`
  for(let id=0;id<entries.length;id++){
    const {min,max}=entries[id].box
    const low=[min.x,min.y,min.z].map(v=>Math.floor((v-padding)/cellSize))
    const high=[max.x,max.y,max.z].map(v=>Math.floor((v+padding)/cellSize))
    if(![...low,...high].every(Number.isFinite))throw new RangeError('Non-finite static collision box')
    const cells=(high[0]-low[0]+1)*(high[1]-low[1]+1)*(high[2]-low[2]+1)
    if(cells>maxCells){global.push(id);continue}
    for(let x=low[0];x<=high[0];x++)for(let y=low[1];y<=high[1];y++)for(let z=low[2];z<=high[2];z++){
      const k=key(x,y,z),list=buckets.get(k)??[];list.push(id);buckets.set(k,list)
    }
  }
  /** Return conservative candidates in the original collision-list order. */
  function ids(min,max,after=-1){
    const found=new Set(global.filter(id=>id>after))
    const lo=[min.x,min.y,min.z].map(v=>Math.floor(v/cellSize))
    const hi=[max.x,max.y,max.z].map(v=>Math.floor(v/cellSize))
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
      for(const id of buckets.get(key(x,y,z))??[])if(id>after)found.add(id)
    }
    return [...found].sort((a,b)=>a-b)
  }
  function query(min,max){return ids(min,max).map(id=>entries[id])}
  /** Requery after push-out so moving into another cell cannot omit a later box.
   * Earlier boxes stay passed, exactly as in the original one-pass resolver.
   * The callback returns true whenever its exact contact test resolves a box.
   */
  function visit(min,max,callback){
    let pending=ids(min,max),i=0
    while(i<pending.length){
      const id=pending[i++]
      if(callback(entries[id],id)){pending=ids(min,max,id);i=0}
    }
  }
  return {query,visit,entries,bucketCount:buckets.size,globalCount:global.length}
}
