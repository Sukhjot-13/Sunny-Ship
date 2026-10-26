import { useStore, } from '../state/useStore.js'
import { CAMERA_MODES, PERSON_MODES, MOVEMENT_MODES } from '../config/shipConfig.js'
import { CannonControls } from './CannonControls.jsx'

/**
 * Minimal UI: a title screen before you enter, and a subtle HUD once playing.
 */
export function UI({ onEnter }) {
  const started = useStore((s) => s.started)
  const locked = useStore((s) => s.locked)
  const loading = useStore((s) => s.loading)
  const progress = useStore((s) => s.progress)
  const cameraMode = useStore((s) => s.cameraMode)
  const personMode = useStore((s) => s.personMode)
  const movementMode = useStore((s) => s.movementMode)
  const flyCollision = useStore((s) => s.flyCollision)
  const toggleFlyCollision = useStore((s) => s.toggleFlyCollision)
  const showHelp = useStore((s) => s.showHelp)
  const hudMessage = useStore((s) => s.hudMessage)
  const nav = useStore((s) => s.navigation)
  const nearClimb = useStore((s) => s.nearClimb)
  const nearOpening = useStore((s) => s.nearInteraction)
  const cannonPanelOpen = useStore((s) => s.cannonPanelOpen)

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.title}>THOUSAND SUNNY</div>
        <div style={styles.barWrap}>
          <div style={{ ...styles.bar, width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div style={styles.sub}>Loading the ship… {Math.round(progress * 100)}%</div>
      </div>
    )
  }

  if (!started) {
    return (
      <div style={styles.overlay} onClick={onEnter}>
        <div style={styles.card}>
          <h1 style={styles.title}>THOUSAND SUNNY</h1>
          <p style={styles.tagline}>Grand Ship Collection — Thousand Sunny</p>
          <div style={styles.cta}>Click to Explore</div>
          <ul style={styles.controls}>
            <li><b>WASD</b> — Move</li>
            <li><b>Mouse</b> — Look</li>
            <li><b>Shift</b> — Run</li>
            <li><b>Space</b> — Jump</li>
            <li><b>F</b> — Fly mode</li>
            <li><b>C</b> — 1st / 3rd person</li>
            <li><b>V</b> — Inspect Ship</li>
            <li><b>H</b> — Toggle help</li>
            <li><b>X</b> — Cannon controls · open mouth / fire</li>
            <li><b>Esc</b> — Release Mouse</li>
          </ul>
        </div>
      </div>
    )
  }

  const modeLabel =
    movementMode === MOVEMENT_MODES.FLY
      ? 'FLY'
      : personMode === PERSON_MODES.THIRD
        ? '3RD PERSON'
        : '1ST PERSON'

  return (
    <>
      <CannonControls />
      {/*
        Inspect mode: OrbitControls drives the camera with drag/scroll, so there
        must be NO full-screen overlay here - one would swallow every pointer
        event and leave the user unable to orbit at all. Show a passive hint.
      */}
      {cameraMode === CAMERA_MODES.INSPECT && (
        <div style={styles.hint}>
          Drag to orbit · Scroll to zoom · <b>V</b> to step aboard
        </div>
      )}

      {/* Explore mode: block until the pointer is captured */}
      {cameraMode !== CAMERA_MODES.INSPECT && !locked && !cannonPanelOpen && (
        <div style={styles.resume} onClick={onEnter}>
          <div style={styles.resumeInner}>Click to Capture Mouse</div>
        </div>
      )}

      {/* subtle mode indicator */}
      <div style={styles.hud}>
        <span style={styles.chip}>{cameraMode === CAMERA_MODES.INSPECT ? 'INSPECT' : 'EXPLORE'}</span>
        <span style={styles.chip}>{modeLabel}</span>
        <span style={styles.chipDim}>{movementMode === MOVEMENT_MODES.FLY ? 'Q/E altitude' : 'WASD'}</span>
        <span style={styles.chipDim}>{Math.round(nav.heading)}° · {nav.speed.toFixed(1)} m/s · Dock {nav.channel} · Cola {nav.cola.toFixed(1)}</span>
      </div>

      {cameraMode === CAMERA_MODES.EXPLORE && movementMode === MOVEMENT_MODES.FLY && !cannonPanelOpen && (
        <button type="button" aria-pressed={flyCollision} onClick={toggleFlyCollision} style={styles.flightToggle}>
          Flight collision: {flyCollision ? 'ON' : 'OFF'} · B
        </button>
      )}

      {hudMessage && (
        <div style={styles.toast} key={hudMessage}>
          {hudMessage}
        </div>
      )}
      {nav.prompt && cameraMode === CAMERA_MODES.EXPLORE && <div style={{...styles.toast,bottom:112}}>{nav.prompt}</div>}
      {cameraMode===CAMERA_MODES.EXPLORE&&nearClimb&&<div style={{...styles.toast,bottom:148}}>{nearClimb}</div>}
      {cameraMode===CAMERA_MODES.EXPLORE&&nearOpening?.kind==='hatch'&&<div style={{...styles.toast,bottom:184}}>E · {nearOpening.open?'Close':'Open'} {nearOpening.label}</div>}

      {/* crosshair in first person while locked */}
      {locked && cameraMode === CAMERA_MODES.EXPLORE && personMode === PERSON_MODES.FIRST && (
        <div style={styles.crosshair} />
      )}

      {showHelp && locked && (
        <div style={styles.help}>
          <div style={styles.helpTitle}>CONTROLS</div>
          <div>WASD move · Mouse look · Shift run · Space jump</div>
          <div>F fly · B flight collision · C 1st/3rd person · V inspect ship · H hide help</div>
          <div>Esc release mouse</div>
          <div>X cannon panel · Open/Close Mouth and Fire Gaon from anywhere</div>
          <div>E interact · Helm: W/S speed, A/D steer · G Burst · T Chicken Voyage · J mouth · K Gaon</div>
          <div>Ladders: E grabs · W/S climb up/down · E operates a reachable hatch</div>
          <div>Dock channels 0–6 · Log Pose bearings are simulated · R reset voyage and player</div>
        </div>
      )}
    </>
  )
}

const styles = {
  overlay: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    background: 'radial-gradient(ellipse at 50% 40%, #1b3a52 0%, #0a1622 70%)',
    color: '#f3ede0', zIndex: 40, userSelect: 'none', gap: 14,
  },
  card: { textAlign: 'center', padding: '0 24px', display:'flex', flexDirection:'column', alignItems:'center' },
  title: {
    fontSize: 'clamp(30px, 6.5vw, 62px)', letterSpacing: '0.16em', fontWeight: 300,
    margin: 0, textShadow: '0 4px 26px rgba(0,0,0,0.6)',
  },
  tagline: { fontSize: 13, opacity: 0.62, letterSpacing: '0.09em', margin: '10px 0 0' },
  cta: {
    margin: '34px 0 22px', fontSize: 15, letterSpacing: '0.12em',
    padding: '11px 26px', border: '1px solid rgba(243,237,224,0.42)',
    borderRadius: 999, display: 'inline-block', background: 'rgba(255,255,255,0.05)',
  },
  controls: {
    listStyle: 'none', padding: 0, margin: 0, fontSize: 12.5, lineHeight: 1.95,
    opacity: 0.76, textAlign: 'left', display: 'inline-block',
  },
  barWrap: {
    width: 'min(360px, 70vw)', height: 3, background: 'rgba(255,255,255,0.16)',
    borderRadius: 999, overflow: 'hidden',
  },
  bar: { height: '100%', background: '#e8b64c', transition: 'width 160ms ease' },
  sub: { fontSize: 12, opacity: 0.6, letterSpacing: '0.07em' },

  resume: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 30, cursor: 'pointer',
    background: 'rgba(6,14,22,0.45)', backdropFilter: 'blur(1.5px)',
  },
  resumeInner: {
    padding: '13px 30px', border: '1px solid rgba(243,237,224,0.4)',
    borderRadius: 999, fontSize: 13.5, letterSpacing: '0.13em',
    background: 'rgba(10,22,34,0.82)', color: '#f3ede0',
  },

  // passive hint in inspect mode. MUST NOT capture pointer events, otherwise it
  // blocks OrbitControls.
  hint: {
    position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
    padding: '9px 20px', borderRadius: 999, fontSize: 12.5, letterSpacing: '0.06em',
    background: 'rgba(10,22,34,0.62)', border: '1px solid rgba(243,237,224,0.26)',
    color: '#f3ede0', opacity: 0.8, zIndex: 25, pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },

  hud: {
    position: 'absolute', top: 16, left: 16, display: 'flex', gap: 7, zIndex: 20,
    pointerEvents: 'none', flexWrap: 'wrap',
  },
  chip: {
    fontSize: 10.5, letterSpacing: '0.13em', padding: '4px 10px', borderRadius: 999,
    background: 'rgba(10,22,34,0.6)', border: '1px solid rgba(243,237,224,0.22)',
    color: '#f3ede0',
  },
  chipDim: {
    fontSize: 10.5, letterSpacing: '0.11em', padding: '4px 10px', borderRadius: 999,
    background: 'rgba(10,22,34,0.42)', border: '1px solid rgba(243,237,224,0.14)',
    color: '#f3ede0', opacity: 0.68,
  },

  flightToggle: {
    position: 'absolute', top: 52, left: 16, zIndex: 35,
    padding: '8px 13px', borderRadius: 999, cursor: 'pointer',
    background: 'rgba(10,22,34,0.82)', border: '1px solid rgba(243,237,224,0.38)',
    color: '#f3ede0', fontSize: 12,
  },

  crosshair: {
    position: 'absolute', top: '50%', left: '50%', width: 5, height: 5,
    marginTop: -2.5, marginLeft: -2.5, borderRadius: 999,
    background: 'rgba(255,255,255,0.75)', zIndex: 20, pointerEvents: 'none',
    boxShadow: '0 0 5px rgba(0,0,0,0.55)',
  },

  toast: {
    position: 'absolute', bottom: 76, left: '50%', transform: 'translateX(-50%)',
    padding: '8px 18px', borderRadius: 999, fontSize: 12, letterSpacing: '0.09em',
    background: 'rgba(10,22,34,0.8)', border: '1px solid rgba(243,237,224,0.22)',
    color: '#f3ede0', zIndex: 22, pointerEvents: 'none',
    animation: 'fadeIn 240ms ease',
  },

  help: {
    position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
    textAlign: 'center', fontSize: 11.5, lineHeight: 1.85, color: '#f3ede0',
    opacity: 0.6, zIndex: 20, pointerEvents: 'none', letterSpacing: '0.05em',
  },
  helpTitle: { letterSpacing: '0.16em', opacity: 0.75, marginBottom: 3, fontSize: 10 },
}
