import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { SUN_DIR, skyRadiance } from '../systems/maritimeLight.js'

/**
 * Procedural image-based lighting.
 *
 * The ship is lit by a real directional sun, but shadowed surfaces were
 * rendering almost black because there was no environment to bounce light
 * into them. This builds a PMREM environment from a small procedural sky
 * (sky gradient + sun disc + sea colour) and assigns it to scene.environment,
 * which gives physically plausible ambient/reflective light with no HDR
 * download and no network dependency.
 */
export function ProceduralEnvironment() {
  const { gl, scene } = useThree()

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()

    // build a tiny scene that looks like sky-over-ocean
    const envScene = new THREE.Scene()

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          uSunDir: { value: SUN_DIR },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uSunDir;
          varying vec3 vDir;
          ${skyRadiance}
          void main() {
            vec3 d = normalize(vDir);
            vec3 sea = mix(vec3(.15, .23, .29), vec3(.035, .076, .103), clamp(-d.y, 0.0, 1.0));
            vec3 sky = maritimeSky(d, uSunDir);
            float solarReflection = pow(max(dot(d, uSunDir), 0.0), 430.0);
            vec3 col = mix(sea, sky + vec3(4.8, 2.6, 1.1) * solarReflection, smoothstep(-.10, .05, d.y));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    )
    envScene.add(sky)

    const target = pmrem.fromScene(envScene, 0.04)
    scene.environment = target.texture
    scene.environmentIntensity = 0.65

    return () => {
      scene.environment = null
      target.dispose()
      pmrem.dispose()
      sky.geometry.dispose()
      sky.material.dispose()
    }
  }, [gl, scene])

  return null
}
