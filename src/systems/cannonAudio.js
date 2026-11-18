import {operateCannon} from './navigation.js'
import {playShipSound} from './shipAudio.js'

function makeBlast(audio){
 const buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*1.8),audio.sampleRate)
 const data=buffer.getChannelData(0)
 let seed=4367,noiseBody=0,noiseTail=0,phase=0
 for(let i=0;i<data.length;i++){
  const t=i/audio.sampleRate
  seed=(Math.imul(seed,1664525)+1013904223)>>>0
  const noise=seed/2147483648-1
  noiseBody+=(noise-noiseBody)*.10
  noiseTail+=(noise-noiseTail)*.025
  phase+=2*Math.PI*(29+60*Math.exp(-t*9))/audio.sampleRate
  const attack=Math.min(1,t*650),fade=Math.min(1,(1.8-t)*12)
  const crack=(noise-noiseBody)*.33*Math.exp(-t*37)
  const body=(Math.sin(phase)*.47+noiseBody*.67)*Math.exp(-t*6.2)
  const rush=noiseTail*.58*(1-Math.exp(-t*20))*Math.exp(-t*2.7)
  data[i]=attack*fade*Math.tanh(crack+body+rush)
 }
 return buffer
}

/** Play the same sound for a successful shot from the panel or the helm. */
export function operateAudibleCannon(action){
 const result=operateCannon(action)
 if(action==='fire'&&result.ok)playShipSound('gaon',makeBlast)
 return result
}
