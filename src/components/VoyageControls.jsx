import { useEffect } from 'react'
import { useStore } from '../state/useStore.js'
import { readLogPose } from '../config/archipelago.js'

/** Inspect-mode helm and live readings from the same chart as the physical Log Pose. */
export function VoyageControls({ touchHelm }) {
  const nav = useStore((state) => state.navigation)
  const toggleHelm = useStore((state) => state.toggleInspectHelm)
  const helmView = useStore((state) => state.helmView)
  const toggleView = useStore((state) => state.toggleHelmView)
  const nextNeedle = useStore((state) => state.nextLogNeedle)
  const readings = readLogPose(nav)
  const target = readings[nav.logNeedle]
  const bearing = `${Math.round(target.bearing) % 360}`.padStart(3, '0')
  useEffect(() => {
    const release = () => { touchHelm.current = {} }
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('blur', release)
      release()
    }
  }, [touchHelm, nav.helm])
  const range = target.range >= 1000 ? `${(target.range / 1000).toFixed(1)} km` : `${Math.round(target.range)} m`

  return (
    <section className="voyage-controls" aria-label="Helm and Log Pose">
      <div className="voyage-actions">
        <button type="button" aria-keyshortcuts="M" aria-pressed={nav.helm} onClick={toggleHelm}>
          {nav.helm ? 'Release helm' : 'Take helm'} <kbd>M</kbd>
        </button>
        <button type="button" aria-keyshortcuts="N" onClick={nextNeedle}>
          Next island <kbd>N</kbd>
        </button>
      </div>
      <div className="voyage-reading">
        <div className="log-pose-dial" aria-hidden="true">
          {readings.map((reading, index) => (
            <i key={reading.name} className={index === nav.logNeedle ? 'selected' : ''}
              style={{ transform: `rotate(${reading.bearing - nav.heading}deg)` }} />
          ))}
        </div>
        <div>
          <div className="voyage-label">Log Pose</div>
          <div className="voyage-island">{target.name}</div>
          <div className="voyage-range">{bearing}° · {range}{target.near ? ' · In sight' : ''}</div>
        </div>
      </div>
      {nav.helm && (
        <>
          <div className="voyage-underway">
            <span>{Math.round(Math.abs(nav.speed))} m/s</span>
            <progress max="1" value={nav.throttle} aria-label="Throttle" />
            <button type="button" aria-keyshortcuts="P" onClick={toggleView}>
              {helmView === 'chase' ? 'Orbit' : 'Chase cam'} <kbd>P</kbd>
            </button>
          </div>
          <p className="voyage-instructions">W/S throttle · A/D steer · Drag to look</p>
          {nav.gaonTarget ? <p className="voyage-warning">{nav.gaonTarget.name} in range · Fire K</p> :
            nav.contact && <p className="voyage-instructions">{nav.contact.name} · {Math.round(nav.contact.bearing) % 360}° · {Math.round(nav.contact.range)} m</p>}
          <div className="voyage-steering">
            {[
              ['left', 'Steer port', '←'],
              ['forward', 'Increase throttle', '↑'],
              ['back', 'Decrease throttle', '↓'],
              ['right', 'Steer starboard', '→'],
            ].map(([key, label, arrow]) => (
              <button key={key} type="button" aria-label={label}
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  touchHelm.current[key] = true
                }}
                onLostPointerCapture={() => { touchHelm.current[key] = false }}>{arrow}</button>
            ))}
          </div>
        </>
      )}
      {nav.shoal && <p role="status" className="voyage-warning">Shallow water near {nav.shoal}. Turn out to sea.</p>}
    </section>
  )
}
