/** Budgeted warm downlight from the existing authored marine pendants. */
import * as THREE from 'three'

/** Two shadowed fixtures at most; records remain in source/ship coordinates. */
export function createInteriorLightRig(records=[]){
 const group=new THREE.Group(),eye=new THREE.Vector3()
 const fixtures=records.map(record=>({...record,position:new THREE.Vector3(record.pos[0],record.pos[2],-record.pos[1]),distanceToEye:Infinity}))
 const slots=Array.from({length:2},()=>{
  const light=new THREE.SpotLight('#ffda98',0,12,1.22,.55,2),target=new THREE.Object3D()
  light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.camera.near=.12
  light.shadow.bias=-.00008;light.shadow.normalBias=.025;light.shadow.radius=2
  light.target=target;group.add(light,target)
  return {light,target,fixture:null}
 })
 group.name='InteriorPendantLighting'
 /** Select nearby existing lamps, fading at the room-light budget boundary. */
 function update(camera,delta){
  group.updateWorldMatrix(true,false)
  camera.getWorldPosition(eye);group.worldToLocal(eye)
  for(const f of fixtures)f.distanceToEye=f.position.distanceTo(eye)
  fixtures.sort((a,b)=>a.distanceToEye-b.distanceToEye)
  const nearest=fixtures.slice(0,slots.length).filter(f=>f.distanceToEye<12)
  // Keep a fixture in its existing slot when distance ordering crosses over.
  // Resetting both slots every crossover otherwise makes nearby lamps flicker.
  const retained=new Set(slots.filter(s=>nearest.includes(s.fixture)).map(s=>s.fixture))
  const pending=nearest.filter(f=>!retained.has(f))
  for(let i=0;i<slots.length;i++){
   const slot=slots[i],f=nearest.includes(slot.fixture)?slot.fixture:pending.shift(),active=!!f
   if(active&&slot.fixture!==f){
    slot.fixture=f;slot.light.position.copy(f.position);slot.target.position.copy(f.position).add(new THREE.Vector3(0,-1,0))
    slot.light.color.set(f.colour);slot.light.intensity=0
   }
   const wanted=active?f.intensity*(1-THREE.MathUtils.smoothstep(f.distanceToEye,8,12)):0
   slot.light.intensity=THREE.MathUtils.damp(slot.light.intensity,wanted,9,Math.min(delta,.1))
  }
 }
 /** Free only this rig's two shadow targets when the ship is replaced. */
 function dispose(){for(const {light} of slots)light.dispose();group.clear()}
 return {group,update,dispose,slots}
}
