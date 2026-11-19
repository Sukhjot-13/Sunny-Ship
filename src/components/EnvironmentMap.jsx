import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

/**
 * Procedural Golden Hour image-based lighting.
 *
 * Builds a PMREM environment matching the Golden Hour sky dome, sunlit clouds,
 * blazing low sun lobe, and deep navy ocean with golden wave glint. Gives
 * marine brass, gold fittings, glass windows, and satin painted timber rich,
 * physically plausible specular reflections and warm/cool ambient fill.
 */
export function ProceduralEnvironment({ sunDir, resolution = 256 }) {
  const { gl, scene } = useThree()

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    pmrem.compileEquirectangularShader()

    const envScene = new THREE.Scene()

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(50, 48, 32),
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

          float hash2(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }

          float vnoise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
              mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          void main() {
            vec3 d = normalize(vDir);
            vec3 sDir = normalize(uSunDir);
            float h = d.y;
            float sd = max(dot(d, sDir), 0.0);
            float sunAz = clamp(dot(normalize(vec2(d.x, d.z) + 1e-5), normalize(vec2(sDir.x, sDir.z))) * 0.5 + 0.5, 0.0, 1.0);

            vec3 horizon = mix(vec3(0.58, 0.66, 0.78), vec3(1.18, 0.76, 0.42), pow(sunAz, 1.4) * 0.85 + 0.15);
            vec3 zenith = vec3(0.07, 0.22, 0.48);
            vec3 midSky = vec3(0.22, 0.46, 0.76);

            vec3 col;
            if (h > 0.0) {
              col = mix(horizon, midSky, pow(smoothstep(0.0, 0.32, h), 0.72));
              col = mix(col, zenith, pow(smoothstep(0.18, 0.92, h), 0.9));
              // Sunlit cloud luminance patches so glossy brass/glass pick up organic highlights
              vec2 cuv = d.xz / (h + 0.2) * 0.55;
              float cl = smoothstep(0.48, 0.78, vnoise(cuv) * 0.65 + vnoise(cuv * 2.3) * 0.35);
              vec3 cloudGlow = mix(vec3(0.62, 0.66, 0.75), vec3(1.35, 0.96, 0.60), pow(sunAz, 1.2) * 0.8 + 0.2);
              col = mix(col, cloudGlow, cl * smoothstep(0.02, 0.22, h) * 0.55);
            } else {
              // Deep ocean below with golden reflection sheen toward sun azimuth
              vec3 seaDeep = vec3(0.04, 0.11, 0.19);
              vec3 seaHorizon = mix(vec3(0.18, 0.28, 0.38), vec3(0.62, 0.40, 0.22), pow(sunAz, 1.6));
              col = mix(seaHorizon, seaDeep, pow(clamp(-h, 0.0, 1.0), 0.42));
              // Reflected solar glitter lobe on the ocean hemisphere for metallic undersides
              vec3 reflSun = vec3(sDir.x, -sDir.y, sDir.z);
              float rsd = max(dot(d, normalize(reflSun)), 0.0);
              col += vec3(1.2, 0.72, 0.32) * pow(rsd, 18.0) * 2.2;
            }

            // High-dynamic-range golden sun disc + broad atmospheric corona
            col += vec3(1.0, 0.84, 0.55) * pow(sd, 64.0) * 14.0;
            col += vec3(1.0, 0.74, 0.42) * pow(sd, 7.0) * 1.15;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    )
    envScene.add(sky)

    const target = pmrem.fromScene(envScene, 0.03)
    scene.environment = target.texture
    scene.environmentIntensity = 0.95

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
