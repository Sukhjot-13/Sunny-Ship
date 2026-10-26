import {useEffect,useRef,useState} from 'react'
import {useStore} from '../state/useStore.js'
import {cannonAvailability,operateCannon,voyage} from '../systems/navigation.js'

/** Visible global controls for the actual Gaon mechanism, with focus handoff. */
export function CannonControls(){
 const open=useStore(s=>s.cannonPanelOpen),setOpen=useStore(s=>s.setCannonPanelOpen)
 const nav=useStore(s=>s.navigation),setMessage=useStore(s=>s.setHudMessage)
 const trigger=useRef(null),mouth=useRef(null),wasOpen=useRef(false)
 const [feedback,setFeedback]=useState('')
 const ready=cannonAvailability(nav)
 useEffect(()=>{
  if(open)mouth.current?.focus()
  else if(wasOpen.current)trigger.current?.focus()
  wasOpen.current=open
 },[open])
 useEffect(()=>{
  if(!open)return
  // Disabling Fire after a shot can move focus to the body. Escape must
  // still close the panel and return focus to the visible trigger.
  function closeOnEscape(event){if(event.key==='Escape'){event.preventDefault();setOpen(false)}}
  window.addEventListener('keydown',closeOnEscape,true)
  return ()=>window.removeEventListener('keydown',closeOnEscape,true)
 },[open,setOpen])
 /** Exit captured-look mode before focusing ordinary accessible buttons. */
 function showPanel(){document.exitPointerLock?.();setOpen(true)}
 /** Execute shared mechanism actions; domain guards remain authoritative. */
 function operate(action){
  const result=operateCannon(action)
  setFeedback(result.message);setMessage(result.message)
  useStore.getState().setNavigation({...useStore.getState().navigation,...voyage})
 }
 return <section aria-label="Mouth cannon" style={styles.container}>
  <button ref={trigger} type="button" aria-expanded={open} aria-controls="cannon-panel"
   onClick={()=>open?setOpen(false):showPanel()} style={styles.trigger}>Cannon · X</button>
  {open?<div id="cannon-panel" style={styles.panel}>
   <h2 style={styles.title}>Gaon cannon</h2>
   <p style={styles.detail}>Use from anywhere. Fire spends 3 cola barrels.</p>
   <p style={styles.detail}>Mouth {nav.jawOpen?'open':'closed'} · Cola {(nav.cola??3).toFixed(1)} / 3</p>
   <div style={styles.actions}>
    <button ref={mouth} type="button" aria-pressed={!!nav.jawOpen}
     onClick={()=>operate('toggle-mouth')} style={styles.action}>{nav.jawOpen?'Close Mouth':'Open Mouth'}</button>
    <button type="button" disabled={!ready.canFire} aria-describedby="cannon-readiness"
     onClick={()=>operate('fire')} style={{...styles.action,...(!ready.canFire?styles.disabled:{})}}>Fire Gaon</button>
   </div>
   <p id="cannon-readiness" style={styles.detail}>{ready.reason||'Ready to fire. Firing also opens the mouth.'}</p>
   <p role="status" aria-live="polite" style={styles.feedback}>{feedback}</p>
   <button type="button" onClick={()=>setOpen(false)} style={styles.close}>Close controls · Esc</button>
  </div>:null}
 </section>
}

const styles={
 container:{position:'absolute',top:16,right:16,zIndex:50,fontFamily:'inherit',color:'#f3ede0',maxWidth:'calc(100vw - 32px)'},
 trigger:{display:'block',marginLeft:'auto',padding:'9px 15px',borderRadius:8,border:'1px solid #c6aa6c',background:'#112a3e',color:'#fff3d2',cursor:'pointer',font:'inherit',fontSize:13},
 panel:{marginTop:8,width:300,maxWidth:'calc(100vw - 32px)',boxSizing:'border-box',padding:16,borderRadius:12,border:'1px solid #8f815e',background:'#102538',boxShadow:'0 8px 32px #0008'},
 title:{margin:'0 0 10px',fontSize:18,fontWeight:600},
 detail:{margin:'8px 0',fontSize:13,lineHeight:1.5,color:'#e2e6e7'},
 actions:{display:'flex',gap:8,flexWrap:'wrap',marginTop:12},
 action:{padding:'11px 12px',borderRadius:7,border:'1px solid #d7b66a',background:'#efd393',color:'#172536',cursor:'pointer',font:'inherit',fontSize:13,fontWeight:600},
 disabled:{background:'#435260',color:'#d1d8dd',borderColor:'#63717b',cursor:'not-allowed'},
 feedback:{fontSize:13,lineHeight:1.5,minHeight:20,color:'#fff0ba',margin:'8px 0'},
 close:{padding:'7px 0',border:0,background:'none',color:'#d6e2ea',cursor:'pointer',font:'inherit',fontSize:13,textDecoration:'underline'},
}
