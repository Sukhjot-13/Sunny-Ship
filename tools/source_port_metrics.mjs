/** Read-only R09 local ink-circle measurements; no metric size inference. */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import puppeteer from 'puppeteer'
const source='stuff/images/Thousand_Sunny%27s_Men_and_Woman_Quarters.webp'
const bytes=fs.readFileSync(source),browser=await puppeteer.launch({headless:true})
try{
 const page=await browser.newPage()
 const data=await page.evaluate(async url=>{
  const image=new Image();image.src=url;await image.decode()
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0)
  const pixels=ctx.getImageData(0,0,image.width,image.height).data,results=[]
  const roi=[300,205,520,265],[x0,y0,x1,y1]=roi
  for(const threshold of [100,140,180]){
   const seen=new Set(),found=[],dark=(x,y)=>pixels[(y*image.width+x)*4]<threshold
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const key=y*image.width+x;if(seen.has(key)||!dark(x,y))continue
    let loX=x,hiX=x,loY=y,hiY=y,count=0;const todo=[[x,y]];seen.add(key)
    while(todo.length){
     const[a,b]=todo.pop();count++;loX=Math.min(loX,a);hiX=Math.max(hiX,a);loY=Math.min(loY,b);hiY=Math.max(hiY,b)
     for(const[c,d]of[[a+1,b],[a-1,b],[a,b+1],[a,b-1]]){
      const k=d*image.width+c
      if(c>=x0&&c<x1&&d>=y0&&d<y1&&!seen.has(k)&&dark(c,d)){seen.add(k);todo.push([c,d])}
     }
    }
    const width=hiX-loX+1,height=hiY-loY+1
    if(width>12&&width<55&&height>12&&height<55&&width/height>.7&&width/height<1.3&&count>40)
     found.push({box:[loX,loY,hiX,hiY],width,height,centre:[(loX+hiX)/2,(loY+hiY)/2],count})
   }
   const outer=found.filter(c=>c.width>=28).sort((a,b)=>a.centre[0]-b.centre[0]),inner=found.filter(c=>c.width<23).sort((a,b)=>a.centre[0]-b.centre[0])
   const complete=outer.length===2&&inner.length===2
   results.push({threshold,found,complete,...(complete?{
    spacingToOuterWidth:(outer[1].centre[0]-outer[0].centre[0])/((outer[0].width+outer[1].width)/2),
    clearToOuterWidths:inner.map((c,i)=>c.width/outer[i].width),
   }:{})})
  }
  return{size:[image.width,image.height],roi,results}
 },'data:image/webp;base64,'+bytes.toString('base64'))
 const out=process.argv[2]??'docs/review/2026-11-16/r09-port-source-metrics.json'
 fs.mkdirSync(path.dirname(out),{recursive:true})
 fs.writeFileSync(out,JSON.stringify({source,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),...data,
  limits:'Same-panel adjacent circle ratios from supplied hand drawing. Fragmented contours are excluded; perspective/sketch uncertainty remains. No canonical metre size or whole-ship scale is inferred.'},null,2))
 console.log('R09 source measurements',data.results.filter(r=>r.complete).map(r=>({threshold:r.threshold,spacing:r.spacingToOuterWidth,clear:r.clearToOuterWidths})))
}finally{await browser.close()}
