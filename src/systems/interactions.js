/** One-shot interaction dispatch with explicit priority and consumption. */
export function createInteractionBus() {
  const listeners=new Map()
  function subscribe(fn,priority=0) {
    if(typeof fn!=='function')return ()=>{}
    listeners.set(fn,Number.isFinite(priority)?priority:0)
    return ()=>listeners.delete(fn)
  }
  function emit() {
    for(const [fn] of [...listeners].sort((a,b)=>b[1]-a[1]))if(fn()===true)return true
    return false
  }
  return {subscribe,emit}
}
