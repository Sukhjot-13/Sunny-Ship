/** Filtered exterior PBR maps in authored UV space; palette and geometry stay intact. */
import * as THREE from 'three'

const maps=new Map(),materials=new Map(),TAU=Math.PI*2
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n))
const fract=n=>n-Math.floor(n)
const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453)
const wave=n=>Math.sin(TAU*n)
const profiles={
 boards:{period:[4,1],roughness:.72,clearcoat:.06},
 grain:{period:[4,.5],roughness:.61,clearcoat:.14},
 bark:{period:[1,.25],roughness:.92,clearcoat:0},
 paint:{period:[.4,.4],roughness:.53,clearcoat:.18},
 metal:{period:[.2,.2],roughness:.38,clearcoat:.08},
 rope:{period:[.12,.04],roughness:.94,clearcoat:0},
 lawn:{period:[.4,.4],roughness:1,clearcoat:0},
 leaf:{period:[1,1],roughness:.64,clearcoat:.08},
 fruit:{period:[.05,.05],roughness:.55,clearcoat:.13},
 pot:{period:[.15,.15],roughness:.34,clearcoat:.3},
 soil:{period:[.12,.12],roughness:1,clearcoat:0},
 canvas:{period:[.16,.16],roughness:.94,clearcoat:0},
}

/** Periodic texture sample: neutral albedo factor, metre relief and roughness. */
function sample(kind,u,v,x,y){
 const noise=hash(x,y)-.5,soft=wave(u*3+wave(v*2)*.15)*wave(v*5)
 let tone=.98,height=0,rough=.94
 if(['grain','boards','bark'].includes(kind)){
  const grain=wave(v*31+.22*wave(u)+.09*wave(u*3))*.65+wave(v*107+.16*wave(u*2))*.25
  tone=.94+grain*.028+noise*.012;height=grain*.00014;rough=.89-grain*.035
  if(kind==='boards'){
   const row=Math.floor(v*4),rowPhase=fract(u+hash(row,7)),seam=Math.min(fract(v*4),1-fract(v*4))/4
   const joint=Math.min(rowPhase,1-rowPhase)*4,edge=Math.min(seam,joint)
   const gap=1-clamp(edge/.003)
   tone*=.93+hash(row,3)*.07;tone*=1-gap*.46;height-=gap*.0012;rough+=gap*.10
  }else if(kind==='bark'){
   const fissure=Math.pow(.5+.5*wave(v*19+.18*wave(u*3)),8)
   tone=.91-fissure*.10+soft*.025;height=grain*.0003-fissure*.0008;rough=.98
  }
 }else if(kind==='paint'){
  const brush=wave(v*53+.15*wave(u*3))*.7+noise*.3
  tone=.985+brush*.009;height=brush*.000025;rough=.91+soft*.025
 }else if(kind==='metal'){
  tone=.99+noise*.008;height=wave(v*127+.05*wave(u*2))*.000002;rough=.92+soft*.045
 }else if(kind==='rope'){
  const braid=wave(u*6+v*5),fibre=wave(v*67+u*12)
  tone=.94+braid*.035+noise*.012;height=braid*.00045+fibre*.000035;rough=.96
 }else if(kind==='lawn'){
  const blade=Math.pow(.5+.5*wave(u*37+.15*wave(v*7)),4)
  tone=.92+soft*.04+blade*.04+noise*.012;height=blade*.0006;rough=.99
 }else if(kind==='leaf'){
  const midrib=Math.exp(-Math.pow((v-.5)/.015,2)),veins=Math.exp(-Math.pow(wave(u*9+Math.abs(v-.5)*5)/.12,2))
  tone=.94+midrib*.035+veins*.015+soft*.025;height=midrib*.0009+veins*.00035;rough=.94
 }else if(kind==='fruit'){
  const pore=Math.pow(hash(x,y),4)
  tone=.97+soft*.018-pore*.025;height=-pore*.00005;rough=.91+soft*.04
 }else if(kind==='pot'){
  tone=.985+soft*.008;height=noise*.000015;rough=.92+soft*.035
 }else if(kind==='soil'){
  tone=.92+noise*.11+soft*.04;height=noise*.00035+soft*.00015;rough=.99
 }else if(kind==='canvas'){
  const weave=wave(u*128)*wave(v*128)
  tone=.977+weave*.012+soft*.008;height=weave*.000018;rough=.98
 }
 return [clamp(tone),height,clamp(rough)]
}

/** Configure every map with trilinear mipmaps and anisotropic filtering. */
function texture(data,size,period,color=false){
 const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
 t.wrapS=t.wrapT=THREE.RepeatWrapping
 t.repeat.set(1/period[0],1/period[1])
 t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter
 t.generateMipmaps=true;t.anisotropy=8
 t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace
 t.needsUpdate=true
 return t
}

/** Generate shared neutral albedo, physical relief normals and roughness maps. */
export function exteriorTextureSet(kind){
 if(maps.has(kind))return maps.get(kind)
 const profile=profiles[kind]
 if(!profile)throw new Error(`Unknown exterior surface ${kind}`)
 const size=512,albedo=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),height=new Float32Array(size*size)
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,j=i*4,[tone,h,r]=sample(kind,x/size,y/size,x,y)
  const srgb=tone<=.0031308?tone*12.92:1.055*Math.pow(tone,1/2.4)-.055
  albedo[j]=albedo[j+1]=albedo[j+2]=Math.round(srgb*255);albedo[j+3]=255
  roughness[j]=roughness[j+1]=roughness[j+2]=Math.round(r*255);roughness[j+3]=255;height[i]=h
 }
 const at=(x,y)=>height[((y+size)%size)*size+(x+size)%size]
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=-(at(x+1,y)-at(x-1,y))/(2*profile.period[0]/size),ny=-(at(x,y+1)-at(x,y-1))/(2*profile.period[1]/size),length=Math.hypot(nx,ny,1),i=(y*size+x)*4
  normal[i]=Math.round((nx/length*.5+.5)*255);normal[i+1]=Math.round((ny/length*.5+.5)*255);normal[i+2]=Math.round((1/length*.5+.5)*255);normal[i+3]=255
 }
 const result={map:texture(albedo,size,profile.period,true),normalMap:texture(normal,size,profile.period),roughnessMap:texture(roughness,size,profile.period),period:profile.period}
 maps.set(kind,result)
 return result
}

/** Resolve a physical finish without changing the sourced painted region. */
export function exteriorMaterial(source,{wood='grain',kind='planar',name=''}={}){
 const label=source.name.replace('Sunny_','')
 const timber=['deck','timber','darkwood'].includes(label),metal=['gold','brass'].includes(label)
 const glass=label==='glass'||label==='tankwater'
 const role=timber?wood:metal?'metal':label==='rope'?'rope':label==='grass'?'lawn':/^leaf/.test(label)?'leaf':label==='orange'?'fruit':label==='soil'?'soil':name.includes('_pot')?'pot':'paint'
 const key=`${source.name}:${role}:${glass}:${kind==='leaf'}`
 if(materials.has(key))return materials.get(key)
 const p=profiles[role]
 const m=new THREE.MeshPhysicalMaterial({name:source.name,color:source.color.clone(),side:THREE.DoubleSide,roughness:p.roughness,metalness:metal?.72:0,clearcoat:p.clearcoat,clearcoatRoughness:.48,envMapIntensity:.85})
 if(glass){
  m.transparent=true;m.opacity=label==='tankwater'?.16:.20;m.roughness=.12;m.depthWrite=false;m.clearcoat=.25
 }else{
  const set=exteriorTextureSet(role)
  m.map=set.map;m.normalMap=set.normalMap;m.roughnessMap=set.roughnessMap
  m.normalScale.set(role==='paint'?.45:role==='metal'?.3:.7,role==='paint'?.45:role==='metal'?.3:.7)
  if(kind==='leaf')m.normalScale.multiplyScalar(.6)
 }
 materials.set(key,m)
 return m
}
