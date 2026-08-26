
import {Fn, vec3, mix} from 'three/tsl'

export

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

float inverseLerp(float a, float b, float x) {
  return saturate((x - a) / (b - a));
}

// Taken from: https://www.shadertoy.com/view/ttc3zr
//------------------------------------------------------------------------------

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  // float depthSample = texture(depthTexture, uv).r;

  vec4 depthSample = texture2D(depthTexture, uv);
  float unpackedDepth = unpackRGBAToDepth(depthSample);

  vec4 mapSample = texture2D(map, vUv * 50.0);

  // Depth of the scene in view space, at this pixel
  float depth = perspectiveDepthToViewZ(unpackedDepth, cameraNearFar.x, cameraNearFar.y);
  float viewZ = perspectiveDepthToViewZ(gl_FragCoord.z, cameraNearFar.x, cameraNearFar.y);

  float distToBackground = viewZ - depth;

  float alpha = inverseLerp(2.0, 0.0, vPositionWorld.y);
  alpha = pow(alpha, 2.0);

  float glow = inverseLerp(1.0, 0.0, distToBackground);
  glow = pow(glow, 8.0) * 50.0;

  float noiseSample = noise13(vPositionWorld * 2.0 + vec3(0.0, time * 8.0, 0.0));

  noiseSample = noiseSample * 0.5 + 0.5;

  // gl_FragColor = vec4(vec3(noiseSample), 1.0);
  // return;

  vec3 BLUE = vec3(0.0, 0.0, 1.0);
  vec3 ORANGE = vec3(1.0, 0.5, 0.0);
  vec3 tintColour = mix(BLUE, ORANGE, alpha) * 5.0;

  vec3 shieldColour = mapSample.xyz * tintColour * alpha;
  vec3 glowColour = ORANGE * (alpha + glow);
  vec3 finalColour = glowColour + shieldColour * noiseSample;

  gl_FragColor = vec4(finalColour, 1.0);
}

export const depthShader = Fn(() => {


	const BLUE = vec3(0.0, 0.0, 1.0);
	const ORANGE = vec3(1.0, 0.5, 0.0)
	const tintColour = mix(BLUE, ORANGE, alpha).mul(5.0);

	const shieldColor = mapSample.xyz.mul(tintColor).mul(alpha);
	const glowColor = ORANGE.mul(alpha.add(glow));
	const finalColor = glowColor.add(shieldColor.mul(noiseSamples))

	return finalColor;

	


})