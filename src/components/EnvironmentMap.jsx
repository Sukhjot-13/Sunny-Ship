import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

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
export function ProceduralEnvironment({ sunDir, resolution = 128 }) {
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
          uSunDir: { value: sunDir.clone().normalize() },
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
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 sky    = mix(vec3(0.66, 0.78, 0.90), vec3(0.16, 0.36, 0.66), clamp(h, 0.0, 1.0));
            vec3 ground = mix(vec3(0.34, 0.38, 0.36), vec3(0.12, 0.14, 0.16), clamp(-h, 0.0, 1.0));
            vec3 col = h > 0.0 ? sky : ground;
            // sun disc + glow, so metal picks up a highlight
            float sd = max(dot(d, normalize(uSunDir)), 0.0);
            col += vec3(1.0, 0.95, 0.84) * pow(sd, 48.0) * 6.0;
            col += vec3(1.0, 0.92, 0.78) * pow(sd, 6.0) * 0.35;
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
  }, [gl, scene, sunDir, resolution])

  return null
}
