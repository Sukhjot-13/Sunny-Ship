import {useEffect,useMemo,useRef} from 'react'
import {useFrame,useThree} from '@react-three/fiber'
import * as THREE from 'three'
import {onInteract} from '../hooks/useInput.js'
import {useStore} from '../state/useStore.js'
import {setDynamic} from '../systems/collision.js'
import {surfaceCollisionBounds} from '../systems/surfaceCollision.js'
import {boxToThree,toThree} from '../systems/shipMeta.js'
import {voyage,LOG_BEARINGS,advanceVoyage,advanceCannon,operateCannon,channelAngle,channelName,dockBounds,rotatePoint,resetVoyage,shipYaw,shutterPose,startBurst} from '../systems/navigation.js'

const axisX=new THREE.Vector3(1,0,0),axisY=new THREE.Vector3(0,1,0),axisZ=new THREE.Vector3(0,0,1)
/** Apply an authored pivot rotation while preserving baked mesh offsets. */
function pivotNode(n,pivot,q,translation=new THREE.Vector3()){
 n.o.position.fromArray(n.p).sub(pivot).applyQuaternion(q).add(pivot).add(translation)
 n.o.quaternion.copy(n.q).premultiply(q)
}
/** Bounds of the same transformed corners used by each shutter mesh. */
function movingBounds(n,pivot,q,translation){
 const box=new THREE.Box3()
 for(const p of n.corners)box.expandByPoint(p.clone().sub(pivot).applyQuaternion(q).add(pivot).add(translation))
 return {name:n.name??n.o.name,min:box.min.toArray(),max:box.max.toArray(),isFloor:false}
}
/** Roll an inner shutter around its own tangent, then rotate with its bay. */
function innerGateBounds(n,centre,angle,progress){
 const tags=n.o.userData,radial=new THREE.Vector3(Math.cos(tags.sunny_inner_angle),0,-Math.sin(tags.sunny_inner_angle))
 const tangent=new THREE.Vector3(radial.z,0,-radial.x)
 const pivot=tags.sunny_inner_centre?new THREE.Vector3(...toThree(...tags.sunny_inner_centre)):n.centre
 const rolled=shutterPose([0,pivot.y,0],tags.sunny_roll_top,tags.sunny_roll_radius,tags.sunny_roll_travel,progress,'port')
 const tilt=new THREE.Quaternion().setFromAxisAngle(tangent,rolled.angle)
 const yaw=new THREE.Quaternion().setFromAxisAngle(axisY,angle)
 const shift=radial.multiplyScalar(rolled.centre[2]);shift.y=rolled.centre[1]-pivot.y
 const transform=p=>p.clone().sub(pivot).applyQuaternion(tilt).add(pivot).add(shift).sub(centre).applyQuaternion(yaw).add(centre)
 n.o.position.copy(transform(new THREE.Vector3(...n.p)))
 n.o.quaternion.copy(n.q).premultiply(tilt).premultiply(yaw)
 const box=new THREE.Box3();for(const p of n.corners)box.expandByPoint(transform(p))
 return {name:n.o.name,min:box.min.toArray(),max:box.max.toArray(),isFloor:false}
}
/** Cache exact mechanism bounds in the authored ship frame, excluding bobbing. */
function shipLocalBounds(node,inverse){
 const box=new THREE.Box3(),point=new THREE.Vector3(),matrix=new THREE.Matrix4()
 node.traverse(child=>{
  const positions=child.geometry?.attributes?.position
  if(!child.isMesh||!positions)return
  matrix.multiplyMatrices(inverse,child.matrixWorld)
  for(let i=0;i<positions.count;i++)box.expandByPoint(point.fromBufferAttribute(positions,i).applyMatrix4(matrix))
 })
 return box
}
/** Actual rudder skin sections in the same ship-local frame as its animation. */
function rudderSurfaceSections(node, inverse) {
 const triangles=[],point=new THREE.Vector3(),matrix=new THREE.Matrix4()
 node.traverse(child=>{
  const positions=child.geometry?.attributes?.position
  if(!child.isMesh||!positions)return
  matrix.multiplyMatrices(inverse,child.matrixWorld)
  const indices=child.geometry.index,count=indices?indices.count:positions.count
  for(let i=0;i<count;i+=3){
   const triangle=[]
   for(let k=0;k<3;k++)triangle.push(point.fromBufferAttribute(positions,indices?indices.getX(i+k):i+k).applyMatrix4(matrix).toArray())
   triangles.push(triangle)
  }
 })
 return surfaceCollisionBounds(triangles).map((box,i)=>{
  const corners=[]
  for(const x of [box.min[0],box.max[0]])for(const y of [box.min[1],box.max[1]])for(const z of [box.min[2],box.max[2]])corners.push(new THREE.Vector3(x,y,z))
  return {name:`${node.name}_surface_${i}`,corners}
 })
}
/** Wheel controls, guarded rolling apertures, mane/jaw/paddles and navigation. */
export function NavigationSystem({meta,keys}){
 const {camera}=useThree(),near=useRef(null),clock=useRef(0),nodes=useRef([]),root=useRef(null),effects=useRef(null),air=useRef([]),jaws=useRef([])
 const q=useMemo(()=>new THREE.Quaternion(),[]),pose=useMemo(()=>new THREE.Quaternion(),[])
 const layout=useMemo(()=>({centre:toThree(...(meta?.interiors?.dockCentre??[.45,1.17,-42.86])),solids:(meta?.interiors?.dockSolids??[]).map(b=>({...b,...boxToThree(b.min,b.max),...(b.footprint?{footprint:b.footprint.map(([x,y])=>[x,-y])}:{})})),mechanisms:meta?.exterior?.mechanisms??{}}),[meta])
 useEffect(()=>{
  const interact=onInteract(()=>{
   const s=useStore.getState()
   if(s.cameraMode!=='explore'||s.flying)return
   if(voyage.helm){voyage.helm=false;s.setHudMessage('Left the helm');return}
   if(!near.current)return
   if(near.current==='helm'){voyage.helm=true;s.setHudMessage('Helm: W/S speed · A/D steer · E release')}
   if(near.current==='log'){voyage.logNeedle=(voyage.logNeedle+1)%3;s.setHudMessage(`Log Pose simulation: needle ${voyage.logNeedle+1}, ${LOG_BEARINGS[voyage.logNeedle]}° illustrative bearing`)}
   if(near.current==='selector'){voyage.channel=(voyage.channel+1)%7;voyage.dockOpen=false;s.setHudMessage(`Channel ${voyage.channel}: ${channelName(voyage.channel)}`)}
   if(near.current==='lever'){voyage.dockOpen=!voyage.dockOpen;s.setHudMessage(voyage.dockOpen?'Soldier Dock: align, then roll shutters open':'Soldier Dock: close shutters')}
  })
  const operate=e=>{
   if(useStore.getState().cannonPanelOpen||e.target.closest?.('button, input, textarea, select, [contenteditable="true"]'))return
   if(e.code==='KeyR')resetVoyage()
   if(!voyage.helm||e.repeat)return
   const s=useStore.getState()
   if(e.code==='KeyG')s.setHudMessage(startBurst()?'Coup de Burst · three cola barrels spent':'Coup de Burst needs three cola barrels')
   if(e.code==='KeyT'){voyage.chicken=!voyage.chicken;s.setHudMessage(voyage.chicken?'Chicken Voyage: mane turning, reverse propulsion':'Chicken Voyage stopped')}
   if(e.code==='KeyJ')s.setHudMessage(operateCannon('toggle-mouth').message)
   if(e.code==='KeyK')s.setHudMessage(operateCannon('fire').message)
  }
  window.addEventListener('keydown',operate)
  window.__sunnyNavigation={get state(){return {...voyage}},get yaw(){return shipYaw()},get dockColliders(){return dockBounds(layout.solids,layout.centre,voyage.dockAngle)},get jawColliders(){return jaws.current},get innerGates(){return nodes.current.filter(n=>n.o.userData.sunny_inner_gate).map(n=>({name:n.o.name,channel:n.o.userData.sunny_dock_channel,position:n.o.position.toArray(),quaternion:n.o.quaternion.toArray()}))},get shutters(){return nodes.current.filter(n=>n.o.userData.sunny_dock_shutter&&!('sunny_dock_digit' in n.o.userData)).map(n=>({name:n.o.name,position:n.o.position.toArray(),quaternion:n.o.quaternion.toArray()}))}}
  return ()=>{interact();window.removeEventListener('keydown',operate);delete window.__sunnyNavigation;setDynamic(null,'dock');setDynamic(null,'dockShutters');setDynamic(null,'dockInner');setDynamic(null,'rudder');setDynamic(null,'figureheadJaw');resetVoyage()}
 },[layout])
 // Advance voyage and carry the local eye before Ship renders its current pose.
 useFrame((_,delta)=>{
  const store=useStore.getState(),explore=store.cameraMode==='explore',player=window.__sunny?.position??store.position
  if(!explore||store.flying)voyage.helm=false
  const occupied=Math.abs(player[1]-layout.centre[1])<3&&Math.hypot(player[0]-layout.centre[0],player[2]-layout.centre[2])<8.4
  const selectedAngle=Math.PI/2+(Math.max(1,voyage.channel)-1)*Math.PI/3
  const gate=rotatePoint([layout.centre[0]+2.30*Math.cos(selectedAngle),(meta?.interiors?.dockWaterLevel??layout.centre[1])+.45,layout.centre[2]-2.30*Math.sin(selectedAngle)],voyage.dockAngle,layout.centre)
  const innerOccupied=voyage.channel>0&&Math.abs(player[1]-gate[1])<2.6&&Math.hypot(player[0]-gate[0],player[2]-gate[2])<1.1
  const shutterOccupied=innerOccupied||(layout.mechanisms.dockOpenings??[]).some(d=>{const c=toThree(...d.centre);return Math.abs(player[2]-c[2])<1.5&&Math.hypot(player[0]-c[0],player[1]+.9-c[1])<d.radius+1})
  if(explore)advanceVoyage(delta,keys.current,occupied,shutterOccupied)
  else advanceCannon(delta)
  setDynamic(dockBounds(layout.solids,layout.centre,voyage.dockAngle),'dock')
  if(root.current!==window.__ship){
   root.current=window.__ship;nodes.current=[]
   root.current?.updateMatrixWorld(true)
   const inverse=root.current?root.current.matrixWorld.clone().invert():new THREE.Matrix4()
   root.current?.traverse(o=>{
    const tags=o.userData
    if(!(tags.sunny_dock_channel||tags.sunny_dock_shutter||tags.sunny_mane||tags.sunny_jaw||tags.sunny_paddle||tags.sunny_rudder||/Sunny_(?:Helm_(?:wheel|spoke|grip)|SoldierDock_|LogPose_needle)/.test(o.name)))return
    const box=shipLocalBounds(o,inverse),centre=box.getCenter(new THREE.Vector3()),corners=[]
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z))
    nodes.current.push({o,p:o.position.toArray(),q:o.quaternion.clone(),centre,corners,sections:tags.sunny_rudder?rudderSurfaceSections(o,inverse):null})
   })
  }
  const wheel=nodes.current.find(n=>n.o.name==='Sunny_Helm_wheel')
  const wheelPivot=wheel?.centre??new THREE.Vector3(),shutterBoxes=[],innerBoxes=[],rudderBoxes=[],jawBoxes=[]
  for(const n of nodes.current){
   const tags=n.o.userData
   if(tags.sunny_inner_gate||tags.sunny_inner_digit){
    const box=innerGateBounds(n,new THREE.Vector3(...layout.centre),voyage.dockAngle,tags.sunny_dock_channel===voyage.channel?voyage.shutter:0)
    if(tags.sunny_inner_gate)innerBoxes.push(box)
   }
   else if(tags.sunny_dock_channel){n.o.position.fromArray(rotatePoint(n.p,voyage.dockAngle,layout.centre));n.o.quaternion.copy(n.q).premultiply(q.setFromAxisAngle(axisY,voyage.dockAngle))}
   else if(tags.sunny_dock_shutter){
    const centre=tags.sunny_roll_centre?new THREE.Vector3(...toThree(...tags.sunny_roll_centre)):n.centre
    const rolled=shutterPose(centre.toArray(),tags.sunny_roll_top,tags.sunny_roll_radius,tags.sunny_roll_travel,voyage.shutter,tags.sunny_dock_shutter)
    const translation=new THREE.Vector3(...rolled.centre).sub(centre)
    q.setFromAxisAngle(axisX,rolled.angle);pivotNode(n,centre,q,translation)
    if('sunny_dock_digit' in tags)n.o.visible=tags.sunny_dock_digit===voyage.channel
    else shutterBoxes.push(movingBounds(n,centre,q,translation))
   }else if(tags.sunny_rudder){const pivot=new THREE.Vector3(...toThree(...tags.sunny_pivot));q.setFromAxisAngle(axisY,-voyage.wheel*.65);pivotNode(n,pivot,q);for(const section of n.sections)rudderBoxes.push(movingBounds(section,pivot,q,new THREE.Vector3()))}
   else if(tags.sunny_mane){q.setFromAxisAngle(axisX,voyage.maneAngle);pivotNode(n,new THREE.Vector3(...toThree(...tags.sunny_pivot)),q)}
   else if(tags.sunny_jaw){
    const pivot=new THREE.Vector3(...toThree(...tags.sunny_pivot))
    const axis=tags.sunny_jaw_axis?new THREE.Vector3(...toThree(...tags.sunny_jaw_axis)).normalize():axisZ
    q.setFromAxisAngle(axis,voyage.jaw*(tags.sunny_jaw_angle??1.05));pivotNode(n,pivot,q)
    if(n.o.name==='Sunny_Gaon_jaw'||n.o.name==='Sunny_Gaon_chin')jawBoxes.push(movingBounds(n,pivot,q,new THREE.Vector3()))
   }
   else if(tags.sunny_paddle){n.o.visible=voyage.channel===0&&voyage.shutter>.98;q.setFromAxisAngle(axisZ,voyage.paddleAngle*(tags.sunny_paddle==='port'?1:-1));pivotNode(n,new THREE.Vector3(...toThree(...tags.sunny_pivot)),q)}
   else if(/Helm_(wheel|spoke|grip)/.test(n.o.name)){q.setFromAxisAngle(axisX,voyage.wheel);pivotNode(n,wheelPivot,q)}
   else if(/SoldierDock_dial|SoldierDock_selector/.test(n.o.name)){q.setFromAxisAngle(axisX,-voyage.channel*Math.PI*2/7);pivotNode(n,wheelPivot,q)}
   else if(/SoldierDock_lever(?:_grip)?$/.test(n.o.name)){q.setFromAxisAngle(axisZ,-voyage.shutter*.35);const p=layout.mechanisms.controls?.targets?.lever;if(p)pivotNode(n,new THREE.Vector3(...toThree(...p)),q)}
   else if(n.o.name.startsWith('Sunny_LogPose_needle')){
    const i=Number(n.o.name.match(/needle(\d)/)?.[1]??0),a=-LOG_BEARINGS[i]*Math.PI/180-shipYaw()
    n.o.quaternion.copy(n.q).premultiply(q.setFromAxisAngle(axisY,a))
   }
  }
  setDynamic(shutterBoxes,'dockShutters')
  setDynamic(innerBoxes,'dockInner')
  setDynamic(rudderBoxes,'rudder')
  jaws.current=jawBoxes;setDynamic(jawBoxes,'figureheadJaw')
  pose.setFromEuler(new THREE.Euler(0,shipYaw(),voyage.pitch,'YXZ'))
  if(explore){camera.position.applyQuaternion(pose);camera.position.y+=voyage.lift;camera.quaternion.premultiply(pose)}
  if(effects.current){effects.current.quaternion.copy(pose);effects.current.position.y=voyage.lift}
  for(let i=0;i<air.current.length;i++){
   const mesh=air.current[i];if(!mesh)continue
   const burst=i<3,active=burst?voyage.burst>5.1:voyage.gaon>0
   mesh.visible=active
   if(active){const t=burst?6-voyage.burst:2.5-voyage.gaon;mesh.material.opacity=.22*(1-(t% .9)/.9);mesh.scale.setScalar(1+(t+i*.17)% .9*3)}
  }
  const controls=layout.mechanisms.controls
  const anchors=controls?['helm','log','selector','lever'].map(id=>({id,p:toThree(...controls[id])})):[]
  const nearby=anchors.map(({id,p})=>({id,d:Math.hypot(player[0]-p[0],player[2]-p[2]),vertical:Math.abs(player[1]-p[1])})).filter(a=>a.d<1.35&&a.vertical<.55).sort((a,b)=>a.d-b.d)[0]
  const yaw=window.__sunny?.yaw??0,pitch=window.__sunny?.pitch??0
  const forward=new THREE.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)),eye=new THREE.Vector3(player[0],player[1]+1.7,player[2])
  const aimed=Object.entries(controls?.targets??{}).map(([id,p])=>{const d=new THREE.Vector3(...toThree(...p)).sub(eye);return {id,d:d.length(),alignment:forward.dot(d.normalize())}}).filter(a=>a.d<2.2&&a.alignment>.96).sort((a,b)=>b.alignment-a.alignment)[0]
  near.current=explore&&!store.flying?(aimed?.id??nearby?.id):null
  clock.current+=delta
  if(clock.current>.2){clock.current=0;store.setNavigation({...voyage,prompt:voyage.helm?'E release · G Burst · T Chicken · J mouth · K Gaon':near.current?`E ${near.current==='log'?'Log Pose (simulation)':near.current==='selector'?'select dock channel':near.current==='lever'?'toggle dock shutters':'take helm'}`:occupied&&Math.abs(voyage.dockAngle-channelAngle(voyage.channel))>.02?'Dock paused: clear the turntable':''})}
 },-1)
 const outlets=[toThree(...(layout.mechanisms.burst?.outlet??[34,1.287,-41])),toThree(...(layout.mechanisms.lion?.outlet??[-42,1.287,-33]))]
 return <group ref={effects}>{Array.from({length:6},(_,i)=><mesh key={i} ref={o=>{air.current[i]=o}} position={[outlets[i<3?0:1][0]+(i<3?1:-1)*(i%3)*3,outlets[i<3?0:1][1]-(i<3?(i%3)*1.5:0),outlets[i<3?0:1][2]]} rotation={[0,Math.PI/2,0]} visible={false}><torusGeometry args={[i<3?2.5:.7,.10,6,40]}/><meshBasicMaterial color="#e6f1f4" transparent opacity={.2} depthWrite={false}/></mesh>)}</group>
}
