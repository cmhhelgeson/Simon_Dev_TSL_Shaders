
import * as THREE from 'three';
import { uniform, Fn, texture, dFdx, dFdy, time, sin, mix, timerLocal, floor, float, vec3, dot, fract, uint, Loop } from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

// InverseLerp(currentValue, minValue, maxValue)
// Returns how far between minValue and maxValue the current value is
// Or the distance traveled to maxValue from minValue as a percentage.
// Could also be construed as a linear version of smooth step.

// inverseLerp( 0.0, 0.0, 100.0 ) -> 0.0
// inverseLerp( 25.0, 0.0, 100.0 ) -> 0.25
// inverseLerp( 100.0, 0.0, 100.0 ) -> 1.0
// inverseLerp( 4.0, 3.0, 6.0 ); -> 0.333...

// Remap(currentValue, inMin, inMax, outMin, outMax)
// Maps the percentage traveled along the range [inMin, inMax]
// to the percentage traveled along the range [outMin, outMax]
// Three.js natively implements this function within the 'RemapNode' class.

// remap(50.0, 0.0, 100.0, 5.0, 10.0) -> 7.5
// 50% into range [50, 100] is 50.0 -> 50% into range [5, 10] -> 7.5

// dFdx(x) dFdy(y)
// Get delta of current pixel value and value of the neighboring pixel.
//
// The GPU organizes fragment shaders into 2x2 blocks
// Example of a 2x2 block:
//
// +---+------+-------------
// | (x, y+1) | (x+1, y+1) |
// +---+------+------------+
// |  (x, y)  |  (x+1, y)  |
// +----------+------------+

// dFdx(value) = value(x+1) - value(x);
// dFdy(value) = value(y+1) - value(y);

enum ShaderMode {
	'Animate',
	'dFdx',
	'dFdy'
}

const hash3 = ( pNode ) => {

  const p = vec3(
    dot( pNode, vec3( 127.1, 311.7, 74.7 ) ),
    dot( pNode, vec3( 269.5, 183.3, 246.1 ) ),
    dot( pNode, vec3( 113.5, 271.9, 124.6 ) )
  );

  return float( - 1.0 ).add(
    float( 2.0 ).mul( fract(
      sin( p ).mul( 43578.543123 )
    ) )
  );

};

const noise3D = ( p ) => {

  const i = floor( p );
  const f = fract( p );

  const u = f.mul( f ).mul(
    float( 3.0 ).sub( f.mul( 2.0 ) )
  );

  // Gradients
  const ga = hash3( i.add( vec3( 0.0, 0.0, 0.0 ) ) );
  const gb = hash3( i.add( vec3( 1.0, 0.0, 0.0 ) ) );
  const gc = hash3( i.add( vec3( 0.0, 1.0, 0.0 ) ) );
  const gd = hash3( i.add( vec3( 1.0, 1.0, 0.0 ) ) );
  const ge = hash3( i.add( vec3( 0.0, 0.0, 1.0 ) ) );
  const gf = hash3( i.add( vec3( 1.0, 0.0, 1.0 ) ) );
  const gg = hash3( i.add( vec3( 0.0, 1.0, 1.0 ) ) );
  const gh = hash3( i.add( vec3( 1.0, 1.0, 1.0 ) ) );

  // Projections
  const va = f.sub( vec3( 0.0, 0.0, 0.0 ) );
  const vb = f.sub( vec3( 1.0, 0.0, 0.0 ) );
  const vc = f.sub( vec3( 0.0, 1.0, 0.0 ) );
  const vd = f.sub( vec3( 1.0, 1.0, 0.0 ) );
  const ve = f.sub( vec3( 0.0, 0.0, 1.0 ) );
  const vf = f.sub( vec3( 1.0, 0.0, 1.0 ) );
  const vg = f.sub( vec3( 0.0, 1.0, 1.0 ) );
  const vh = f.sub( vec3( 1.0, 1.0, 1.0 ) );

  return mix(
    mix(
      mix(
        dot( ga, va ), dot( gb, vb ), u.x
      ),
      mix(
        dot( gc, vc ), dot( gd, vd ), u.x
      ),
      u.y
    ),
    mix(
      mix(
        dot( ge, ve ), dot( gf, vf ), u.x
      ),
      mix(
        dot( gg, vg ), dot( gh, vh ), u.x
      ),
      u.y
    ),
    u.z
  );

};

const fbm = ( pNode ) => {

  const {
    amplitudePersistence,
    frequencyLacunarity,
    octaves
  } = effectController;

  const currentAmplitude = float( 0.0 ).toVar( 'currentAmplitude' );
  const currentFrequency = float( 0.0 ).toVar( 'currentFrequency' );

  Loop( { start: uint( 0 ), end: octaves, type: 'uint', condition: '<' }, () => {

    const noiseValue = noise3D( pNode.mul() );


  } );


};

const mod289 = ( x ) => {

  return x.sub( floor( x / 289.0 ).mul( 289.0 ) );

};

const permute = ( x ) => {

  return mod289(
    ( x.mul( 34.0 ).add( 1.0 ) ).mul( x )
  );


};

const taylorInvSqrt = ( r ) => {

  return float( 1.79284291400159 ).sub( r.mul( 0.85373472095314 ) );

};


const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();
  const textureLoader = new THREE.TextureLoader();
  const map = textureLoader.load( './resources/uv_grid_opengl.jpg' );

  const effectController = {
    tint: uniform( new THREE.Color( 1.0, 0.0, 0.0 ) ),
  };

  // Grid shaders succintly demonstrate the functionality of dFdx due to the harsh
  // changes between grid lines and the rest of the grid space.
  material.colorNode = Fn( () => {

    const color = texture( map );
    color.assign( mix( dFdx( color ), dFdy( color ), sin( time ) ) );

    return color;

  } )();

  const quad = new THREE.Mesh( geometry, material );
  scene.add( quad );

  renderer = new THREE.WebGPURenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize );

  gui = new GUI();

};

const onWindowResize = () => {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );

};

function animate() {

  renderer.render( scene, camera );

}

init();
