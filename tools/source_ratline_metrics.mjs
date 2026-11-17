/** Read supplied R01 ink crossings along five open shroud gaps. */
import fs from 'node:fs'
import crypto from 'node:crypto'
import puppeteer from 'puppeteer'
const source='stuff/images/Thousand_Sunny_Infobox.webp',bytes=fs.readFileSync(source)
const browser=await puppeteer.launch({headless:true})
try{
 const page=await browser.newPage()
 const report=await page.evaluate(async url=>{
  const image=new Image();image.src=url;await image.decode()
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0)
  const pixels=ctx.getImageData(0,0,image.width,image.height).data,scans=[]
  for(const threshold of [85,105,125])for(const u of [.1,.3,.5,.7,.9]){
   const runs=[]
   for(let y=290;y<=700;y++){
    const t=(y-280)/425,left=474+(495-474)*t,right=500+(578-500)*t,x=Math.round(left+u*(right-left))
    const i=(y*image.width+x)*4,dark=(pixels[i]+pixels[i+1]+pixels[i+2])/3<threshold
    if(!dark)continue
    const last=runs.at(-1);if(last&&last[1]===y-1)last[1]=y;else runs.push([y,y])
   }
   const rows=runs.filter(([a,b])=>b-a<6),longRuns=runs.filter(([a,b])=>b-a>=6)
   scans.push({threshold,gapFraction:u,rows,longRuns,count:rows.length})
  }
  const horizontalScans=[]
  for(const threshold of [105,125])for(const coverage of [.45,.55,.65]){
   const runs=[],strengths=[]
   for(let b=290;b<=700;b++){
    const t=(b-280)/425,left=474+21*t,right=500+78*t,lo=Math.ceil(left+.15*(right-left)),hi=Math.floor(right-.15*(right-left))
    let best=0
    for(const slope of [.02,.05,.08,.11,.14]){
     let count=0,total=0
     for(let x=lo;x<=hi;x++){
      const y=Math.round(b+slope*(x-500)),i=(y*image.width+x)*4
      if((pixels[i]+pixels[i+1]+pixels[i+2])/3<threshold)count++
      total++
     }
     best=Math.max(best,count/total)
    }
    strengths.push([b,best])
    if(best<coverage)continue
    const last=runs.at(-1);if(last&&last[1]===b-1)last[1]=b;else runs.push([b,b])
   }
   horizontalScans.push({threshold,coverage,runs,count:runs.length,strengths})
  }
  return{size:[image.width,image.height],sampling:{topLeft:[474,280],topRight:[500,280],bottomLeft:[495,705],bottomRight:[578,705],scanY:[290,700]},scans,horizontalScans}
 },'data:image/webp;base64,'+bytes.toString('base64'))
 const out=process.argv[2]??'/private/tmp/sunny-r01-ratline-metrics.json'
 fs.writeFileSync(out,JSON.stringify({source,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),...report,
  limits:'Manual fan boundary anchors; counts are visible ink crossings, not metre dimensions. Long runs flag vertical-rope interference. Inspect runs and source crop before selecting reconstructed total row count.'},null,2)+'\n')
 console.log(report.scans.map(s=>({threshold:s.threshold,u:s.gapFraction,count:s.count,longRuns:s.longRuns})))
 console.log('HORIZONTAL',report.horizontalScans.map(s=>({threshold:s.threshold,coverage:s.coverage,count:s.count,runs:s.runs})))
}finally{await browser.close()}
