let context, output
const clips=new Map()

/** Play synthesized ship cues through the same limiter. */
export function playShipSound(name,makeClip){
 const Audio=globalThis.AudioContext??globalThis.webkitAudioContext
 if(!Audio)return null
 try{
  context??=new Audio()
  if(!output){
   output=context.createDynamicsCompressor()
   output.threshold.value=-10
   output.knee.value=10
   output.ratio.value=12
   output.attack.value=.003
   output.release.value=.23
   output.connect(context.destination)
  }
  if(!clips.has(name))clips.set(name,makeClip(context))
  const source=context.createBufferSource()
  source.buffer=clips.get(name)
  source.connect(output)
  source.onended=()=>source.disconnect()
  source.start()
  if(context.state==='suspended')void context.resume().catch(()=>{})
  return ()=>{try{source.stop()}catch{}}
 }catch{
  return null
 }
}
