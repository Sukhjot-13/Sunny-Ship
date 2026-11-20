import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fleet } from '../systems/fleet.js'
import { voyage } from '../systems/navigation.js'
import { makeSailMaterial, windState } from '../systems/sails.js'
import { SUN_DIR } from './Environment.jsx'

const stations = [[-16, .08], [-13, 1.8], [-9, 3.35], [-4, 4.25], [2, 4.45], [8, 4.24], [12, 3.38], [14, 2.25]]
const rings = [[.1, -3.1], [.59, -2.2], [.89, -.45], [1, 1.25], [.98, 2.6]]

/** Loft side planking and structural paint bands between measured stations. */
function buildHull(color) {
  const positions = [], colors = [], indices = []
  const wood = new THREE.Color('#63412b')
  const painted = new THREE.Color(color)
  const tone = new THREE.Color()
  for (const side of [-1, 1]) {
    const base = positions.length / 3
    stations.forEach(([z, beam], lengthIndex) => {
      rings.forEach(([width, y], heightIndex) => {
        const sheer = 0.62 * (z / 14) ** 4
        positions.push(side * beam * width, y + sheer, z)
        tone.copy(heightIndex === 2 || heightIndex === 3 ? painted : wood)
        tone.multiplyScalar(0.85 + heightIndex * 0.05 + Math.sin(lengthIndex * 5.3) * 0.06)
        colors.push(tone.r, tone.g, tone.b)
        if (lengthIndex === 0 || heightIndex === 0) return
        const corner = base + lengthIndex * rings.length + heightIndex
        const previous = corner - rings.length
        indices.push(previous - 1, corner - 1, corner, previous - 1, corner, previous)
      })
    })
  }
  const hull = new THREE.BufferGeometry()
  hull.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  hull.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  hull.setIndex(indices)
  hull.computeVertexNormals()
  return hull
}

/** Shape the deck and close the stern of the lofted hull. */
function buildDeck() {
  const outline = new THREE.Shape()
  stations.forEach(([z, beam], index) => {
    if (index === 0) outline.moveTo(-beam * .98, -z)
    else outline.lineTo(-beam * .98, -z)
  })
  for (const [z, beam] of [...stations].reverse()) outline.lineTo(beam * .98, -z)
  outline.closePath()
  const deck = new THREE.ExtrudeGeometry(outline, { depth: .6, bevelEnabled: false })
  deck.rotateX(-Math.PI / 2)
  return deck
}

/** Cloth has its own static belly. The shared sail shader adds the wind. */
function buildCanvas() {
  const geometry = new THREE.PlaneGeometry(11.2, 7.5, 24, 15)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) / 5.6, y = positions.getY(i) / 3.75
    positions.setXYZ(i, positions.getX(i) * (1 - .09 * (y + 1)),
      positions.getY(i) + .4 * x * x, -1.15 * (1 - x * x) * (1 - y * y))
  }
  geometry.computeVertexNormals()
  return geometry
}

/** Stays and sheets run from spars to the deck and adjacent mast. */
function buildRigging() {
  const segments = []
  for (const z of [-6, 6]) {
    for (const side of [-1, 1]) {
      segments.push(side * 3.7, 3.1, z + 3, 0, 21.8, z)
      segments.push(side * 3.6, 3.1, z + 1, side * 5.65, 16.7, z)
      segments.push(side * 3.1, 3.1, z - 2, side * 5.3, 9.4, z - .45)
    }
  }
  segments.push(0, 21.8, -6, 0, 3.5, -15.3, 0, 21.8, 6, 0, 17, -6, 0, 21.8, 6, 0, 4, 13)
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(segments, 3))
}

function PatrolShip({ ship, waterLevel }) {
  const root = useRef(null), smoke = useRef(null)
  const hull = useMemo(() => buildHull(ship.color), [ship.color])
  const sail = useMemo(() => makeSailMaterial({ design: 'stripes', stripe: ship.color, authoredUV: true, projection: 'x', sunDir: SUN_DIR }), [ship.color])
  const geometry = useMemo(() => ({ canvas: buildCanvas(), deck: buildDeck(), rigging: buildRigging() }), [])
  useEffect(() => () => {
    hull.dispose()
    sail.dispose()
    Object.values(geometry).forEach(item => item.dispose())
  }, [hull, sail, geometry])

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime
    const east = ship.east - voyage.east, south = ship.south - voyage.south
    const sink = Math.min(1, ship.sinking / 6.2)
    root.current.visible = sink < 1 && Math.hypot(east, south) < 1750
    if (!root.current.visible) return
    root.current.position.set(east, waterLevel - sink * sink * 27 + Math.sin(elapsed * 1.08 + ship.id) * .3, south)
    root.current.rotation.set(-sink * .73, ship.yaw, sink * .62 + Math.sin(elapsed * .92 + ship.id) * .024, 'YXZ')
    sail.uniforms.uTime.value = elapsed + ship.id
    sail.uniforms.uWind.value = windState.strength
    sail.uniforms.uWindDir.value.set(0.12, 0.07, -1)
    const haze = ship.health ? ship.damageTimer / 2.5 : 1 - sink
    smoke.current.visible = haze > .01
    if (smoke.current.visible) {
      smoke.current.children.forEach((puff, i) => {
        const age = (elapsed * .55 + i / 7) % 1
        puff.position.set(age * 3 + Math.sin(i * 3) * 1.1, 4 + age * 9, Math.cos(i * 2) * (1 + age * 2))
        puff.scale.setScalar(1.2 + age * 2)
        puff.material.opacity = Math.sin(age * Math.PI) * haze * .33
      })
    }
  }, -.7)

  return (
    <group ref={root} name={ship.name}>
      <mesh geometry={hull}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.82} />
      </mesh>
      <mesh geometry={geometry.deck} position={[0, 2.2, 0]}>
        <meshStandardMaterial color="#9a724b" roughness={0.86} />
      </mesh>
      <mesh position={[0, 1.0, 13.85]}>
        <boxGeometry args={[4.25, 3.1, .48]} />
        <meshStandardMaterial color={ship.color} roughness={0.82} />
      </mesh>
      <mesh position={[0, 3.43, 10.5]}>
        <boxGeometry args={[6, 1.9, 6.2]} />
        <meshStandardMaterial color="#604837" roughness={0.84} />
      </mesh>
      <mesh position={[0, 4.55, 10.5]}>
        <boxGeometry args={[6.28, .48, 6.5]} />
        <meshStandardMaterial color={ship.color} roughness={0.88} />
      </mesh>
      {[-6, 6].map(z => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[0, 12.2, 0]}>
            <cylinderGeometry args={[.18, .38, 19.5, 12]} />
            <meshStandardMaterial color="#765437" roughness={0.79} />
          </mesh>
          <mesh position={[0, 16.7, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[.15, .18, 11.7, 9]} />
            <meshStandardMaterial color="#5c422b" roughness={0.81} />
          </mesh>
          <mesh geometry={geometry.canvas} material={sail} position={[0, 12.85, -.45]} />
          <mesh position={[1.02, 21.15, 0]}>
            <planeGeometry args={[2.04, .96]} />
            <meshStandardMaterial color={ship.color} side={THREE.DoubleSide} roughness={0.87} />
          </mesh>
        </group>
      ))}
      <lineSegments geometry={geometry.rigging}>
        <lineBasicMaterial color="#554235" transparent opacity={0.84} />
      </lineSegments>
      <group ref={smoke} visible={false}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i}>
            <icosahedronGeometry args={[1, 1]} />
            <meshBasicMaterial color="#4b4947" transparent depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function PatrolFleet({ waterLevel }) {
  return fleet.map(ship => <PatrolShip key={ship.id} ship={ship} waterLevel={waterLevel} />)
}
