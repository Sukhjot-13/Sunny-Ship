import {BURST,burstAvailability,startBurst} from './navigation.js'
import {playShipSound} from './shipAudio.js'

function cue(audio,duration,sample){
 const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate)
 const data=buffer.getChannelData(0)
 let seed=7003,low=0,mid=0
 for(let i=0;i<data.length;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0
  const white=seed/2147483648-1
  low+=(white-low)*.020
  mid+=(white-mid)*.16
  const t=i/audio.sampleRate
  const envelope=Math.min(1,t*1400,Math.max(0,(duration-t)*45))
  data[i]=envelope*Math.tanh(sample(t,white,mid,low))
 }
 return buffer
}
const sine=cycles=>Math.sin(Math.PI*2*cycles)
function charge(audio){
 return cue(audio,BURST.charge,(t,white,mid)=>{
  const progress=t/BURST.charge
  const valve=(white-mid)*.17*Math.exp(-t*40)
  const hiss=(white-mid)*.25*progress**2
  const whine=sine(85*t+310*t*t)*.15*progress
  return valve+hiss+whine+mid*.35*progress
 })
}
function launch(audio){
 return cue(audio,BURST.flight,(t,white,mid,low)=>{
  const crack=(white-mid)*.63*Math.exp(-t*34)
  const surge=(sine(31*t+7*(1-Math.exp(-t*9)))*.61+mid*.9)*Math.exp(-t*4.6)
  const pressure=low*1.45*Math.exp(-t*1.5)
  const wind=(mid*.27+low*.75)*(1-Math.exp(-t*7))*Math.exp(-t*.47)
  return crack+surge+pressure+wind*(.85+.15*sine(t*2.3))
 })
}
function splash(audio){
 return cue(audio,BURST.landing+.45,(t,white,mid,low)=>{
  const hull=(sine(38*t+2*(1-Math.exp(-t*16)))*.45+low*.80)*Math.exp(-t*7.9)
  const flare=(white*.21+mid*.75)*Math.exp(-t*3.1)
  const surf=(mid*.38+low*.75)*(1-Math.exp(-t*8))*Math.exp(-t*1.65)
  return hull+flare+surf
 })
}

const sounds={charging:charge,airborne:launch,landing:splash}
let stop
export function playBurstCue(phase){
 stop?.()
 stop=phase in sounds?playShipSound('burst-'+phase,sounds[phase]):null
}

export function operateAudibleBurst(){
 if(!startBurst())return {ok:false,message:burstAvailability().reason}
 playBurstCue('charging')
 return {ok:true,message:'Coup de Burst · three cola barrels spent'}
}
