import { create } from 'zustand'
import { CAMERA_MODES, MOVEMENT_MODES, PERSON_MODES } from '../config/shipConfig.js'

/**
 * Global app state.
 * Player position/yaw/pitch are kept here (not in a ref) so that switching
 * between Explore and Inspect preserves exactly where the player was.
 */
export const useStore = create((set, get) => ({
  // --- session ---
  started: false,
  locked: false, // pointer lock held
  loading: true,
  progress: 0,

  // --- camera / movement ---
  cameraMode: CAMERA_MODES.INSPECT, // start orbiting the whole ship
  personMode: PERSON_MODES.FIRST,
  movementMode: MOVEMENT_MODES.WALK,
  flying: false,
  flyCollision: false,

  // --- player ---
  position: [0, 0, 0],
  hasPlayerPose: false,
  yaw: 0,
  pitch: 0,
  speed: 0,
  grounded: false,
  climbPose: null,
  nearClimb: '',

  // --- environment ---
  windStrength: 0.55,
  windDirection: [1, 0, 0.25],

  // --- ui ---
  showHelp: true,
  hudMessage: '',
  cannonPanelOpen: false,
  setCannonPanelOpen: (cannonPanelOpen) => set({cannonPanelOpen}),

  // --- doors / hatches (published by src/components/DoorSystem.jsx) ---
  /** `{ id, kind, label, open }` for the opening under the crosshair-ish, else null. */
  nearInteraction: null,
  /** How many openings are currently open (HUD readout). */
  openDoorCount: 0,
  navigation: { heading:270, speed:0, channel:1, cola:3, prompt:'' },
  setNavigation: (navigation) => set({navigation}),

  setLoading: (loading, progress = 0) => set({ loading, progress }),
  setStarted: (started) => set({ started, showHelp: started }),

  setLocked: (locked) => set({ locked }),

  toggleCameraMode: () =>
    set((s) => ({
      cameraMode:
        s.cameraMode === CAMERA_MODES.EXPLORE
          ? CAMERA_MODES.INSPECT
          : CAMERA_MODES.EXPLORE,
      showHelp: false,
    })),

  togglePersonMode: () =>
    set((s) => ({
      personMode:
        s.personMode === PERSON_MODES.FIRST ? PERSON_MODES.THIRD : PERSON_MODES.FIRST,
    })),

  toggleFlight: () =>
    set((s) => ({
      flying: !s.flying,
      movementMode: s.flying ? MOVEMENT_MODES.WALK : MOVEMENT_MODES.FLY,
      hudMessage: s.flying ? 'Walking' : 'Flight mode - Q/E for altitude',
    })),

  toggleFlyCollision: () => set((s) => ({
    flyCollision: !s.flyCollision,
    hudMessage: s.flyCollision ? 'Flight collision off' : 'Flight collision on',
  })),

  setMovementMode: (movementMode) => set({ movementMode }),

  /** Called every physics tick by the controller. */
  setPlayer: ({ position, yaw, pitch, speed, grounded, climbPose=null }) =>
    set({ position, yaw, pitch, speed, grounded, climbPose, hasPlayerPose: true }),
  setNearClimb: (nearClimb) => set(s=>s.nearClimb===nearClimb?s:{nearClimb}),

  setWind: (windStrength, windDirection) => set({ windStrength, windDirection }),

  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),
  setHudMessage: (hudMessage) => set({ hudMessage }),

  /**
   * Called every frame by the door system. Both setters compare before writing
   * so a steady state (same opening, same open flag, same count) never produces
   * a new object - at 60 fps that would re-render the HUD forever.
   */
  setNearInteraction: (nearInteraction) =>
    set((s) => {
      const prev = s.nearInteraction
      if (
        prev === nearInteraction ||
        (prev && nearInteraction &&
          prev.id === nearInteraction.id && prev.open === nearInteraction.open)
      ) return s
      return { nearInteraction }
    }),

  setOpenDoorCount: (openDoorCount) =>
    set((s) => (s.openDoorCount === openDoorCount ? s : { openDoorCount })),

  clearInteraction: () =>
    set((s) => (s.nearInteraction === null && s.openDoorCount === 0
      ? s
      : { nearInteraction: null, openDoorCount: 0 })),
}))
