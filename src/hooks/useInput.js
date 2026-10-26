import { useEffect, useRef } from 'react'
import { useStore, } from '../state/useStore.js'
import { createInteractionBus } from '../systems/interactions.js'

/**
 * One-shot "interact" fan-out.
 *
 * `E` is a mode-dependent key: it rises in fly mode (the HUD advertises Q/E for
 * altitude) and it is the interact key on foot. Rather than holding a flag that
 * a consumer would have to edge-detect, keydown emits a single event, so the
 * door system gets exactly one call per physical press and `e.repeat` is
 * already filtered out in `onDown` below.
 */
const interactionBus = createInteractionBus()

/** Subscribe to the interact key. Returns an unsubscribe function. */
export function onInteract(fn, priority=0) {
  return interactionBus.subscribe(fn,priority)
}

function fireInteract() {
  interactionBus.emit()
}

/**
 * Central keyboard + mouse input.
 *
 * Pointer lock is requested by clicking the canvas; Esc releases it (browser
 * native). Keys are tracked in a ref so the physics loop can read them without
 * causing React re-renders on every keydown.
 */
export function useInput() {
  const keys = useRef({
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    run: false,
    up: false,
    down: false,
    boost: false,
    interact: false,
  })

  const toggleCameraMode = useStore((s) => s.toggleCameraMode)
  const togglePersonMode = useStore((s) => s.togglePersonMode)
  const toggleFlight = useStore((s) => s.toggleFlight)
  const setHudMessage = useStore((s) => s.setHudMessage)
  const started = useStore((s) => s.started)
  const cannonPanelOpen = useStore((s) => s.cannonPanelOpen)

  // Release held movement when the player hands control to the cannon panel.
  useEffect(() => {
    if(cannonPanelOpen)for(const key of Object.keys(keys.current))keys.current[key]=false
  }, [cannonPanelOpen])

  useEffect(() => {
    const set = (code, v) => {
      const k = keys.current
      switch (code) {
        case 'KeyW': case 'ArrowUp': k.forward = v; break
        case 'KeyS': case 'ArrowDown': k.back = v; break
        case 'KeyA': case 'ArrowLeft': k.left = v; break
        case 'KeyD': case 'ArrowRight': k.right = v; break
        case 'Space': k.jump = v; break
        case 'ShiftLeft': case 'ShiftRight': k.run = v; break
        case 'KeyE': k.up = v; k.interact = v; break
        case 'KeyQ': k.down = v; break
        default: break
      }
    }

    const onDown = (e) => {
      // one-shot toggles
      if (e.repeat) return
      if (e.code === 'KeyX' && useStore.getState().started) {
        document.exitPointerLock?.()
        useStore.getState().setCannonPanelOpen(!useStore.getState().cannonPanelOpen)
        return
      }
      if (useStore.getState().cannonPanelOpen || e.target.closest?.('button, input, textarea, select, [contenteditable="true"]')) return
      if (e.code === 'KeyV') { toggleCameraMode(); return }
      if (e.code === 'KeyC') { togglePersonMode(); return }
      if (e.code === 'KeyF') { toggleFlight(); return }
      if (e.code === 'KeyB' && useStore.getState().flying) { useStore.getState().toggleFlyCollision(); return }
      if (e.code === 'KeyH') { useStore.getState().toggleHelp(); return }
      // E is altitude while flying and interact on foot. Walking is the default
      // state, so it is the one that gets the interaction; `up` is left alone
      // so the fly path is byte for byte what it was.
      if (e.code === 'KeyE' && !useStore.getState().flying) {
        keys.current.interact = true
        fireInteract()
        return
      }
      if (e.code === 'Space') e.preventDefault()
      set(e.code, true)
    }

    const onUp = (e) => set(e.code, false)

    // never leave a key stuck down when focus is lost
    const onBlur = () => {
      const k = keys.current
      for (const key of Object.keys(k)) k[key] = false
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [toggleCameraMode, togglePersonMode, toggleFlight, setHudMessage, started])

  // mouse look: accumulated deltas, drained by the controller each frame
  const look = useRef({ dx: 0, dy: 0 })

  useEffect(() => {
    const onMove = (e) => {
      if (document.pointerLockElement) {
        look.current.dx += e.movementX
        look.current.dy += e.movementY
      }
    }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [])

  return { keys, look }
}
