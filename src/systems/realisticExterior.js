/** Physical-scale exterior finishes, isolated from the existing room materials. */
import * as THREE from 'three'

const textures=new Map(),finishes=new Map(),TAU=Math.PI*2
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v))
const fract=v=>v-Math.floor(v)
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)}
const wave=v=>Math.sin(v*TAU)
/** Deterministic integer noise; no time-dependent grain or per-frame allocation. */
function hash(x,y,seed=0){
 let h=Math.imul(x^seed,374761393)+Math.imul(y,668265263)
 h=Math.imul(h^(h>>>13),1274126177)
 return ((h^(h>>>16))>>>0)/4294967295
}
/** Periodic smooth noise keeps every generated albedo/data tile seamless. */
function noise(u,v,fx,fy,seed=0){
 const x=u*fx,y=v*fy,ix=Math.floor(x),iy=Math.floor(y),sx=smooth(0,1,fract(x)),sy=smooth(0,1,fract(y))
 const at=(x,y)=>hash((x%fx+fx)%fx,(y%fy+fy)%fy,seed)
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix,iy),at(ix+1,iy),sx),THREE.MathUtils.lerp(at(ix,iy+1),at(ix+1,iy+1),sx),sy)
}
const profiles={
 boards:{size:1024,period:[4,1],coat:.12},
 grain:{size:1024,period:[4,.5],coat:.19},
 paintedBoards:{size:1024,period:[4,1],coat:.18},
 paint:{size:512,period:[1.8,.65],coat:.16},
 lacquer:{size:512,period:[1.8,.65],coat:.48},
 bark:{size:512,period:[1,.3],coat:0},
 metal:{size:512,period:[.3,.3],coat:.12,metalness:.85},
 iron:{size:512,period:[.4,.4],coat:.03,metalness:.58},
 rope:{size:512,period:[.16,.05],coat:0},
 lawn:{size:512,period:[.5,.5],coat:0},
 leaf:{size:512,period:[1,1],coat:.12},
 fruit:{size:512,period:[.08,.08],coat:.18},
 pot:{size:512,period:[.3,.3],coat:.28},
 soil:{size:512,period:[.25,.25],coat:0},
 canvas:{size:512,period:[.16,.16],coat:0},
 roof:{size:512,period:[1.2,.6],coat:.16},
}

/** Neutral albedo, actual relief in metres, and absolute surface roughness. */
function sample(role,u,v,x,y){
 const fine=hash(x,y,29)-.5,cloud=noise(u,v,4,4,7)-.5
 let tone=.97,height=0,rough=.7
 if(['boards','grain','paintedBoards','paint','lacquer'].includes(role)){
  const boards=role==='boards'||role==='paintedBoards'
  const painted=role==='paint'||role==='lacquer'||role==='paintedBoards'
  const lacquer=role==='lacquer'
  const row=boards?Math.floor(v*4):0,rowTone=hash(row,11,3),along=noise(u,v,8,4,13)-.5
  const du=fract(u-hash(row,5,8)+.5)-.5,dv=boards?fract(v*4)-.5:v-.5
  const knot=Math.exp(-(du*du*150+dv*dv*42))
  const warped=v+cloud*.014+along*.009+knot*wave(du*2)*.012
  const fibres=noise(u,warped,16,192,21)-.5,latewood=noise(u,warped,8,32,23)-.5
  const pores=smooth(.68,.88,noise(u,warped,32,256,19))
  const rings=wave(Math.sqrt(du*du*36+dv*dv*24)*10)*knot
  const grain=fibres*1.1+latewood*.8-pores*.4+rings*.16
  const broad=noise(u,v,3,5,34)-.5
  const scrapes=smooth(.69,.88,noise(u,warped,37,79,44))*smooth(.39,.76,noise(u,v,6,4,27))
  tone=painted?.935+grain*.070+cloud*.09+broad*.085-scrapes*.16:.85+grain*.24+cloud*.15+along*.095+broad*.15
  height=grain*(painted?.00015:.00042)-pores*.00016-scrapes*.00018
  rough=(lacquer?.27:painted?.54:.65)+cloud*.19-grain*.05+fine*.033+scrapes*.18
  if(boards){
   const edge=Math.min(fract(v*4),1-fract(v*4))*.25,end=Math.min(fract(u+hash(row,3)),1-fract(u+hash(row,3)))*4
   const distance=Math.min(edge,end)
   const gap=1-smooth(.002,.006,distance),bevel=1-smooth(.004,.012,distance)
   tone*=1-gap*(painted?.45:.62)
   tone*=painted?.95+rowTone*.05:.82+rowTone*.18
   tone-=bevel*.065
   height-=gap*.0015+bevel*.00042;rough+=gap*.20
  }
 }else if(role==='bark'){
  const ridge=wave(v*23+(noise(u,v,5,6,8)-.5)*.9),crack=Math.pow(.5+.5*ridge,10)
  tone=.82+cloud*.16-crack*.20+fine*.035;height=ridge*.0007-crack*.0013;rough=.93+fine*.04
 }else if(role==='metal'||role==='iron'){
  const brush=wave(v*137+(noise(u,v,8,8,3)-.5)*.15),wear=noise(u,v,16,16,31)-.5
  const tarnish=smooth(.33,.76,noise(u,v,5,7,62)+wear*.23)
  const pits=smooth(.68,.90,noise(u,v,95,103,64))
  tone=.97+fine*.025+wear*.063-tarnish*.27-pits*.13
  height=brush*.000008+fine*.000002-pits*.000015
  rough=(role==='iron'?.43:.25)+wear*.15+cloud*.09+brush*.019+tarnish*.23
 }else if(role==='rope'){
  const strand=wave(u*5+v*4),fibres=wave(u*31+v*103)
  tone=.87+strand*.075+cloud*.07+fine*.045;height=strand*.0007+fibres*.000065;rough=.91+cloud*.08
 }else if(role==='lawn'){
  const blade=Math.pow(.5+.5*wave(u*83+noise(u,v,17,11,4)*2),7),mottling=noise(u,v,12,12,9)-.5
  tone=.74+cloud*.26+mottling*.29+blade*.17+fine*.035;height=blade*.0026+fine*.00026;rough=.94+mottling*.09
 }else if(role==='leaf'){
  const centre=Math.exp(-Math.pow((v-.5)/.016,2)),vein=Math.exp(-Math.pow(wave(u*9+Math.abs(v-.5)*7)/.11,2))
  tone=.87+cloud*.10+centre*.07+vein*.035;height=centre*.0012+vein*.00045;rough=.47+cloud*.12+vein*.08
 }else if(role==='fruit'){
  const pores=Math.pow(hash(x,y,91),5)
  tone=.94+cloud*.04-pores*.06;height=-pores*.00008;rough=.48+cloud*.08+pores*.10
 }else if(role==='pot'){
  tone=.96+cloud*.025+fine*.012;height=fine*.000025;rough=.30+cloud*.13
 }else if(role==='soil'){
  tone=.79+cloud*.18+fine*.18;height=cloud*.0012+fine*.0007;rough=.98
 }else if(role==='canvas'){
  const weave=wave(u*128)*wave(v*128),slub=noise(u,v,8,32,13)-.5
  tone=.95+weave*.022+slub*.035;height=weave*.000035+slub*.000025;rough=.91+weave*.035
 }else if(role==='roof'){
  const rows=fract(v*3),joint=1-smooth(.008,.025,Math.min(rows,1-rows))
  tone=.94+cloud*.07-joint*.15;height=-joint*.0007+fine*.00002;rough=.52+cloud*.18
 }
 return [clamp(tone,.18,1),height,clamp(rough,.16,1)]
}

/** Repeating filtered maps; colour conversion is confined to albedo. */
function makeTexture(data,size,period,color=false){
 const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1/period[0],1/period[1])
 t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter
 t.generateMipmaps=true;t.anisotropy=8;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true
 return t
}

/** Shared PBR maps are generated once; normal slopes use the real tile size. */
export function realisticTextureSet(role){
 if(textures.has(role))return textures.get(role)
 const profile=profiles[role];if(!profile)throw Error(`Unknown realistic exterior surface ${role}`)
 const {size,period}=profile,albedo=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),heights=new Float32Array(size*size)
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,j=i*4,[tone,height,rough]=sample(role,x/size,y/size,x,y)
  const srgb=1.055*Math.pow(tone,1/2.4)-.055
  albedo[j]=albedo[j+1]=albedo[j+2]=Math.round(srgb*255);albedo[j+3]=255
  roughness[j]=roughness[j+1]=roughness[j+2]=Math.round(rough*255);roughness[j+3]=255;heights[i]=height
 }
 const at=(x,y)=>heights[((y+size)%size)*size+(x+size)%size]
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=-(at(x+1,y)-at(x-1,y))/(2*period[0]/size),ny=-(at(x,y+1)-at(x,y-1))/(2*period[1]/size),length=Math.hypot(nx,ny,1),j=(y*size+x)*4
  normal[j]=Math.round((nx/length*.5+.5)*255);normal[j+1]=Math.round((ny/length*.5+.5)*255);normal[j+2]=Math.round((1/length*.5+.5)*255);normal[j+3]=255
 }
 const result={map:makeTexture(albedo,size,period,true),normalMap:makeTexture(normal,size,period),roughnessMap:makeTexture(roughness,size,period),period,size}
 textures.set(role,result);return result
}

const outdoorFeatures=/^(?:AftEntryDeck|AftF2|AftFacade|AftFrontOrnament\d+|AquariumFrontPort\d+|AftEntrance|Anchor|AquariumDoorApproach|AquariumLadder|AquariumWindow|CoupDeBurst|CrowNestHatch|DiningWindow|Dock1|DockLadderHatch|DockNumber|DockSlat|ForedeckSupport|ForeEntryTunnel|ForePortGallery|ForeFrontPort\d+|ForeFacade\w*|ForeLanding|ForeUpperLanding|ForeStair|AftStair|ForePortRail|ForeStarRail|ForeUpperRail|ForeDoor|ForeDoorStarboard|ForeDoorApproach|ForeStarboardDoorApproach|WomensDoorApproach|Gaon|GardenDeck|GardenStair|Helm|HullPort\d+|HullPortCloset|KitchenChimney|KitchenHatch|Lantern|Lawn|LawnSidewalk-?1|LibraryDoor|LibraryRoof|Lion|LionEye|LionSmile|LogPose|Lookout|MainGaff|MastPlatform|Mikan\d+|Paddle|PopGreens|RobinGarden|SailTie|ShadeTree|Slide|SoldierDock|SternAccess|SternAccessDoor|SternBalcony|Swing|Usopp)$/
/** Protect authored room finishes/furniture while upgrading actual exterior. */
export function usesRealisticExterior(tags,name){
 if(!tags.sunny_uv_space)return !!tags.sunny_authored&&/^Sunny_(?:Lion_philtrum|MainGaff_roof_tie)(?:\.|$)/.test(name)
 if(!name.startsWith('Sunny_'))return true
 if(name.startsWith('Sunny_Library_lining_glass'))return true
 return outdoorFeatures.test(tags.sunny_feature??'')||/Sunny_(?:Door|Hatch)_(?:WomensDoor|ForeDoor|ForeToiletDoor|AquariumDoor|AftEntrance|PantryOutsideDoor|SickOutsideDoor|LibraryDoor|SternAccessDoor|CrowNestHatch|KitchenHatch|DockLadderHatch)/.test(name)
}

/** Surface identity comes from material and fitting context, never random colour. */
export function exteriorSurfaceRole(source,{wood='grain',name='',feature=''}={}){
 const label=source.name.replace('Sunny_','')
 if(label==='glass'||label==='tankwater')return 'glass'
 if(label==='rope'||label==='tarred_rope')return 'rope'
 if(/^leaf/.test(label))return 'leaf'
 if(label==='grass')return 'lawn'
 if(label==='orange')return 'fruit'
 if(label==='soil')return 'soil'
 if(name.includes('_pot'))return 'pot'
 if(label==='roof'||feature==='LibraryRoof'||name.startsWith('Sunny_Bath_roof'))return 'roof'
 if(label==='black'&&/LionEye|LionSmile|philtrum/.test(name))return 'lacquer'
 if(['gold','brass'].includes(label))return /Lion|Mane|Sphere001/.test(name)?'paint':'metal'
 if(/Anchor/.test(feature+name)&&label==='black')return 'iron'
 if(['deck','timber','darkwood'].includes(label))return ['boards','bark'].includes(wood)?wood:'grain'
 return wood==='boards'?'paintedBoards':'paint'
}

/** Physical finish with unchanged source palette; legacy room cache stays separate. */
export function realisticExteriorMaterial(source,options={}){
 const role=exteriorSurfaceRole(source,options)
 const mapped=options.uv!==false
 const waterline=['boards','grain','paint','paintedBoards'].includes(role)?options.waterline:null
 const key=`${source.name}:${source.color.getHexString()}:${role}:${mapped}:${waterline??'dry'}`
 if(finishes.has(key))return finishes.get(key)
 const profile=profiles[role]
 const m=new THREE.MeshPhysicalMaterial({name:source.name,color:source.color.clone(),side:THREE.DoubleSide,
  roughness:1,metalness:profile?.metalness??0,clearcoat:profile?.coat??.5,clearcoatRoughness:.42,envMapIntensity:1.05})
 if(role==='glass'){
  m.transparent=true;m.opacity=.20;m.roughness=.08;m.depthWrite=false;m.ior=1.5;m.clearcoat=1;m.clearcoatRoughness=.08;m.envMapIntensity=1.3
  applyClearGlazing(m)
 }else if(mapped){
  const set=realisticTextureSet(role);m.map=set.map;m.normalMap=set.normalMap;m.roughnessMap=set.roughnessMap
  m.normalScale.setScalar(role==='lacquer'?.45:role==='metal'?.65:role==='leaf'?.8:1)
  if(role==='leaf'){m.sheen=.18;m.sheenColor.copy(source.color);m.sheenRoughness=.8}
  if(Number.isFinite(waterline))applyHullWetness(m,waterline)
 }else m.roughness=role==='rope'?.91:.29
 m.userData.exteriorSurface=role;m.userData.finishVersion=2
 finishes.set(key,m);return m
}

export function applyClearGlazing(material){
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float glassFacing=abs(dot(normalize(vViewPosition),normal));
   diffuseColor.a*=.48+1.43*pow(1.0-glassFacing,2.6);`)
 }
 material.customProgramCacheKey=()=> 'clear-marine-glazing'
}

function applyHullWetness(material,waterline){
 material.onBeforeCompile=shader=>{
  shader.uniforms.hullWaterline={value:waterline}
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   varying vec3 vHullWaterPosition;`)
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
   vHullWaterPosition=(modelMatrix*vec4(transformed,1.0)).xyz;`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   uniform float hullWaterline;
   varying vec3 vHullWaterPosition;`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float grainStreak=sin(vHullWaterPosition.x*2.8+vHullWaterPosition.z*.89)*.27
                    +sin(vHullWaterPosition.x*.59-vHullWaterPosition.z*1.8)*.30;
   float heightAboveSea=vHullWaterPosition.y-hullWaterline+grainStreak;
   float damp=1.0-smoothstep(-.54,1.22,heightAboveSea);
   float salt=(smoothstep(.62,1.09,heightAboveSea)-smoothstep(1.09,1.42,heightAboveSea));
   diffuseColor.rgb*=mix(vec3(1.0),vec3(.47,.53,.57),damp);
   diffuseColor.rgb+=vec3(.032,.028,.022)*salt;`)
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,.32,damp*.74);`)
 }
 material.customProgramCacheKey=()=> 'hull-waterline'
}
