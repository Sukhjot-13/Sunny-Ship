import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { coastRadius, ISLANDS } from '../config/archipelago.js'
import { voyage } from '../systems/navigation.js'
import { SUN_DIR } from './Environment.jsx'

const cliff = new THREE.Color('#776c61')
const sand = new THREE.Color('#c6ae86')
const canopy = new THREE.Color('#374e32')
const scrub = new THREE.Color('#657149')
const mistCool = new THREE.Color('#a1b5c5')
const mistWarm = new THREE.Color('#dbb88b')

/** Irregular, submerged foothills support a raised, eroded spine. */
function islandHeight(island, x, z) {
  const u = x / island.radius
  const v = z / island.radius
  const angle = Math.atan2(v, u)
  const coast = coastRadius(angle, island.seed)
  const inland = Math.max(0, 1 - Math.hypot(u, v * 1.09) / coast)
  const spine = Math.sin(u * 5 + v * 2 + island.seed) * 0.21 + 0.77
  const erosion = Math.sin(u * 29 + v * 9) * Math.cos(v * 24 - u * 13) * 0.055
  const twinPeaks = Math.max(
    Math.exp(-((u + 0.28) ** 2 * 24 + (v + 0.04) ** 2 * 10)),
    Math.exp(-((u - 0.29) ** 2 * 23 + (v - 0.1) ** 2 * 15)) * 0.93,
  )
  const rise = Math.pow(inland, island.seed === 8 ? 0.67 : 0.79)
  const crown = island.seed === 8 ? 0.29 + 0.81 * twinPeaks : 0.94
  return inland > 0
    ? island.height * rise * (spine + erosion) * crown - 0.6
    : Math.max(-16, -0.6 - (Math.hypot(u, v * 1.09) / coast - 1) * 70)
}

/** Sculpt ridges, slate strata, vegetation and a narrow dry shoreline. */
function buildTerrain(island) {
  const size = island.radius * 2.33
  const geometry = new THREE.PlaneGeometry(size, size, 96, 96)
  geometry.rotateX(-Math.PI / 2)
  const points = geometry.attributes.position
  for (let i = 0; i < points.count; i++) {
    points.setY(i, islandHeight(island, points.getX(i), points.getZ(i)))
  }
  geometry.computeVertexNormals()
  const normals = geometry.attributes.normal
  const colors = []
  const color = new THREE.Color()
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), y = points.getY(i), z = points.getZ(i)
    const slope = normals.getY(i)
    const layer = 0.5 + 0.5 * Math.sin(y * 1.05 - x * 0.14 + z * 0.06 + Math.sin(z * 0.13))
    const terrainNoise = 0.5 + 0.5 * Math.sin(x * 0.28 + z * 0.41) * Math.cos(x * 0.51 - z * 0.13)
    const plantCover = THREE.MathUtils.smoothstep(slope + terrainNoise * 0.24, 0.56, 0.92) *
      THREE.MathUtils.smoothstep(y, 1.8, 9)
    color.copy(cliff).multiplyScalar(0.83 + layer * 0.28)
    color.lerp(sand, (1 - THREE.MathUtils.smoothstep(y, 1, 5)) * (0.62 + 0.38 * slope))
    color.lerp(scrub, plantCover * 0.85).lerp(canopy, terrainNoise * plantCover * 0.77)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

/** Seeded hillside forest with individual trunks and clustered crowns. */
function buildForest(island) {
  let seed = island.seed
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const trees = []
  for (let i = 0; i < 730; i++) {
    const x = (random() * 2 - 1) * island.radius
    const z = (random() * 2 - 1) * island.radius
    const y = islandHeight(island, x, z)
    const slope = Math.hypot(islandHeight(island, x + 2, z) - y, islandHeight(island, x, z + 2) - y)
    const clearing = Math.sin(x * 0.11 - z * 0.13) * Math.cos(x * 0.07 + z * 0.15)
    if (y < 2.5 || slope > 2.4 || clearing > 0.47 || (island.beacon && Math.hypot(x + 9, z - 12) < 8)) continue
    trees.push({ x, y, z, size: 1.2 + random() * 3.4, angle: random() * Math.PI * 2, tint: random() })
  }
  return trees
}

function Beacon({ island }) {
  const height = islandHeight(island, -9, 12)
  return (
    <group position={[-9, height - 1, 12]}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[2.9, 3.5, 1.4, 16]} />
        <meshStandardMaterial color="#716a60" roughness={0.94} />
      </mesh>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[1.5, 2.4, 10.6, 20]} />
        <meshStandardMaterial color="#ccbf9f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 9.8, 0]}>
        <cylinderGeometry args={[1.67, 1.85, 2.3, 20]} />
        <meshStandardMaterial color="#964636" roughness={0.86} />
      </mesh>
      <mesh position={[0, 11.1, 0]}>
        <cylinderGeometry args={[2.1, 1.55, 0.7, 20]} />
        <meshStandardMaterial color="#383f3e" roughness={0.74} />
      </mesh>
      <mesh position={[0, 12.35, 0]}>
        <cylinderGeometry args={[1.46, 1.46, 2.2, 12]} />
        <meshBasicMaterial color="#ffd18c" />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <mesh key={i} position={[1.47 * Math.cos(i * Math.PI / 3), 12.35, 1.47 * Math.sin(i * Math.PI / 3)]}>
          <boxGeometry args={[0.16, 2.25, 0.16]} />
          <meshStandardMaterial color="#313934" roughness={0.72} />
        </mesh>
      ))}
      <mesh position={[0, 14.25, 0]}>
        <coneGeometry args={[2.12, 1.85, 12]} />
        <meshStandardMaterial color="#363d39" metalness={0.18} roughness={0.74} />
      </mesh>
    </group>
  )
}

function Island({ island, waterLevel }) {
  const group = useRef()
  const crowns = useRef()
  const trunks = useRef()
  const terrain = useMemo(() => buildTerrain(island), [island])
  const trees = useMemo(() => buildForest(island), [island])
  const light = useMemo(() => new THREE.Color(), [])
  const air = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    const pose = new THREE.Object3D()
    const foliage = new THREE.Color()
    trees.forEach(({ x, y, z, size, angle, tint }, i) => {
      pose.rotation.y = angle
      pose.position.set(x, y + size * 0.41, z)
      pose.scale.set(size * 0.12, size * 0.86, size * 0.12)
      pose.updateMatrix()
      trunks.current.setMatrixAt(i, pose.matrix)
      pose.position.set(x, y + size * 0.94, z)
      pose.scale.set(size * 0.68, size * (0.43 + tint * 0.3), size * 0.58)
      pose.updateMatrix()
      crowns.current.setMatrixAt(i, pose.matrix)
      foliage.copy(canopy).lerp(scrub, tint * 0.88)
      crowns.current.setColorAt(i, foliage)
    })
    for (const mesh of [trunks.current, crowns.current]) {
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
    crowns.current.instanceColor.needsUpdate = true
  }, [trees])

  useEffect(() => () => terrain.dispose(), [terrain])

  // The renderer stays centred on the Sunny. Coastlines and forest use chart coordinates.
  useFrame(({ camera }) => {
    const x = island.east - voyage.east
    const z = island.south - voyage.south
    group.current.position.set(x, waterLevel, z)
    const dx = x - camera.position.x, dz = z - camera.position.z
    const range = Math.hypot(dx, dz)
    group.current.visible = range < 1900
    if (!group.current.visible) return
    const sunset = Math.max(0, (dx * SUN_DIR.x + dz * SUN_DIR.z) / Math.max(1, range))
    air.copy(mistCool).lerp(mistWarm, sunset)
    light.copy(air).multiplyScalar(THREE.MathUtils.smoothstep(range, 150, 1750) * 0.50)
    group.current.traverse(object => {
      if (object.material?.isMeshStandardMaterial) object.material.emissive.copy(light)
    })
  }, -0.8)

  return (
    <group ref={group} name={island.name} position={[island.east, waterLevel, island.south]}>
      <mesh geometry={terrain}>
        <meshStandardMaterial vertexColors roughness={0.94} />
      </mesh>
      <instancedMesh ref={trunks} args={[null, null, trees.length]}>
        <cylinderGeometry args={[0.34, 0.59, 1, 5]} />
        <meshStandardMaterial color="#4f4030" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[null, null, trees.length]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial roughness={0.97} />
      </instancedMesh>
      {island.beacon && <Beacon island={island} />}
    </group>
  )
}

export function Archipelago({ waterLevel }) {
  return ISLANDS.map(island => <Island key={island.name} island={island} waterLevel={waterLevel} />)
}
