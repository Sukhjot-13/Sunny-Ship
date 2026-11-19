import { Vector3 } from 'three'

export const SUN_DIR = new Vector3(-0.68, 0.18, -0.72).normalize()
export const SUN_COLOR = '#ffc28b'
export const SKY_FILL = '#9fbde8'

// Linear HDR radiance shared by the visible sky, lighting probe and water.
export const skyRadiance = /* glsl */ `
  vec3 maritimeSky(vec3 direction, vec3 sunDir) {
    float height = max(direction.y, 0.0);
    float towardsSun = max(dot(direction, sunDir), 0.0);
    vec3 zenith = vec3(.027, .115, .315);
    vec3 horizon = vec3(.28, .43, .60);
    vec3 sky = mix(horizon, zenith, pow(clamp(height * 1.3, 0.0, 1.0), .43));
    float haze = exp(-height * 5.6);
    sky += vec3(.84, .34, .095) * pow(towardsSun, 2.45) * haze;
    sky += vec3(1.55, .76, .24) * pow(towardsSun, 85.0);
    return sky;
  }
`
