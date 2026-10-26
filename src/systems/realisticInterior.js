/** Room finishes on the existing meshes; no construction or palette changes. */
import * as THREE from 'three'
import {realisticTextureSet} from './realisticExterior.js'

const maps=new Map(),materials=new Map(),TAU=Math.PI*2
const clamp=v=>Math.max(0,Math.min(1,v))
const profiles={
 upholstery:{period:[.064,.064],roughness:.88,relief:.000055,sheen:.28},
 linen:{period:[.08,.08],roughness:.93,relief:.00004,sheen:.16},
 curtain:{period:[.08,.08],roughness:.9,relief:.000035,sheen:.24},
 tile:{period:[.28,.28],roughness:.24,relief:.000006,coat:.5},
 porcelain:{period:[.18,.18],roughness:.18,relief:.000003,coat:.7},
 paper:{period:[.12,.12],roughness:.94,relief:.000014},
}
/** Stable periodic noise for fine fibres and fired glaze, without animation. */
function noise(u,v,seed=1){
 return Math.sin(TAU*(u*7+v*3)+seed)*Math.sin(TAU*(u*3-v*11)-seed)*.5+
  Math.sin(TAU*(u*29+v*17)+seed*2)*.25
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
 const albedo=new Uint8Array(count*4),normal=new Uint8Array(count*4),roughness=new Uint8Array(count*4),height=new Float32Array(count)
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,i=y*size+x,j=i*4,n=noise(u,v)
  const fabric=['upholstery','linen','curtain'].includes(role)
  const warp=Math.sin(TAU*u*64),weft=Math.sin(TAU*v*64),weave=warp*weft
  const fibres=fabric?weave*.65+noise(u,v,4)*.35:n
  const tone=clamp((fabric?.95:.985)+fibres*(fabric?.035:.008))
  const srgb=tone<=.0031308?tone*12.92:1.055*Math.pow(tone,1/2.4)-.055
  albedo[j]=albedo[j+1]=albedo[j+2]=Math.round(srgb*255);albedo[j+3]=255
  roughness[j]=roughness[j+1]=roughness[j+2]=Math.round(clamp(p.roughness+fibres*(fabric?.045:.025))*255);roughness[j+3]=255
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
  /^(?:Aquarium|B1$|Bath|Dining|AftRearWindow|AftSideWindow|Dock$|Energy|Factory|ForeF1|ForeF2|ForeToilet|Interior|Kitchen$|Kotatsu|Library$|Pantry|Quarters|RoomLamp|RoomPartition|Sick|SoldierDockStair|StorageStair|Store|Vehicle|Wash|Weapons|Womens|WWash)/.test(tags.sunny_feature??'')||
  /^Sunny_(?:Door|Hatch)_/.test(name))
}
/** Retain the authored surface identity and existing patterned colour regions. */
export function interiorSurfaceRole(source,{name='',wood='grain',fabric=false}={}){
 const label=source.name.replace('Sunny_','')
 if(label==='lamp_glow')return 'lamp'
 if(label==='tankwater')return 'water'
 if(label==='glass')return /mirror/i.test(name)?'mirror':'glass'
 if(/^tile_/.test(label))return 'tile'
 if(label==='paper')return 'paper'
 if(label==='linen')return 'linen'
 if(label.startsWith('upholstery_'))return 'upholstery'
 if(label==='cloth_aqua'||fabric)return /curtain|canopy/i.test(name)?'curtain':'linen'
 if(/cushion|mattress|pillow|blanket|quilt|sofa|armchair/i.test(name)&&!['timber','deck','darkwood','gold','brass','black','steel'].includes(label))return 'upholstery'
 if(['gold','brass'].includes(label))return 'brass'
 if(label==='steel')return 'steel'
 if(label==='black'&&/cannon|barrel|furnace|boiler|oven|stove|machine/i.test(name))return 'iron'
 if(['deck','timber','darkwood'].includes(label))return wood==='boards'||/InteriorFloor|_ceiling|_floor/.test(name)?'boards':'grain'
 if(label==='white'&&/sink|basin|toilet|bath_(?:tub|rim)|plate|dish|cup|teapot|bowl|bottle|jar/i.test(name))return 'porcelain'
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
  return (1.-smoothstep(.0015-aa,.003+aa,distanceToJoint))*smoothstep(.85,.98,abs(normalize(vInteriorNormal).y));
 }`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`diffuseColor*=interiorSample(iAlbedo);
 diffuseColor.rgb*=1.-interiorJoint()*.38;`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness*interiorSample(iRoughness).g;
 roughnessFactor=mix(roughnessFactor,.87,interiorJoint());`)
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`normal=interiorRelief(normal,faceDirection);`)
}

/** Separate cached room materials; source/exterior instances are never modified. */
export function realisticInteriorMaterial(source,options={}){
 const role=interiorSurfaceRole(source,options),projected=!options.uv||role==='tile',tile=role==='tile'?interiorTileSize(options.name??''):0
 const key=[source.name,source.color.getHexString(),role,projected,tile].join(':')
 if(materials.has(key))return materials.get(key)
 const shared=role==='brass'||role==='steel'?'metal':role==='water'||role==='glass'||role==='mirror'||role==='lamp'?null:role
 const profile=profiles[role]
 const m=new THREE.MeshPhysicalMaterial({name:source.name,color:source.color.clone(),side:THREE.DoubleSide,
  roughness:1,metalness:['brass','steel','iron','mirror'].includes(role)?role==='mirror'?1:.82:0,
  clearcoat:profile?.coat??(['grain','boards'].includes(role)?.16:role==='paint'?.24:0),clearcoatRoughness:.35,envMapIntensity:.85})
 if(shared){
  const set=interiorTextureSet(shared)
  if(projected){m.onBeforeCompile=shader=>applyInteriorProjection(shader,set,tile);m.customProgramCacheKey=()=>`interior-metric-v1`}
  else{m.map=set.map;m.normalMap=set.normalMap;m.roughnessMap=set.roughnessMap}
  if(profile?.sheen){m.sheen=profile.sheen;m.sheenColor.copy(source.color);m.sheenRoughness=.9}
 }else if(role==='lamp'){
  m.roughness=.32;m.emissive.copy(source.color);m.emissiveIntensity=1.65
 }else if(role==='mirror'){
  m.roughness=.055;m.color.setRGB(.92,.94,.95);m.clearcoat=1
 }else{
  m.transparent=true;m.opacity=role==='water'?.16:.20;m.depthWrite=false;m.roughness=role==='water'?.08:.065;m.ior=1.5;m.clearcoat=1;m.clearcoatRoughness=.08
 }
 m.userData={interiorSurface:role,interiorProjection:projected?'metric':'authored-uv',finishVersion:1}
 materials.set(key,m);return m
}
