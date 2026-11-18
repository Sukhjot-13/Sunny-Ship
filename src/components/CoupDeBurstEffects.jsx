import {useMemo,useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import * as THREE from 'three'
import {BURST,sampleBurst,shipYaw,voyage} from '../systems/navigation.js'
import {toThree} from '../systems/shipMeta.js'

const THRUST_COUNT=116
const SPLASH_COUNT=192
const SPLASH_TIME=BURST.charge+BURST.flight
const vertexShader=`
 attribute float aSize;
 attribute float aOpacity;
 attribute float aBrightness;
 uniform float uViewport;
 varying float vOpacity;
 varying float vBrightness;
 void main(){
  vec4 view=modelViewMatrix*vec4(position,1.);
  gl_Position=projectionMatrix*view;
  gl_PointSize=clamp(aSize*uViewport*projectionMatrix[1][1]/max(1.,-view.z),1.,112.);
  vOpacity=aOpacity;
  vBrightness=aBrightness;
 }
`
const fragmentShader=`
 varying float vOpacity;
 varying float vBrightness;
 void main(){
  vec2 point=2.*gl_PointCoord-1.;
  float radius=length(point);
  float edge=radius+(sin(point.x*9.+point.y*7.)+sin(point.x*14.-point.y*10.))*.043;
  float mist=(1.-smoothstep(.18,1.,edge))*vOpacity;
  vec3 colour=mix(vec3(.42,.61,.72),vec3(1.10,1.14,1.20),vBrightness);
  gl_FragColor=vec4(colour,mist);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`

function effectParticles(){
 let seed=324
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
 const mist=Array.from({length:THRUST_COUNT},()=>{
  const at=BURST.charge+random()*.66,angle=random()*Math.PI*2,spread=Math.sqrt(random())
  const pose=sampleBurst(at)
  return {at,pose,angle,spread,size:1.9+random()*5.2,speed:18+random()*37,bright:.55+random()*.45}
 })
 const spray=Array.from({length:SPLASH_COUNT},(_,i)=>({
  at:SPLASH_TIME+random()*.20,side:i%2===0?1:-1,x:-32+random()*26,z:5+random()*6.5,
  vertical:30+random()*29,spread:10+random()*28,forward:11+random()*34,
  size:1.8+random()*4.4,bright:.63+random()*.37,
 }))
 return {
  mist,spray,position:new Float32Array(3*(THRUST_COUNT+SPLASH_COUNT)),
  size:new Float32Array(THRUST_COUNT+SPLASH_COUNT),opacity:new Float32Array(THRUST_COUNT+SPLASH_COUNT),
  brightness:new Float32Array([...mist,...spray].map(particle=>particle.bright)),
 }
}

/** Propellant and water stay behind at their simulated release positions. */
export function CoupDeBurstEffects({outlet,waterLevel}){
 const cloud=useRef(null)
 const particles=useMemo(effectParticles,[])
 const viewport=useMemo(()=>({uViewport:{value:1}}),[])
 const nozzle=useMemo(()=>toThree(...(outlet?.outlet??[34,1.287,-41])),[outlet])
 const radius=outlet?.radius??3.5

 useFrame(({size,gl})=>{
  const points=cloud.current
  if(!points)return
  const age=BURST.seconds-voyage.burst
  const firing=voyage.burst>0&&age>=BURST.charge&&age<BURST.charge+1.75
  const splashing=voyage.burst>0&&age>=SPLASH_TIME
  points.visible=firing||splashing
  if(!points.visible)return
  const {position,opacity,size:diameter,mist,spray}=particles
  const frame=sampleBurst(age)
  let count=0
  if(firing){
   for(let i=0;i<mist.length;i++){
    const p=mist[i],t=age-p.at,at=i*3
    opacity[i]=0
    if(t<0||t>1.10)continue
    const sin=Math.sin(p.pose.pitch),cos=Math.cos(p.pose.pitch)
    const spread=radius*p.spread*(.60+t*3.8)
    position[at]=nozzle[0]*cos-nozzle[1]*sin+frame.distance-p.pose.distance+p.speed*t
    position[at+1]=nozzle[0]*sin+nozzle[1]*cos+p.pose.lift+Math.cos(p.angle)*spread-4.5*t*t
    position[at+2]=nozzle[2]+Math.sin(p.angle)*spread
    diameter[i]=p.size*(1+t*2.6)
    opacity[i]=Math.min(1,.22+t*18)*Math.exp(-t*3.1)*.68
   }
   count=mist.length
  }else{
   opacity.fill(0,0,mist.length)
  }
  if(splashing){
   const drift=frame.distance-BURST.range
   for(let j=0;j<spray.length;j++){
    const p=spray[j],t=age-p.at,i=mist.length+j,at=i*3
    opacity[i]=0
    if(t<0)continue
    const rise=p.vertical*t-40*t*t
    if(rise<0)continue
    position[at]=p.x+drift-p.forward*t
    position[at+1]=waterLevel+.6+rise
    position[at+2]=nozzle[2]+p.side*(p.z+p.spread*t)
    diameter[i]=p.size*(1+t*1.4)
    opacity[i]=Math.min(.91,.34+t*9)*Math.exp(-t*1.55)
   }
   count=mist.length+spray.length
  }
  viewport.uViewport.value=size.height*gl.getPixelRatio()*.55
  points.rotation.y=shipYaw()
  points.geometry.setDrawRange(0,count)
  for(const name of ['position','aSize','aOpacity'])points.geometry.attributes[name].needsUpdate=true
 },-.4)

 return <points ref={cloud} name="Coup de Burst mist and spray" visible={false} frustumCulled={false}>
  <bufferGeometry>
   <bufferAttribute attach="attributes-position" args={[particles.position,3]} usage={THREE.DynamicDrawUsage}/>
   <bufferAttribute attach="attributes-aSize" args={[particles.size,1]} usage={THREE.DynamicDrawUsage}/>
   <bufferAttribute attach="attributes-aOpacity" args={[particles.opacity,1]} usage={THREE.DynamicDrawUsage}/>
   <bufferAttribute attach="attributes-aBrightness" args={[particles.brightness,1]}/>
  </bufferGeometry>
  <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={viewport} transparent depthWrite={false}/>
 </points>
}
