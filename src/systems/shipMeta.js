import { useEffect, useState } from 'react'

/**
 * Ship metadata loader.
 *
 * `ship-metadata.json` is written by tools/build_assets.py in BLENDER
 * coordinates (Z-up). The GLB is exported with export_yup=True, so three.js
 * receives Y-up. Every position coming out of the metadata is therefore
 * converted here, so the rest of the app only ever deals with three.js space.
 *
 * Conversion:  (x, y, z)_blender  ->  (x, z, -y)_three
 */
export function useShipMeta() {
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/models/ship-metadata.json')
      .then((r) => {
        if (!r.ok) throw new Error(`metadata ${r.status}`)
        return r.json()
      })
      .then((raw) => {
        if (cancelled) return
        setMeta(convertMeta(raw))
      })
      .catch((err) => {
        console.warn('[shipMeta] load failed, using fallback:', err.message)
        if (!cancelled) setMeta(fallbackMeta())
      })
    return () => { cancelled = true }
  }, [])

  return meta
}

/** Blender (Z-up) -> three.js (Y-up). */
export function toThree(x, y, z) {
  return [x, z, -y]
}

/** Vector3-style helper for a Blender box. */
export function boxToThree(min, max) {
  // min -> max becomes min -> max on the new axes
  return {
    min: [min[0], min[2], -max[1]],
    max: [max[0], max[2], -min[1]],
  }
}

function convertMeta(raw) {
  if (!raw) return fallbackMeta()

  const hull = raw.hull
  const hb = boxToThree(hull.min, hull.max)

  return {
    ...raw,
    axis: 'three-y-up',
    hull: {
      ...hull,
      min: hb.min,
      max: hb.max,
      center: [
        (hb.min[0] + hb.max[0]) / 2,
        (hb.min[1] + hb.max[1]) / 2,
        (hb.min[2] + hb.max[2]) / 2,
      ],
      size: [hull.size[0], hull.size[2], hull.size[1]],
    },
    waterLevel: raw.waterLevel ?? -14,
    oceanHullProfile: (raw.oceanHullProfile??[]).map(([x,low,high])=>[x,-high,-low]),
    spawn: {
      ...raw.spawn,
      position: toThree(...raw.spawn.position),
    },
    deck: {
      ...raw.deck,
      height: raw.deck.height, // already a height; axis conversion does not apply
      main: raw.deck.main
        ? {
            ...raw.deck.main,
            x: raw.deck.main.x,
            y: raw.deck.main.y,
          }
        : null,
    },
  }
}

function fallbackMeta() {
  return {
    axis: 'three-y-up',
    hull: { min: [-18.6, -19.2, -11.9], max: [18.6, 19.2, 11.9], center: [0, 0, 0], size: [37.2, 38.4, 23.8] },
    waterLevel: -14,
    deck: { height: -7.21, main: null },
    spawn: { position: [0, -7.21, 0] },
    parts: {},
  }
}
