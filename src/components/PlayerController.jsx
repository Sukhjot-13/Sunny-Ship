import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state/useStore.js'
import { useCollision } from '../systems/collision.js'
import { voyage } from '../systems/navigation.js'
import { createClimbingSystem, pointAt, reachedClimbPoint, CLIMB_SPEED } from '../systems/climbing.js'
import { onInteract } from '../hooks/useInput.js'
import { CONTACT_GAP } from '../systems/doors.js'
import {
  WALK_SPEED, RUN_SPEED, JUMP_SPEED, GRAVITY, GROUND_ACCEL, AIR_ACCEL,
  FLY_SPEED, FLY_FAST_SPEED, MOUSE_SENSITIVITY, PLAYER_HEIGHT_M,
  EYE_HEIGHT_M, CAMERA_MODES, PERSON_MODES, MOVEMENT_MODES,
  THIRD_PERSON_DISTANCE, THIRD_PERSON_HEIGHT,
} from '../config/shipConfig.js'

const PLAYER_RADIUS = 0.34
const STEP_HEIGHT = 0.8
/**
 * How far the "leaving the ship" guard looks for a floor before it decides the
 * player has fallen out of the world. It has to be generous: the ship has four
 * interior levels, a 6 m deck-to-deck drop and stairs, so a short look-down
 * reads every legitimate descent as a fall.
 */
const VOID_LOOKAHEAD = 30

/**
 * First-person / third-person walker.
 *
 * Physics is integrated manually rather than with a physics engine:
 *   - velocity integrates acceleration and gravity
 *   - ground is found by probing the collision floors beneath the player
 *   - horizontal collision pushes the player out on the shallowest axis, which
 *     produces natural wall sliding
 *   - a small step-up allowance keeps the player from catching on deck edges
 *
 * `fly` swaps gravity for free 6-axis movement (Blender-style).
 * The player transform lives in the zustand store so switching to Inspect and
 * back restores it exactly.
 */
export function PlayerController({ keys, look, spawn, climbs, waterLevel = -14, onFrame }) {
  const { camera } = useThree()
  const collision = useCollision()
  const climbing = useMemo(()=>createClimbingSystem(climbs),[climbs])
  // Recover as soon as the player reaches the sea, not a metre under it.
  const waterGuardY = waterLevel + 0.35

  const setPlayer = useStore((s) => s.setPlayer)
  const setHudMessage = useStore((s) => s.setHudMessage)

  // local physics state (kept in refs, not React state)
  const pos = useRef(new THREE.Vector3(...spawn))
  const vel = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const pitch = useRef(0)
  const grounded = useRef(false)
  const coyote = useRef(0)      // jump forgiveness
  const jumpBuffer = useRef(0)
  const bobTime = useRef(0)
  const camShake = useRef(0)
  const initialised = useRef(false)
  const blocker = useRef(null)
  const recoveries = useRef(0)
  const climbExitHold = useRef(false)
  // last position at which the player was definitely standing on a floor;
  // used as a hard safety net so we can never end up falling into the sea
  const lastSafe = useRef(new THREE.Vector3(...spawn))
  const lastSafeRef = useRef(spawn)

  // ---- seed from the store on first mount ---------------------------
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    const saved = useStore.getState()
    const seed = saved.hasPlayerPose ? saved.position : spawn
    pos.current.set(...seed)
    lastSafe.current.set(...seed)
    yaw.current = saved.hasPlayerPose ? saved.yaw : Math.PI / 2
    pitch.current = saved.hasPlayerPose ? saved.pitch : -0.05
    if(saved.climbPose)climbing.restore(saved.climbPose,seed)
  }, [spawn,climbing])

  // Grabbing a rope consumes E. While climbing, E reaches the real hatch.
  useEffect(()=>onInteract(()=>{
    const store=useStore.getState()
    if(store.flying||store.cameraMode!==CAMERA_MODES.EXPLORE)return false
    if(climbing.active){
      if(store.nearInteraction?.kind==='hatch')return false
      const support=collision.raycastDown(new THREE.Vector3(pos.current.x,pos.current.y+.05,pos.current.z),.15,PLAYER_RADIUS)
      if(support&&Math.abs(support.y-pos.current.y)<.10){
        climbing.detach();vel.current.set(0,0,0);grounded.current=true
        setPlayer({position:pos.current.toArray(),yaw:yaw.current,pitch:pitch.current,speed:0,grounded:true})
        setHudMessage('Released ladder')
      }else setHudMessage('')
      return true
    }
    if(grounded.current&&climbing.attach(pos.current.toArray())){
      vel.current.set(0,0,0)
      setHudMessage('')
      return true
    }
    return false
  },100),[climbing,collision,setPlayer,setHudMessage])

  // expose runtime state so the automated smoke test can assert on it
  useEffect(() => {
    window.__sunny = {
      get position() { return pos.current.toArray() },
      get grounded() { return grounded.current },
      get speed() { return Math.hypot(vel.current.x, vel.current.z) },
      get vel() { return vel.current.toArray() },
      get support() { return collision.raycastDown(new THREE.Vector3(pos.current.x, pos.current.y + 0.05, pos.current.z), 0.55) },
      get lastSafe() { return lastSafe.current.toArray() },
      get yaw() { return yaw.current },
      get pitch() { return pitch.current },
      get flyCollision() { return useStore.getState().flyCollision },
      get colliderCount() { return collision.world.boxes.length },
      look(yawRad, pitchRad) {
        yaw.current = yawRad
        pitch.current = pitchRad
      },
      teleport(x, y, z) {
        climbing.detach()
        climbExitHold.current=false
        pos.current.set(x, y, z)
        vel.current.set(0, 0, 0)
        grounded.current = false
      },
      respawn() {
        climbing.detach()
        climbExitHold.current=false
        const p = lastSafeRef.current
        pos.current.set(p[0], p[1] + 0.05, p[2])
        vel.current.set(0, 0, 0)
        grounded.current = true
      },
      get blocker() { return blocker.current },
      get recoveries() { return recoveries.current },
      get floorCount() { return collision.world.floors.length },
      // Physical contact diagnostics share the actual runtime collision world.
      get nearbyColliders() {
        return [...collision.world.boxes, ...collision.world.dynamic]
          .filter(({box}) => box.max.x >= pos.current.x - 1 && box.min.x <= pos.current.x + 1 &&
            box.max.z >= pos.current.z - 1 && box.min.z <= pos.current.z + 1 &&
            box.max.y >= pos.current.y - 1 && box.min.y <= pos.current.y + PLAYER_HEIGHT_M + 1)
          .map(({box, name, isFloor}) => ({name, isFloor, min: box.min.toArray(), max: box.max.toArray()}))
      },
      get climbing() { return climbing.active?{id:climbing.active.id,progress:climbing.progress,length:climbing.active.length}:null },
      spawn,
    }
    return () => { delete window.__sunny }
  }, [collision, spawn, climbing])

  // ---- pointer lock handling ----------------------------------------
  useEffect(() => {
    const onLockChange = () => {
      useStore.getState().setLocked(!!document.pointerLockElement)
    }
    document.addEventListener('pointerlockchange', onLockChange)
    const reset = e => { if(e.code==='KeyR') window.__sunny?.respawn() }
    const releaseClimb = e => {if(e.code==='KeyW'||e.code==='KeyS')climbExitHold.current=false}
    window.addEventListener('keydown',reset)
    window.addEventListener('keyup',releaseClimb)
    return () => {document.removeEventListener('pointerlockchange', onLockChange);window.removeEventListener('keydown',reset);window.removeEventListener('keyup',releaseClimb)}
  }, [])

  // Write the local human eye before NavigationSystem carries it with the ship.
  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30) // clamp so a hitch can't tunnel
    const store = useStore.getState()
    const k = keys.current

    // ---------- mouse look ----------
    if (document.pointerLockElement && (look.current.dx || look.current.dy)) {
      yaw.current -= look.current.dx * MOUSE_SENSITIVITY
      pitch.current -= look.current.dy * MOUSE_SENSITIVITY
      const limit = Math.PI / 2 - 0.02
      pitch.current = Math.max(-limit, Math.min(limit, pitch.current))
    }
    look.current.dx = 0
    look.current.dy = 0

    // ---------- build the movement basis ----------
    const sinY = Math.sin(yaw.current)
    const cosY = Math.cos(yaw.current)
    // forward on the ground plane from yaw
    const fwd = new THREE.Vector3(-sinY, 0, -cosY)
    const right = new THREE.Vector3(cosY, 0, -sinY)

    let wish = new THREE.Vector3()
    if (k.forward) wish.add(fwd)
    if (k.back) wish.sub(fwd)
    if (k.right) wish.add(right)
    if (k.left) wish.sub(right)
    if (wish.lengthSq() > 0) wish.normalize()
    if (voyage.helm) wish.set(0,0,0)
    // A held climb key must not immediately accelerate into walking on exit.
    // Release W/S once at the deck, then ordinary walking resumes.
    if(climbExitHold.current){
      if(k.forward||k.back)wish.set(0,0,0)
      else climbExitHold.current=false
    }

    const flying = store.movementMode === MOVEMENT_MODES.FLY
    const nearLadder = !flying&&grounded.current ? climbing.nearest(pos.current.toArray()) : null
    store.setNearClimb(flying?'':climbing.active?'W climb up · S climb down':
      nearLadder?'E · Grab '+nearLadder.path.label:'')

    // ================= FLY =================
    if (flying) {
      climbing.detach()
      climbExitHold.current=false
      const fast = k.run
      const speed = fast ? FLY_FAST_SPEED : FLY_SPEED

      const dir = wish.clone()
      // E rises and Q descends (what the HUD advertises); Space also rises because
      // that is the muscle-memory key from walking mode.
      if (k.up || k.jump) dir.y += 1
      if (k.down) dir.y -= 1
      if (dir.lengthSq() > 0) dir.normalize().multiplyScalar(speed)

      // smooth the fly velocity so it is not instant
      vel.current.lerp(dir, 1 - Math.pow(0.0015, dt))

      if (store.flyCollision) {
        const contact=collision.moveFlight(pos.current,vel.current,dt,PLAYER_RADIUS,PLAYER_HEIGHT_M)
        pos.current.copy(contact.position);vel.current.copy(contact.velocity)
      } else pos.current.addScaledVector(vel.current, dt)
      grounded.current = false

      // keep the player over the ship horizontally in fly mode
      const r = Math.hypot(pos.current.x, pos.current.z)
      const maxR = 420
      if (r > maxR) {
        pos.current.x *= maxR / r
        pos.current.z *= maxR / r
      }
      pos.current.y = Math.max(pos.current.y, -60)

      // camera
      camera.position.set(pos.current.x, pos.current.y + EYE_HEIGHT_M, pos.current.z)
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')

      setPlayer({
        position: pos.current.toArray(),
        yaw: yaw.current,
        pitch: pitch.current,
        speed: vel.current.length(),
        grounded: false,
      })
      onFrame?.(pos.current, vel.current)
      return
    }

    // ================= CLIMB =================
    // The path is a guide, not a placement command. Sweep every bounded move
    // against physical floors/walls/ceilings and commit only a reached proposal.
    if(climbing.active){
      const direction=(k.forward?1:0)-(k.back?1:0)
      const current=new THREE.Vector3(...pointAt(climbing.active,climbing.progress))
      const aligned=pos.current.distanceTo(current)<.025
      const proposal=aligned?climbing.propose(direction,dt):{point:current.toArray(),progress:climbing.progress}
      const targetPoint=new THREE.Vector3(...proposal.point)
      const travel=targetPoint.clone().sub(pos.current)
      const distance=travel.length()
      if(distance>0)travel.multiplyScalar(Math.min(distance,CLIMB_SPEED*dt)/distance/Math.max(dt,1e-6))
      // Leave the same clearance the moving hatch requires, so an overhead
      // stop cannot put the body inside the hatch's occupancy safety margin.
      const contact=collision.moveFlight(pos.current,travel,dt,PLAYER_RADIUS+CONTACT_GAP,PLAYER_HEIGHT_M+CONTACT_GAP*2)
      blocker.current=contact.position.distanceTo(targetPoint)>.04&&distance>.01?'Climb path blocked':null
      pos.current.copy(contact.position);vel.current.copy(contact.velocity)
      if(reachedClimbPoint(pos.current.toArray(),proposal.point))climbing.commit(proposal.progress)
      const support=collision.raycastDown(new THREE.Vector3(pos.current.x,pos.current.y+.05,pos.current.z),.15,PLAYER_RADIUS)
      grounded.current=!!support&&Math.abs(support.y-pos.current.y)<.10
      const endpoint=direction>0&&climbing.progress>=climbing.active.length-.002||direction<0&&climbing.progress<.002
      if(endpoint&&grounded.current&&pos.current.distanceTo(targetPoint)<.025){
        climbing.detach();vel.current.set(0,0,0);lastSafe.current.copy(pos.current)
        climbExitHold.current=true
        setHudMessage('Back on the deck')
      }
      camera.position.set(pos.current.x,pos.current.y+EYE_HEIGHT_M,pos.current.z)
      camera.rotation.set(pitch.current,yaw.current,0,'YXZ')
      setPlayer({position:pos.current.toArray(),yaw:yaw.current,pitch:pitch.current,speed:vel.current.length(),grounded:grounded.current,
        climbPose:climbing.active?{id:climbing.active.id,progress:climbing.progress}:null})
      onFrame?.(pos.current,vel.current)
      return
    }

    // ================= WALK =================
    const target = k.run ? RUN_SPEED : WALK_SPEED

    // horizontal acceleration toward the wish direction
    const accel = grounded.current ? GROUND_ACCEL : AIR_ACCEL
    const desired = wish.clone().multiplyScalar(target)
    vel.current.x = THREE.MathUtils.damp(vel.current.x, desired.x, accel, dt)
    vel.current.z = THREE.MathUtils.damp(vel.current.z, desired.z, accel, dt)

    // gravity
    vel.current.y += GRAVITY * dt
    if (vel.current.y < -40) vel.current.y = -40

    // jump with coyote time + input buffering
    if (k.jump) jumpBuffer.current = 0.12
    else jumpBuffer.current = Math.max(0, jumpBuffer.current - dt)

    if (grounded.current) coyote.current = 0.12
    else coyote.current = Math.max(0, coyote.current - dt)

    if (jumpBuffer.current > 0 && coyote.current > 0) {
      // don't jump into a ceiling
      if (!collision.hasCeiling(pos.current, PLAYER_RADIUS, pos.current.y, PLAYER_HEIGHT_M)) {
        vel.current.y = JUMP_SPEED
        grounded.current = false
        coyote.current = 0
        jumpBuffer.current = 0
        bobTime.current = 0
      }
    }

    // ---------- integrate + collide ----------
    // remember where we were BEFORE moving, so a move into thin air can be
    // undone by the void guard below
    const prevX = pos.current.x
    const prevZ = pos.current.z

    // horizontal first, so walls stop us even mid-air
    pos.current.x += vel.current.x * dt
    pos.current.z += vel.current.z * dt

    const wantX = pos.current.x
    const wantZ = pos.current.z
    const res = collision.resolve(pos.current, vel.current, PLAYER_RADIUS, PLAYER_HEIGHT_M)
    const blocked = res.position.x !== wantX || res.position.z !== wantZ

    if (!blocked) {
      blocker.current = null
    } else {
      blocker.current = res.blocker || 'unknown'
      // step-up: if the obstruction is low enough to step over, climb it
      let stepped = false
      if (grounded.current) {
        const stepY = collision.stepHeightAt(pos.current, PLAYER_RADIUS, STEP_HEIGHT)
        if (stepY !== null) {
          const lifted = new THREE.Vector3(wantX, stepY, wantZ)
          if (!collision.isBlocked(lifted, PLAYER_RADIUS, PLAYER_HEIGHT_M)) {
            pos.current.set(wantX, stepY, wantZ)
            stepped = true
          }
        }
      }
      if (!stepped) {
        // resolve() has already zeroed ONLY the axis it pushed out on, so the
        // tangential component survives and the player slides along walls
        // instead of stopping dead.
        pos.current.x = res.position.x
        pos.current.z = res.position.z
        vel.current.x = res.velocity.x
        vel.current.z = res.velocity.z
      }
    }

    // ---- void guard -------------------------------------------------
    // A diagonal gap between two floor cells has no boundary wall, so the
    // player could otherwise squeeze through into the sea. If the new spot has
    // no floor within stepping distance while we are on the ground, undo the
    // horizontal move.
    {
      const support = collision.raycastDown(
        new THREE.Vector3(pos.current.x, pos.current.y + 0.05, pos.current.z),
        STEP_HEIGHT + 0.10, PLAYER_RADIUS)
      if (!support && grounded.current) {
        pos.current.x = prevX
        pos.current.z = prevZ
        vel.current.x = 0
        vel.current.z = 0
        grounded.current = true
      }
    }

    // vertical
    pos.current.y += vel.current.y * dt

    // ---------- ground detection ----------
    const probe = collision.raycastDown(new THREE.Vector3(pos.current.x, pos.current.y + 0.05, pos.current.z), 60, PLAYER_RADIUS)
    const wasGrounded = grounded.current

    if (probe) {
      if (vel.current.y <= 0 && pos.current.y <= probe.y + 0.35) {
        pos.current.y = probe.y
        vel.current.y = 0
        if (!wasGrounded && vel.current.y < -6) camShake.current = 0.25
        grounded.current = true
      } else {
        grounded.current = false
      }
    } else {
      grounded.current = false
    }

    // ---- remember safe footing ---------------------------------------
    if (grounded.current) {
      lastSafe.current.copy(pos.current)
    }

    // ---- leaving the ship ----------------------------------------------
    // Only a genuine departure from the ship is corrected. Jumping down
    // between decks, off a stair, into a room below or across the garden are
    // all legitimate moves, so the test is NOT "you dropped a metre" - it is
    // "there is no walkable surface anywhere below you".
    //
    // The previous rule was "you dropped 1.6 m and nothing was within
    // (drop + 1.4) m". Because that probe was a single centre point it missed
    // narrow stair treads and interior floor layers, so simply hopping down a
    // flight or stepping off a landing teleported the player back up to the
    // last place they had been standing. The probe now uses the player's
    // footprint, looks the whole way down, and only rescues when the deck
    // really is behind them (or they have reached the sea).
    const drop = lastSafe.current.y - pos.current.y
    const below = collision.raycastDown(
      new THREE.Vector3(pos.current.x, pos.current.y + 0.05, pos.current.z),
      VOID_LOOKAHEAD, PLAYER_RADIUS)
    const stranded = drop > 2.0 && !below
    const inWater = pos.current.y < waterGuardY
    const lost = pos.current.y < lastSafe.current.y - 30.0
    if (stranded || inWater || lost) {
      recoveries.current++
      pos.current.copy(lastSafe.current)
      pos.current.y += 0.05
      vel.current.set(0, 0, 0)
      grounded.current = true
      if (inWater || stranded) setHudMessage('Returned to the deck')
    }

    // ---------- camera ----------
    const speedNow = Math.hypot(vel.current.x, vel.current.z)

    // subtle head bob while walking
    let bobY = 0
    let bobX = 0
    if (grounded.current && speedNow > 0.4) {
      bobTime.current += dt * speedNow * 2.1
      const amp = Math.min(speedNow / RUN_SPEED, 1) * 0.045
      bobY = Math.sin(bobTime.current * 2) * amp
      bobX = Math.sin(bobTime.current) * amp * 0.6
    }

    // landing dip
    if (camShake.current > 0) {
      camShake.current = Math.max(0, camShake.current - dt * 2.2)
      bobY -= camShake.current * 0.35
    }

    const eyeY = pos.current.y + EYE_HEIGHT_M + bobY
    const eyeX = pos.current.x + bobX * 0.4
    const eyeZ = pos.current.z

    if (store.personMode === PERSON_MODES.THIRD && grounded.current) {
      // third person: pull back along the view direction, clip through walls
      const dir = new THREE.Vector3(
        Math.sin(yaw.current) * Math.cos(pitch.current),
        Math.sin(pitch.current),
        Math.cos(yaw.current) * Math.cos(pitch.current)
      ).normalize()
      let dist = THIRD_PERSON_DISTANCE
      // shorten if it would put the camera inside something
      for (const { box } of collision.world.boxes) {
        if (box.containsPoint(new THREE.Vector3(eyeX, eyeY, eyeZ))) break
      }
      camera.position.set(
        eyeX + dir.x * dist,
        eyeY + dir.y * dist + THIRD_PERSON_HEIGHT * 0.2,
        eyeZ + dir.z * dist
      )
      camera.lookAt(eyeX, eyeY + 0.25, eyeZ)
    } else {
      camera.position.set(eyeX, eyeY, eyeZ)
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
    }

    setPlayer({
      position: [pos.current.x, pos.current.y, pos.current.z],
      yaw: yaw.current,
      pitch: pitch.current,
      speed: speedNow,
      grounded: grounded.current,
    })
    onFrame?.(pos.current, vel.current)
  }, -2)

  return null
}
