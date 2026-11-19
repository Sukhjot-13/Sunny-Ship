const MOTION_INTERVAL=100
const BOB_INTERVAL=320

function trackPose(object){
 const position=object.position.clone(),rotation=object.quaternion.clone()
 let visible=object.visible
 return {
  changed(distanceSq=.000144,rotationDelta=.000002){
   return object.visible!==visible||object.position.distanceToSquared(position)>distanceSq||
    1-Math.abs(object.quaternion.dot(rotation))>rotationDelta
  },
  capture(){
   position.copy(object.position)
   rotation.copy(object.quaternion)
   visible=object.visible
  },
 }
}

/** Keep the depth maps between meaningful caster or light changes. */
export function installShipShadows(renderer,scene,camera,hull,movingNodes,interiorLights){
 const before=scene.onBeforeRender
 const oldAutoUpdate=renderer.shadowMap.autoUpdate
 const hullPose=trackPose(hull),moving=movingNodes.map(trackPose)
 const lamps=interiorLights.map(light=>({
  light,pose:trackPose(light),target:trackPose(light.target),
  active:false,autoUpdate:light.shadow.autoUpdate,
 }))
 for(const {light} of lamps)light.shadow.autoUpdate=false
 renderer.shadowMap.autoUpdate=false
 let lastUpdate=-Infinity
 const onBeforeRender=function(gl,renderScene,renderCamera,...args){
  before.call(this,gl,renderScene,renderCamera,...args)
  if(renderCamera!==camera||!gl.shadowMap.enabled)return
  const now=performance.now(),elapsed=now-lastUpdate
  if(elapsed<MOTION_INTERVAL)return
  const hullChanged=hullPose.changed()
  const castersChanged=moving.some(pose=>pose.changed())
  const lampsChanged=lamps.some(({light,pose,target,active})=>
   light.intensity>.01&&(!active||!light.shadow.map||pose.changed()||target.changed()))
  // Slow Inspect bobbing can reuse a map longer than the launch and mechanisms.
  const significantHullChange=hullPose.changed(.04,.000034)||(elapsed>=BOB_INTERVAL&&hullChanged)
  if(Number.isFinite(lastUpdate)&&!castersChanged&&!lampsChanged&&!significantHullChange)return

  gl.shadowMap.needsUpdate=true
  for(const lamp of lamps){
   const {light,pose,target}=lamp
   if(light.intensity>.01){
    light.shadow.needsUpdate=true
    pose.capture()
    target.capture()
    lamp.active=true
   }else lamp.active=false
  }
  lastUpdate=now
  hullPose.capture()
  for(const pose of moving)pose.capture()
 }
 scene.onBeforeRender=onBeforeRender
 return ()=>{
  if(scene.onBeforeRender===onBeforeRender)scene.onBeforeRender=before
  renderer.shadowMap.autoUpdate=oldAutoUpdate
  for(const {light,autoUpdate} of lamps)light.shadow.autoUpdate=autoUpdate
 }
}
