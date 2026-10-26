import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'

/** Budgeted planar reflection. Waves distort this image in the water shader. */
export function createOceanReflection(waterLevel, size=512) {
 const geometry=new THREE.PlaneGeometry(1,1)
 const reflector=new Reflector(geometry,{textureWidth:size,textureHeight:size,clipBias:.002,multisample:0})
 reflector.rotation.x=-Math.PI/2;reflector.position.y=waterLevel;reflector.updateMatrixWorld(true)
 const target=reflector.getRenderTarget(),inverse=reflector.matrixWorld.clone().invert()
 target.texture.generateMipmaps=true;target.texture.minFilter=THREE.LinearMipmapLinearFilter
 const matrix=new THREE.Matrix4(),direction=new THREE.Vector3()
 let tick=0,frames=0,ready=false
 return {
  texture:target.texture,matrix,target,
  get frames(){return frames},get ready(){return ready},
  /** Render only above the surface; retain main-camera hooks and visibility. */
  update({gl,scene,camera},waterMeshes,{hullProfile=[],yaw=0}={}){
   // From inside the hull, a level view cannot see the ship's reflection
   // beneath its own deck. Distant visible water still reflects analytic sky.
   const c=Math.cos(yaw),s=Math.sin(yaw),x=c*camera.position.x-s*camera.position.z,z=s*camera.position.x+c*camera.position.z
   let inside=false
   for(let i=0;i<hullProfile.length-1;i++){
    const a=hullProfile[i],b=hullProfile[i+1]
    if(x<a[0]||x>b[0])continue
    const t=(x-a[0])/Math.max(b[0]-a[0],.001)
    inside=z>=THREE.MathUtils.lerp(a[1],b[1],t)&&z<=THREE.MathUtils.lerp(a[2],b[2],t);break
   }
   camera.getWorldDirection(direction)
   if(camera.position.y<=waterLevel||(inside&&camera.position.y>waterLevel+8&&direction.y>-.3)){
    ready=false;tick=0;return false
   }
   if(tick++%4!==0)return false
   if(!gl.extensions.has('EXT_color_buffer_float')&&target.texture.type!==THREE.UnsignedByteType){target.texture.type=THREE.UnsignedByteType;target.dispose()}
   camera.updateMatrixWorld(true)
   const visible=waterMeshes.map(mesh=>mesh?.visible),before=scene.onBeforeRender
   const currentTarget=gl.getRenderTarget(),xr=gl.xr.enabled,shadows=gl.shadowMap.autoUpdate,clearAlpha=gl.getClearAlpha()
   try{
    waterMeshes.forEach(mesh=>{if(mesh)mesh.visible=false})
    gl.setClearAlpha(0)
    // Survey hooks must not overwrite the mirrored camera with a main pose.
    scene.onBeforeRender=function(renderer,renderScene,renderCamera,...rest){if(renderCamera===camera)before.call(this,renderer,renderScene,renderCamera,...rest)}
    reflector.onBeforeRender(gl,scene,camera)
    matrix.copy(reflector.material.uniforms.textureMatrix.value).multiply(inverse)
    ready=true;frames++;return true
   }finally{
    waterMeshes.forEach((mesh,i)=>{if(mesh)mesh.visible=visible[i]})
    scene.onBeforeRender=before;gl.xr.enabled=xr;gl.shadowMap.autoUpdate=shadows;gl.setRenderTarget(currentTarget);gl.setClearAlpha(clearAlpha)
   }
  },
  dispose(){reflector.dispose();geometry.dispose()},
 }
}
