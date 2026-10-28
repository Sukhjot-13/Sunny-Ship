import {readGLB,readAccessor} from '../../tests/glb.mjs'
const g=readGLB('public/models/sunny.glb'),meta=JSON.parse((await import('node:fs')).readFileSync('public/models/ship-metadata.json'))
const inside=(p,ring)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++)if((ring[i][1]>p[1])!==(ring[j][1]>p[1])&&p[0]<(ring[j][0]-ring[i][0])*(p[1]-ring[i][1])/(ring[j][1]-ring[i][1])+ring[i][0])c=!c;return c}
const levels=meta.interiors.levels
for(const node of g.json.nodes.filter(n=>n.mesh!==undefined&&!n.name.startsWith('Sunny_'))){let hits={};for(const prim of g.json.meshes[node.mesh].primitives){const a=readAccessor(g,prim.attributes.POSITION).data,ix=readAccessor(g,prim.indices).data;for(let i=0;i<ix.length;i+=3){const p=[0,1,2].map(k=>[a[ix[i+k]*3],-a[ix[i+k]*3+2],a[ix[i+k]*3+1]]);for(const e of meta.interiors.foreEnclosures){const z=levels[e.level],h=e.level==='F1'?levels.F2F-z-.18:2.8;if(p.some(p=>p[2]>z+.001&&p[2]<z+h-.001&&inside(p,e.outline)))hits[e.level]=(hits[e.level]||0)+1}if(p.some(p=>p[0]<-9&&p[0]>-30&&Math.abs(p[1])<8&&p[2]>levels.B1&&p[2]<levels.F1-.18))hits.B1=(hits.B1||0)+1}}
if(Object.keys(hits).length)console.log(node.name,hits)}
