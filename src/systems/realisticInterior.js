/** Room finishes on the existing meshes; no construction or palette changes. */
import * as THREE from 'three'
import {applyClearGlazing,realisticTextureSet} from './realisticExterior.js'
import {applyAquariumFloorLight} from './aquariumFinish.js'
import {applyInteriorBounce} from './interiorBounce.js'

const maps=new Map(),materials=new Map(),TAU=Math.PI*2
const clamp=v=>Math.max(0,Math.min(1,v))
const displayGamma=value=>value<=.0031308?value*12.92:1.055*Math.pow(value,1/2.4)-.055
const profiles={
 upholstery:{period:[.064,.064],roughness:.88,relief:.000055,sheen:.28},
 linen:{period:[.08,.08],roughness:.93,relief:.00004,sheen:.16},
 curtain:{period:[.08,.08],roughness:.9,relief:.000035,sheen:.24},
 tile:{period:[.28,.28],roughness:.24,relief:.000006,coat:.5},
 porcelain:{period:[.18,.18],roughness:.18,relief:.000003,coat:.7},
 paper:{period:[.12,.12],roughness:.94,relief:.000014},
 bookcloth:{period:[.043,.046],roughness:.81,relief:.000065,sheen:.12},
 leather:{period:[.067,.061],roughness:.57,relief:.000038,coat:.16},
 'bath-stone':{period:[1.22,1.22],roughness:.37,relief:.0014,coat:.3},
 marble:{period:[1.74,1.23],roughness:.32,relief:.000028,coat:.44},
 hessian:{period:[.153,.162],roughness:.95,relief:.00015,sheen:.12},
 rubber:{period:[.091,.091],roughness:.84,relief:.00008},
 vinyl:{period:[.13,.13],roughness:.42,relief:.000019,coat:.28},
 enamel:{period:[.175,.175],roughness:.34,relief:.000016,coat:.40},
 plaster:{period:[1.12,.98],roughness:.82,relief:.00032},
}
/** Stable periodic noise for fine fibres and fired glaze, without animation. */
function noise(u,v,seed=1){
 return Math.sin(TAU*(u*7+v*3)+seed)*Math.sin(TAU*(u*3-v*11)-seed)*.5+
  Math.sin(TAU*(u*29+v*17)+seed*2)*.25
}

function marbleVein(u,v){
 const bend=.15*noise(u,v,2)+.041*Math.sin(TAU*(u*13+v*7))
 const primary=Math.sin(TAU*(u*2-v*3+bend))
 const secondary=Math.sin(TAU*(u*5-v*7+bend*1.7+.27))
 return Math.pow(1-Math.abs(primary),12)*.78+Math.pow(1-Math.abs(secondary),25)*.22
}

function stoneChip(u,v){
 const cells=7,x=u*cells,y=v*cells
 let chip=0,tint=0,selection=Infinity
 const seed=(a,b,offset)=>{
  const phase=((a+cells)%cells)*127.1+((b+cells)%cells)*311.7+offset
  const wave=Math.sin(phase)*43758.5453
  return wave-Math.floor(wave)
 }
 for(let row=-1;row<=1;row++)for(let column=-1;column<=1;column++){
  const a=Math.floor(x)+column,b=Math.floor(y)+row
  const spread=.29+seed(a,b,13)*.20
  const first=x-a-.24-.48*seed(a,b,5),second=y-b-.22-.50*seed(a,b,19)
  const distance=Math.hypot(first+.20*second,second*(.88+.33*seed(a,b,31)))/spread
  if(distance<selection){selection=distance;chip=clamp((1.03-distance)*8);tint=seed(a,b,61)}
 }
 return {chip,tint}
}
/** Colour-managed mipmapped maps; repetition is measured in metres. */
function texture(data,size,period,color=false){
 const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
 t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1/period[0],1/period[1])
 t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter
 t.generateMipmaps=true;t.anisotropy=8;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true
 return t
}
/** Cache fabric, paper and ceramic maps; timber/metals share exterior map data only. */
export function interiorTextureSet(role){
 if(!profiles[role])return realisticTextureSet(role)
 if(maps.has(role))return maps.get(role)
 const p=profiles[role],size=512,count=size*size
 const fabric=['upholstery','linen','curtain','bookcloth','hessian'].includes(role)
 const albedo=new Uint8Array(count*4),normal=new Uint8Array(count*4),roughness=new Uint8Array(count*4),height=new Float32Array(count)
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,i=y*size+x,j=i*4,n=noise(u,v)
  const warp=Math.sin(TAU*u*64),weft=Math.sin(TAU*v*64),weave=warp*weft
  const stone=role==='bath-stone'?stoneChip(u,v):null
  const marble=role==='marble'?marbleVein(u,v):0
  const slub=noise(u*2,v,3), plaster=role==='plaster'
  const pores=Math.pow(Math.max(0, noise(u*5,v*6,19)-.12), 2)
  const fibres=stone?stone.chip*.67+n*.09:fabric?weave*.56+slub*.26+n*.18:plaster?n*.53-pores*.55:n
  const tone=clamp((stone?.95-stone.chip*(.13+stone.tint*.22)+n*.035:(fabric?.93:plaster?.94:.985)+fibres*(fabric?.095:plaster?.13:.016))-marble*.23)
  albedo[j]=Math.round(displayGamma(clamp(tone+(stone?.chip??0)*.04))*255)
  albedo[j+1]=Math.round(displayGamma(tone)*255)
  albedo[j+2]=Math.round(displayGamma(clamp(tone+(stone?.chip??0)*(.12-(stone?.tint??0)*.08)))*255);albedo[j+3]=255
  roughness[j]=roughness[j+1]=roughness[j+2]=Math.round(clamp(p.roughness+fibres*(stone?.13:fabric?.075:plaster?.14:.055)+marble*.06)*255);roughness[j+3]=255
  height[i]=fibres*p.relief
 }
 const at=(x,y)=>height[((y+size)%size)*size+(x+size)%size]
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=-(at(x+1,y)-at(x-1,y))/(2*p.period[0]/size),ny=-(at(x,y+1)-at(x,y-1))/(2*p.period[1]/size),length=Math.hypot(nx,ny,1),j=(y*size+x)*4
  normal[j]=Math.round((nx/length*.5+.5)*255);normal[j+1]=Math.round((ny/length*.5+.5)*255);normal[j+2]=Math.round((1/length*.5+.5)*255);normal[j+3]=255
 }
 const result={map:texture(albedo,size,p.period,true),normalMap:texture(normal,size,p.period),roughnessMap:texture(roughness,size,p.period),period:p.period,size}
 maps.set(role,result);return result
}

/** Upgrade authored rooms/furniture only after the exterior classifier has declined. */
export function usesRealisticInterior(tags,name){
 return !!tags.sunny_authored&&name.startsWith('Sunny_')&&(tags.sunny_fabric||
  /^(?:Aquarium|B1$|Bath|Dining|AftRearWindow|AftSideWindow|Dock(?:$|Ladder)|Energy|Factory|FoodLift|ForeF1|ForeF2|ForeToilet|Interior|Kitchen$|Kotatsu|Library$|MensWash|Pantry|Quarters|RoomLamp|RoomPartition|Sick|Storage|Store|SurveyGym|Vehicle|Wash|Weapons|Womens|Workshop|WWash)/.test(tags.sunny_feature??'')||
  /^Sunny_(?:Door_|Hatch_|Energy_)/.test(name))
}
/** Retain the authored surface identity and existing patterned colour regions. */
export function interiorSurfaceRole(source,{name='',wood='grain',fabric=false}={}){
 const label=source.name.replace('Sunny_','')
 if(label==='lamp_glow')return 'lamp'
 if(label==='tankwater')return 'water'
 if(label==='bath_water')return 'bath-water'
 if(label==='bath_stone')return 'bath-stone'
 if(label==='bath_pipe')return 'steel'
 if(/^bath_(?:jade|porcelain|enamel|tile)$/.test(label))return 'porcelain'
 if(/^bath_(?:cedar|amber)$/.test(label))return 'boards'
 if(label==='dining_floor_oak')return 'boards'
 if(/^dining_(?:oak|walnut)$/.test(label))return 'grain'
 if(label==='kitchen_marble')return 'marble'
 if(label==='kitchen_enamel'||label==='kitchen_oven_glaze')return 'porcelain'
 if(label==='kitchen_steel')return 'steel'
 if(label==='kitchen_walnut')return 'grain'
 if(/^cloth_pantry_/.test(label))return 'hessian'
 if(/^pantry_(?:oak|endgrain)$/.test(label))return 'grain'
 if(label==='pantry_ceramic'||label==='sick_powdercoat')return 'porcelain'
 if(/^cloth_sick_/.test(label))return 'linen'
 if(label==='sick_cork')return 'paper'
 if(/^quarters_(?:oak|walnut)$/.test(label))return 'grain'
 if(/^cloth_(?:quarters|womens)_/.test(label))return 'linen'
 if(label==='quarters_cannon_iron')return 'iron'
 if(label==='quarters_porcelain'||label==='quarters_locker_enamel'||label==='womens_wardrobe_enamel')return 'porcelain'
 if(/^(?:workshop_(?:maple|oak)|lookout_(?:ash|wood_trim))$/.test(label))return 'grain'
 if(label==='dock_deck_oak')return 'boards'
 if(label==='workshop_cast_iron'||label==='lookout_training_iron')return 'iron'
 if(label==='workshop_steel'||label==='lookout_optic_metal')return 'steel'
 if(label==='workshop_copper')return 'brass'
 if(label==='dock_rubber'||label==='lookout_mat')return 'rubber'
 if(/^dock_pool_vinyl_/.test(label))return 'vinyl'
 if(/^dock_(?:porcelain_paint|marine_(?:blue|red))$/.test(label)||label==='workshop_painted_steel')return 'enamel'
 if(label==='glass')return /mirror/i.test(name)?'mirror':'glass'
 if(/^tile_/.test(label))return 'tile'
 if(label==='paper'||label.startsWith('paper_'))return 'paper'
 if(/^library_binding\d+$/.test(label))return 'bookcloth'
 if(label==='library_leather'||label==='library_log')return 'leather'
 if(/^library_(?:walnut|oak|inlay|casing)$/.test(label))return label==='library_casing'?'boards':'grain'
 if(label==='linen')return 'linen'
 if(label.startsWith('upholstery_'))return 'upholstery'
 if(label==='cloth_aquarium')return 'curtain'
 if(label==='cloth_aqua'||fabric)return /curtain|canopy/i.test(name)?'curtain':'linen'
 if(/cushion|mattress|pillow|blanket|quilt|sofa|armchair/i.test(name)&&!['timber','deck','darkwood','gold','brass','black','steel'].includes(label))return 'upholstery'
 if(['gold','brass'].includes(label))return 'brass'
 if(label==='steel')return 'steel'
 if(label==='black'&&/cannon|barrel|furnace|boiler|oven|stove|machine/i.test(name))return 'iron'
 if(['deck','timber','darkwood'].includes(label))return wood==='boards'||/InteriorFloor|_ceiling|_floor/.test(name)?'boards':'grain'
 if(label==='white'&&/sink|basin|toilet|bath_(?:tub|rim)|plate|dish|cup|teapot|bowl|bottle|jar/i.test(name))return 'porcelain'
 if(/^(?:cream|white|ivory)$/.test(label)&&/shell|lining|wall|ceiling|partition/i.test(name))return 'plaster'
 if(label==='rope')return 'rope'
 if(label==='grass')return 'lawn'
 if(/^leaf/.test(label))return 'leaf'
 if(label==='soil')return 'soil'
 if(label==='orange')return 'fruit'
 return 'paint'
}

/** Add metric projection attributes to a private clone, retaining every shape/index/UV. */
export function interiorGeometry(mesh){
 const g=mesh.geometry.clone(),p=g.getAttribute('position'),n=g.getAttribute('normal')
 const position=new Float32Array(p.count*3),normal=new Float32Array(p.count*3)
 const normalMatrix=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),v=new THREE.Vector3()
 for(let i=0;i<p.count;i++){
  v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).toArray(position,i*3)
  if(n)v.fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize().toArray(normal,i*3)
  else{normal[i*3]=0;normal[i*3+1]=1;normal[i*3+2]=0}
 }
 g.setAttribute('interiorPosition',new THREE.BufferAttribute(position,3))
 g.setAttribute('interiorNormal',new THREE.BufferAttribute(normal,3))
 return g
}

/** The physical floor grid was authored in these same global source metres. */
export function interiorTileSize(name){
 if(/Aquarium/.test(name))return .75
 if(/library/i.test(name))return .65
 if(/bath|service/i.test(name))return .55
 return .65
}

/** Seamless three-axis PBR projection for furniture that has no authored UVs. */
export function applyInteriorProjection(shader,set,tileSize=0){
 Object.assign(shader.uniforms,{iAlbedo:{value:set.map},iNormal:{value:set.normalMap},iRoughness:{value:set.roughnessMap},iPeriod:{value:new THREE.Vector2(...set.period)},iTile:{value:tileSize}})
 shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
 attribute vec3 interiorPosition,interiorNormal;
 varying vec3 vInteriorPosition,vInteriorNormal;`)
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vInteriorPosition=interiorPosition;vInteriorNormal=interiorNormal;`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 uniform sampler2D iAlbedo,iNormal,iRoughness;
 uniform vec2 iPeriod;
 uniform float iTile;
 varying vec3 vInteriorPosition,vInteriorNormal;
 vec3 interiorWeights(){vec3 w=pow(abs(normalize(vInteriorNormal)),vec3(6.));return w/max(dot(w,vec3(1.)),.0001);}
 vec4 interiorSample(sampler2D t){
  vec3 w=interiorWeights();
  return texture2D(t,vInteriorPosition.zy/iPeriod)*w.x+texture2D(t,vInteriorPosition.xz/iPeriod)*w.y+texture2D(t,vInteriorPosition.xy/iPeriod)*w.z;
 }
 vec2 interiorSlope(vec3 n){return -n.xy/max(n.z,.2);}
 vec3 interiorRelief(vec3 surfNormal,float face){
  vec3 w=interiorWeights(),p=vInteriorPosition;
  vec2 a=interiorSlope(texture2D(iNormal,p.zy/iPeriod).xyz*2.-1.);
  vec2 b=interiorSlope(texture2D(iNormal,p.xz/iPeriod).xyz*2.-1.);
  vec2 c=interiorSlope(texture2D(iNormal,p.xy/iPeriod).xyz*2.-1.);
  vec2 dh=vec2(dot(a,dFdx(p.zy))*w.x+dot(b,dFdx(p.xz))*w.y+dot(c,dFdx(p.xy))*w.z,
               dot(a,dFdy(p.zy))*w.x+dot(b,dFdy(p.xz))*w.y+dot(c,dFdy(p.xy))*w.z);
  vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition),r1=cross(dy,surfNormal),r2=cross(surfNormal,dx);
  float det=dot(dx,r1)*face;
  return normalize(abs(det)*surfNormal-sign(det)*(dh.x*r1+dh.y*r2));
 }
 float interiorJoint(){
  if(iTile<=0.)return 0.;
  vec2 uv=vInteriorPosition.xz/iTile,edge=min(fract(uv),1.-fract(uv))*iTile;
  float distanceToJoint=min(edge.x,edge.y),aa=max(length(fwidth(vInteriorPosition.xz))*.5,.0002);
  return (1.-smoothstep(.0017-aa,.0038+aa,distanceToJoint))*smoothstep(.85,.98,abs(normalize(vInteriorNormal).y));
 }
 float interiorTileTone(){
  if(iTile<=0.)return 1.;
  vec2 cell=floor(vInteriorPosition.xz/iTile);
  float variance=fract(sin(dot(cell,vec2(43.137,23.713)))*14357.41);
  return mix(1.,.91+variance*.15,smoothstep(.85,.98,abs(normalize(vInteriorNormal).y)));
 }`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`diffuseColor*=interiorSample(iAlbedo);
 diffuseColor.rgb*=interiorTileTone()*(1.-interiorJoint()*.47);`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness*interiorSample(iRoughness).g;
 roughnessFactor=mix(roughnessFactor,.87,interiorJoint());`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`normal=interiorRelief(normal,faceDirection);`)
}

/** Separate cached room materials; source/exterior instances are never modified. */
export function realisticInteriorMaterial(source,options={}){
 const role=interiorSurfaceRole(source,options),projected=!options.uv||role==='tile',tile=role==='tile'?interiorTileSize(options.name??''):0
 const cache=options.bounce?.materials??materials
 const aquariumFloor=!!options.aquarium&&role==='tile'&&/^Sunny_AquariumFloor/.test(options.name)
 const aquariumCeiling=!!options.aquarium&&options.name==='Sunny_Aquarium_ceiling'
 const libraryFloor=!!options.library&&role==='tile'&&/^Sunny_InteriorFloor_F3_library/.test(options.name)
 const bathWater=!!options.bath&&role==='bath-water'
 const key=[source.name,source.color.getHexString(),role,projected,tile,aquariumCeiling,libraryFloor,bathWater].join(':')
 if(!aquariumFloor&&!bathWater&&cache.has(key))return cache.get(key)
 const shared=role==='brass'||role==='steel'?'metal':['water','bath-water','glass','mirror','lamp'].includes(role)?null:role
 const profile=profiles[role]
 const m=new THREE.MeshPhysicalMaterial({name:source.name,color:source.color.clone(),side:THREE.DoubleSide,
  roughness:role==='grain'?.76:role==='boards'?.91:1,metalness:['brass','steel','iron','mirror'].includes(role)?role==='mirror'?1:.82:0,
  clearcoat:profile?.coat??(['grain','boards'].includes(role)?.16:role==='paint'?.24:0),clearcoatRoughness:.35,envMapIntensity:.85})
 if(aquariumCeiling)m.color.multiplyScalar(.22)
 if(shared){
  const set=interiorTextureSet(shared)
  if(!projected){m.map=set.map;m.normalMap=set.normalMap;m.roughnessMap=set.roughnessMap}
  if(projected||options.bounce){
   m.onBeforeCompile=shader=>{
    if(projected)applyInteriorProjection(shader,set,tile)
    if(aquariumFloor)applyAquariumFloorLight(shader,options.aquarium)
    if(libraryFloor)applyLibraryDaylight(shader,options.library)
    if(options.bounce)applyInteriorBounce(shader,options.bounce,projected)
   }
   m.customProgramCacheKey=()=>`interior-finish:${projected}:${!!options.bounce}:${aquariumFloor}:${libraryFloor}`
  }
  if(profile?.sheen){m.sheen=profile.sheen;m.sheenColor.copy(source.color);m.sheenRoughness=.9}
 }else if(role==='lamp'){
  m.roughness=.32;m.emissive.set('#ffe3bd').multiply(source.color);m.emissiveIntensity=2.2
 }else if(role==='mirror'){
  m.roughness=.055;m.color.setRGB(.92,.94,.95);m.clearcoat=1
 }else if(bathWater){
  m.transparent=true;m.opacity=.78;m.depthWrite=false;m.roughness=.14;m.ior=1.333;m.clearcoat=.9;m.clearcoatRoughness=.08
  m.onBeforeCompile=shader=>applyBathWater(shader,options.bath)
  m.customProgramCacheKey=()=>`bath-water-v1`
 }else{
  m.transparent=true;m.opacity=role==='water'?.16:.20;m.depthWrite=false;m.roughness=role==='water'?.08:.065;m.ior=1.5;m.clearcoat=1;m.clearcoatRoughness=.08
  if(role==='glass')applyClearGlazing(m)
 }
 m.userData={interiorSurface:role,interiorProjection:projected?'metric':'authored-uv',finishVersion:1}
 if(aquariumFloor)m.userData.aquariumOwned=true
 else if(bathWater)m.userData.bathOwned=true
 else cache.set(key,m)
 return m
}

export function applyBathWater(shader,bath){
 shader.uniforms.bathTime=bath.time
 shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
 attribute vec3 interiorPosition;
 varying vec3 vBathPosition;`)
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vBathPosition=interiorPosition;`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 vBathPosition;
 uniform float bathTime;`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 ripplePoint=vBathPosition.xz;
 float ripples=sin(ripplePoint.x*7.8+ripplePoint.y*3.1+bathTime*1.33)+sin(ripplePoint.y*9.1-ripplePoint.x*1.7-bathTime*1.13);
 diffuseColor.rgb+=vec3(.037,.16,.13)*pow(1.-abs(ripples)*.5,5.);`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 normal=normalize(normal+vec3(dFdx(ripples),dFdy(ripples),0.)*.17);`)
}

export function applyLibraryDaylight(shader,layout){
 const [x,y]=layout.centre
 shader.uniforms.libraryCentre={value:new THREE.Vector2(x,-y)}
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 uniform vec2 libraryCentre;`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 direction=(vInteriorPosition.xz-libraryCentre)/vec2(4.95,5.50);
 float radius=length(direction);
 float windows=cos(8.*atan(direction.y,direction.x));
 float wash=smoothstep(.26,.89,radius)*(.27+.73*smoothstep(-.32,.87,windows));
 diffuseColor.rgb*=vec3(.87,.90,.92)+vec3(.06,.15,.28)*wash;
 diffuseColor.rgb+=vec3(.010,.022,.035)*wash;`)
}
