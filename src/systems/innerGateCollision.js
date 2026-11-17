/** Conservative small sections of the actual rectangular inner-shutter slats. */
export function innerGateSections(vertices,angle,spacing=.15){
 if(!Number.isFinite(angle)||!(spacing>0)||!vertices.length||vertices.some(p=>p.length!==3||p.some(v=>!Number.isFinite(v))))
  throw new Error('Finite gate vertices/angle and positive section spacing required')
 const radial=[Math.cos(angle),-Math.sin(angle)],tangent=[-Math.sin(angle),-Math.cos(angle)]
 const projected=vertices.map(([x,y,z])=>[x*radial[0]+z*radial[1],y,x*tangent[0]+z*tangent[1]])
 const low=[0,1,2].map(k=>Math.min(...projected.map(p=>p[k]))),high=[0,1,2].map(k=>Math.max(...projected.map(p=>p[k])))
 if(high.some((v,k)=>v-low[k]<1e-6))throw new Error('Inner gate needs a physical three-dimensional slat')
 const count=Math.max(1,Math.ceil((high[2]-low[2])/spacing)),sections=[]
 for(let i=0;i<count;i++){
  const a=low[2]+(high[2]-low[2])*i/count,b=low[2]+(high[2]-low[2])*(i+1)/count,corners=[]
  for(const r of [low[0],high[0]])for(const y of [low[1],high[1]])for(const t of [a,b])
   corners.push([radial[0]*r+tangent[0]*t,y,radial[1]*r+tangent[1]*t])
  sections.push(corners)
 }
 return sections
}
