/** Budgeted warm downlight from the existing authored marine pendants. */
import * as THREE from 'three'

const utilityFixtures = [
 {room:'Storage Room',pos:[-24,-3,-41.05],colour:'#ffd4a1',intensity:33,distance:13},
 {room:'Storage Room',pos:[-14,4,-41.05],colour:'#ffd4a1',intensity:29,distance:11},
 {room:'Soldier Dock System',pos:[-5.3,-5.7,-41.05],colour:'#e1ecff',intensity:44,distance:13},
 {room:'Soldier Dock System',pos:[5.85,7.05,-41.05],colour:'#f9e4c7',intensity:42,distance:13},
 {room:'Fore Port Toilet',pos:[-15.91,-3.70,-38.63],colour:'#ffe1bf',intensity:4,distance:3},
 {room:'Fore Starboard Toilet',pos:[-15.91,3.70,-38.63],colour:'#ffe1bf',intensity:4,distance:3},
]

export function interiorLightingRecords(interiors) {
 const rooms = new Set(interiors.rooms.map(room => room.name))
 return [...(interiors.lights ?? []), ...utilityFixtures.filter(({room}) => rooms.has(room)).map(record => ({...record, utility:true}))]
}

/** Two shadowed fixtures at most; records remain in source/ship coordinates. */
export function createInteriorLightRig(records=[],rooms=[]){
 const group=new THREE.Group(),eye=new THREE.Vector3()
 const indoor = rooms.length > 0
 const roomPriority = [...rooms].reverse()
 const fixtures=records.map(record=>({...record,position:new THREE.Vector3(record.pos[0],record.pos[2],-record.pos[1]),distanceToEye:Infinity,score:Infinity}))
 const resourceList=[]
 if(fixtures.some(f=>f.utility)){
  const cover=new THREE.CapsuleGeometry(.105,.30,3,12).rotateZ(Math.PI*.5)
  const mount=new THREE.BoxGeometry(.53,.095,.25)
  const bronze=new THREE.MeshStandardMaterial({color:'#665649',roughness:.46,metalness:.62})
  const opal=new THREE.MeshStandardMaterial({color:'#d7cfbe',emissive:'#ffddb4',emissiveIntensity:2.5,roughness:.48})
  resourceList.push(cover,mount,bronze,opal)
  for(const f of fixtures.filter(f=>f.utility)){
   const housing=new THREE.Mesh(mount,bronze),diffuser=new THREE.Mesh(cover,opal)
   housing.position.copy(f.position)
   housing.position.y+=.095
   diffuser.position.copy(f.position)
   diffuser.position.y+=.021
   // Keep the source beneath its diffuser, including the low washroom ceilings.
   f.position.y-=.09
   group.add(housing,diffuser)
  }
 }
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
  const room=roomPriority.find(({min,max})=>eye.x>=min.x&&eye.x<=max.x&&eye.y>=min.y&&eye.y<=max.y&&eye.z>=min.z&&eye.z<=max.z)?.name
  for(const f of fixtures){
   f.distanceToEye=f.position.distanceTo(eye)
   f.score=f.distanceToEye+(room&&f.room!==room?5:0)
  }
  fixtures.sort((a,b)=>a.score-b.score)
  const nearest=fixtures.filter(f=>f.distanceToEye<(f.distance??12)+(indoor?2:0)).slice(0,slots.length)
  // Keep a fixture in its existing slot when distance ordering crosses over.
  // Resetting both slots every crossover otherwise makes nearby lamps flicker.
  const retained=new Set(slots.filter(s=>nearest.includes(s.fixture)).map(s=>s.fixture))
  const pending=nearest.filter(f=>!retained.has(f))
  for(let i=0;i<slots.length;i++){
   const slot=slots[i],f=nearest.includes(slot.fixture)?slot.fixture:pending.shift(),active=!!f
   if(active&&slot.fixture!==f){
    slot.fixture=f
    slot.light.position.copy(f.position)
    slot.target.position.copy(f.position)
    slot.target.position.y-=1
    if(indoor&&f.room==='Dining Room')slot.target.position.x-=.33
    slot.light.color.set(f.colour)
    slot.light.distance=f.distance??12
    slot.light.penumbra=indoor?.73:.55
    slot.light.intensity=0
   }
   const range=(f?.distance??12)+(indoor?2:0)
   const wanted=active?f.intensity*(indoor?1.36:1)*(1-THREE.MathUtils.smoothstep(f.distanceToEye,range-4,range)):0
   slot.light.intensity=THREE.MathUtils.damp(slot.light.intensity,wanted,9,Math.min(delta,.1))
  }
 }
 /** Free only this rig's two shadow targets when the ship is replaced. */
 function dispose(){
  for(const {light} of slots)light.dispose()
  for(const resource of resourceList)resource.dispose()
  group.clear()
 }
 return {group,update,dispose,slots}
}
