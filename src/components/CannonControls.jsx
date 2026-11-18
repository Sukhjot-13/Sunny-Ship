import {useEffect,useRef,useState} from 'react'
import {useStore} from '../state/useStore.js'
import {COLA,GAON,burstAvailability,cannonAvailability,voyage} from '../systems/navigation.js'
import {operateAudibleCannon} from '../systems/cannonAudio.js'

/** Visible global controls for the actual Gaon mechanism, with focus handoff. */
export function CannonControls(){
 const open=useStore(s=>s.cannonPanelOpen),setOpen=useStore(s=>s.setCannonPanelOpen)
 const nav=useStore(s=>s.navigation),setMessage=useStore(s=>s.setHudMessage)
 const triggerBurst=useStore(s=>s.triggerBurst)
 const trigger=useRef(null),mouth=useRef(null),wasOpen=useRef(false)
 const [feedback,setFeedback]=useState('')
 const ready=cannonAvailability(nav)
 const burst=burstAvailability(nav)
 const burstLabel={charging:'Charging',airborne:'Airborne',landing:'Splashdown'}[burst.phase]
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
  const result=operateAudibleCannon(action)
  setFeedback(result.message);setMessage(result.message)
  useStore.getState().setNavigation({...useStore.getState().navigation,...voyage})
 }
 return <section className="ship-utility-controls" aria-label="Ship controls" style={styles.container}>
  <div style={styles.triggers}>
   <button type="button" aria-keyshortcuts="G" aria-label="Coup de Burst" disabled={!burst.canFire}
    title={burst.reason||'Launch Coup de Burst for three cola barrels'} onClick={triggerBurst}
    style={{...styles.trigger,...(!burst.canFire?styles.disabled:{})}}>{burstLabel||'Coup de Burst'} · G</button>
   <button ref={trigger} type="button" aria-expanded={open} aria-controls="cannon-panel"
    onClick={()=>open?setOpen(false):showPanel()} style={styles.trigger}>Cannon · X</button>
  </div>
  {open?<div id="cannon-panel" style={styles.panel}>
   <h2 style={styles.title}>Gaon cannon</h2>
   <p style={styles.detail}>{ready.shots} {ready.shots===1?'shot':'shots'} available · Cola {(nav.cola??COLA.capacity).toFixed(1)} / {COLA.capacity}</p>
   <p style={styles.detail}>Press K to fire. Each shot uses {GAON.cost} barrel. Cola refills at {COLA.perSecond}/sec.</p>
   <div style={styles.actions}>
    <button ref={mouth} type="button" aria-pressed={!!nav.jawOpen}
     onClick={()=>operate('toggle-mouth')} style={styles.action}>{nav.jawOpen?'Close Mouth':'Open Mouth'}</button>
    <button type="button" disabled={!ready.canFire} aria-describedby="cannon-readiness"
     onKeyDown={event=>{if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault()}}
     onClick={()=>operate('fire')} style={{...styles.action,...(!ready.canFire?styles.disabled:{})}}>Fire Gaon</button>
   </div>
   <p id="cannon-readiness" style={styles.detail}>{ready.reason||'Ready to fire. Firing also opens the mouth.'}</p>
   <p role="status" aria-live="polite" style={styles.feedback}>{feedback}</p>
   <button type="button" onClick={()=>setOpen(false)} style={styles.close}>Close controls · Esc</button>
  </div>:null}
 </section>
}

const styles={
 container:{position:'absolute',right:16,zIndex:50,fontFamily:'inherit',color:'#f3ede0',maxWidth:'calc(100vw - 32px)'},
 triggers:{display:'flex',justifyContent:'flex-end',gap:8,flexWrap:'wrap'},
 trigger:{display:'block',padding:'9px 15px',borderRadius:8,borderWidth:1,borderStyle:'solid',borderColor:'#c6aa6c',background:'#112a3e',color:'#fff3d2',cursor:'pointer',font:'inherit',fontSize:13},
 panel:{marginTop:8,marginLeft:'auto',width:300,maxWidth:'calc(100vw - 32px)',boxSizing:'border-box',padding:16,borderRadius:12,border:'1px solid #8f815e',background:'#102538',boxShadow:'0 8px 32px #0008'},
 title:{margin:'0 0 10px',fontSize:18,fontWeight:600},
 detail:{margin:'8px 0',fontSize:13,lineHeight:1.5,color:'#e2e6e7'},
 actions:{display:'flex',gap:8,flexWrap:'wrap',marginTop:12},
 action:{padding:'11px 12px',borderRadius:7,borderWidth:1,borderStyle:'solid',borderColor:'#d7b66a',background:'#efd393',color:'#172536',cursor:'pointer',font:'inherit',fontSize:13,fontWeight:600},
 disabled:{background:'#435260',color:'#d1d8dd',borderColor:'#63717b',cursor:'not-allowed'},
 feedback:{fontSize:13,lineHeight:1.5,minHeight:20,color:'#fff0ba',margin:'8px 0'},
 close:{padding:'7px 0',border:0,background:'none',color:'#d6e2ea',cursor:'pointer',font:'inherit',fontSize:13,textDecoration:'underline'},
}
