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
  acos,
  rotate,
  sin,
  timerLocal
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
    boxX: uniform( 0.0 ),
    boxY: uniform( 0.0 ),
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

    const gridSpace = center.mul( viewportSize ).sub( sin( timerLocal() ).mul( 400 ) );
    const gridPosition = rotate( gridSpace, timerLocal() ).div( cellWidth );
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

  const sdfBox = ( posNode, boundNode ) => {

    const d = abs( posNode ).sub( boundNode );
    return length( max( d, 0.0 ) ).add( min( max( d.x, d.y ), 0.0 ) );

  };

  material.colorNode = Fn( () => {

    const { cellWidth, lineWidth, boxX, boxY } = effectController;

    const vUv = uv();

    // Create baseline color
    const color = vec3( 0.9 ).toVar( 'color' );
    const center = vUv.sub( 0.5 );
    // Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
    const viewportPosition = center.mul( viewportSize );

    const moveBox = viewportPosition.sub( vec2( boxX, boxY ) );
    const rotateBox = rotate( moveBox, mix( - 3.0, 3.0, sin( timerLocal() ) ) );
    const boxDistance = sdfBox( rotateBox, vec2( 200.0, 50.0 ) );

    color.assign( drawBackgroundColor() );
    color.assign( drawGrid( color, vec3( 0.5 ), cellWidth, lineWidth ) );
    color.assign( drawGrid( color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
    color.assign( mix( green, color, step( 0.0, boxDistance ) ) );


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

  window.addEventListener( 'mousemove', ( e ) => {

    const { offsetX, offsetY } = e;
    const { boxX, boxY } = effectController;

    boxX.value = offsetX - window.innerWidth / 2;
    boxY.value = window.innerHeight - offsetY - window.innerHeight / 2;

  } );


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
