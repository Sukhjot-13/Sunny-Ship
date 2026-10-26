/**
 * Ship layout + tuning constants.
 * Numbers that come from the asset pipeline live in public/models/ship-metadata.json;
 * this file holds the hand-tuned gameplay/visual values.
 */

// ---- user-approved enlarged ship; normal human dimensions stay in metres --
import exteriorConfig from './exteriorConfig.json' with { type: 'json' }
export const EXPERIENCE_SCALE = exteriorConfig.experienceScale
export const SHIP_LENGTH_M = exteriorConfig.referenceLengthM * EXPERIENCE_SCALE
export const SHIP_HEIGHT_M = exteriorConfig.referenceHeightM * EXPERIENCE_SCALE
export const PLAYER_HEIGHT_M = 1.75
export const EYE_HEIGHT_M = 1.7

// ---- movement --------------------------------------------------------
export const WALK_SPEED = 3.4 // m/s
export const RUN_SPEED = 6.6 // m/s
export const JUMP_SPEED = 5.2 // m/s
export const GRAVITY = -18.0 // m/s^2 (snappier than real gravity for games)
export const GROUND_ACCEL = 14
export const AIR_ACCEL = 3
export const FLY_SPEED = 12
export const FLY_FAST_SPEED = 38
export const MOUSE_SENSITIVITY = 0.0022

// ---- third person ----------------------------------------------------
export const THIRD_PERSON_DISTANCE = 5.2
export const THIRD_PERSON_HEIGHT = 1.9

// ---- ocean -----------------------------------------------------------
export const WATER_LEVEL = 0
export const WAVE_HEIGHT = 0.55
export const WAVE_LENGTH = 34

// ---- wind ------------------------------------------------------------
export const WIND = {
  baseStrength: 0.55,
  gustFrequency: 0.18,
  gustAmplitude: 0.35,
  direction: [1, 0, 0.25],
}

export const CAMERA_MODES = {
  EXPLORE: 'explore',
  INSPECT: 'inspect',
}

export const PERSON_MODES = {
  FIRST: 'first',
  THIRD: 'third',
}

export const MOVEMENT_MODES = {
  WALK: 'walk',
  FLY: 'fly',
}

// ---- ship palette: accurate to the anime, tuned for PBR realism -------
export const SHIP_COLORS = {
  hullCream: '#e8e4d0',
  hullSage: '#c9d4b8',
  hullShadow: '#a8b596',
  trimCoral: '#e05c4a',
  trimCoralDark: '#b8433a',
  deckPlank: '#c08a4e',
  deckPlankDark: '#8f6234',
  wood: '#a9713c',
  woodDark: '#7b4f28',
  canvas: '#f2ede0',
  canvasShade: '#ddd4c0',
  gold: '#e8b64c',
  goldDark: '#b8873a',
  lionFur: '#f0c86a',
  lionMane: '#e0a03c',
  sailStripe: '#bd2636',
  rope: '#c8b48a',
  metal: '#9aa3ab',
}
