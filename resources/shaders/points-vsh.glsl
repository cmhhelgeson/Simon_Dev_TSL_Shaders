
attribute vec2 particleData;

varying float vAngle;
varying vec4 vColour;

uniform sampler2D sizeOverLife;
uniform sampler2D colourOverLife;
uniform sampler2D twinkleOverLife;
uniform float time;
uniform float spinSpeed;

void main() {

  float life = particleData.x;
  float id = particleData.y;

  float sizeSample = texture2D(sizeOverLife, vec2(life, 0.5)).x;
  vec4 colourSample = texture2D(colourOverLife, vec2(life, 0.5));
  float twinkleSample = texture2D(twinkleOverLife, vec2(life, 0.5)).x;
  float twinkle = mix(1.0, sin(time * 20.0 + id * 6.28) * 0.5 + 0.5, twinkleSample);

  vec3 mvPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * vec4(mvPosition, 1.0);
  gl_PointSize = sizeSample * 1.0 / -mvPosition.z;
  vAngle = spinSpeed * time + id * 6.28;
  vColour = colourSample;
  vColour.a *= twinkle;
}