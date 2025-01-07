import * as THREE from 'three';
import {
  fract,
  length,
  smoothstep,
  float,
  Fn,
  mix,
  If,
  round,
  ceil,
  viewportSize,
  floor,
  uniform,
  length,
  max,
  abs,
  uv,
  vec3,
  remap,
  reference,
  step,
  select,
  negate,
  min,
  sqrt,
  vec2,
  If,
  pow,
  sign,
  cos,
  acos
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

// abs(a) - returns the absolute value of a
// return a < 0 > -a : a;

// floor(a)
// return nearest integer value of 'a' that's less than or equal to 'a'

// ceil(a)
// return nearest integer value of 'a' that's less than or equal to 'a'

// fract(a)
// return fractional part of 'a'

// mod(x, y)
// return x modulo y.

enum FunctionMode {
	CEIL,
	FLOOR,
	ROUND,
	FRACT,
}

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();

  const effectController = {
    cellWidth: uniform( 15 ),
    lineWidth: uniform( 1.0 ),
    vignetteColorMin: uniform( 0.3 ),
    vignetteColorMax: uniform( 1.0 ),
    vignetteRadius: uniform( 1.0 ),
    lightFallOff: uniform( 0.3 ),
    circleRadius: uniform( 250 ),
    functionMode: uniform( 0 ),
    'Display Function': 'CEIL',
  };
  const red = vec3( 1.0, 0.0, 0.0 );
  const blue = vec3( 0.0, 0.0, 1.0 );
  const yellow = vec3( 1.0, 1.0, 0.0 );
  const black = vec3( 0.0, 0.0, 0.0 );
  const green = vec3( 0.0, 1.0, 0.0 );

  const drawGrid = ( baseColor, lineColor, cellWidth, lineWidth ) => {

    const center = uv().sub( 0.5 );

    const gridPosition = center.mul( viewportSize ).div( cellWidth );
    // Access each individual cell's uv space.
    const cellUV = fract( gridPosition );

    // Move center of each cell (0, 0) from bottom-left to the middle.
    cellUV.assign( abs( cellUV.sub( 0.5 ) ) );
    const distToEdge = ( float( 0.5 ).sub( max( cellUV.x, cellUV.y ) ) ).mul( cellWidth );
    const ceilLine = smoothstep( 0.0, lineWidth, distToEdge );

    const color = mix( lineColor, baseColor, ceilLine );

    return color;

  };

  const drawBackgroundColor = () => {

    const {
      vignetteColorMin,
      vignetteColorMax,
      vignetteRadius,
      lightFallOff,
    } = effectController;

    // Get the distance from the center of the uvs
    const distFromCenter = length( abs( uv().sub( 0.5 ) ) );
    // Move distance from range [0, 0.5] to range [1.0, 0.5]/[0.5, 1.0]
    const vignette = float( 1.0 ).sub( distFromCenter );
    vignette.assign( smoothstep( vignetteRadius.oneMinus(), lightFallOff.oneMinus(), vignette ) );
    return vec3( remap( vignette, 0.0, 1.0, vignetteColorMin, vignetteColorMax ) );

  };

  const sdfCircle = ( positionNode, radiusNode ) => {

    return length( positionNode ).sub( radiusNode );

  };

  material.colorNode = Fn( () => {

    const { cellWidth, lineWidth, circleRadius } = effectController;

    const vUv = uv();

    // Create baseline color
    const color = vec3( 0.9 ).toVar( 'color' );
    const center = vUv.sub( 0.5 );
    // Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
    const viewportPosition = center.mul( viewportSize );

    const circleDistance = sdfCircle( viewportPosition, circleRadius );

    color.assign( drawBackgroundColor() );
    color.assign( drawGrid( color, vec3( 0.5 ), cellWidth, lineWidth ) );
    color.assign( drawGrid( color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
    color.assign( mix( green, color, step( 0.0, circleDistance ) ) );


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
  gui.add( effectController.circleRadius, 'value', 1.0, 500.0 ).step( 1.0 ).name( 'circleRadius' );
  const vignetteFolder = gui.addFolder( 'Vignette' );
  vignetteFolder.add( effectController.vignetteColorMin, 'value', 0.0, 0.5 ).step( 0.01 ).name( 'vignetteColorMin' );
  vignetteFolder.add( effectController.vignetteColorMax, 'value', 0.5, 1.0 ).step( 0.01 ).name( 'vignetteColorMax' );
  vignetteFolder.add( effectController.vignetteRadius, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'vignetteRadius' );
  vignetteFolder.add( effectController.lightFallOff, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'lightFallOff' );


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
