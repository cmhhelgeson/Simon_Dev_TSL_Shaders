import * as THREE from 'three';
import {
  fract,
  length,
  smoothstep,
  float,
  Fn,
  mix,
  viewportSize,
  uniform,
  abs,
  uv,
  vec3,
  remap,
  max,
  negate,
  min,
  dot,
  vec2,
  clamp,
  sign,
  If,
  rotate,
  uint,
  time,
  floor,
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { DrawGrid, SDFBox, SDFCircle } from './util';

let renderer, camera, scene, gui;

enum BooleanEnum {
	UNION,
	INTERSECTION,
	SUBTRACTION
}

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();

  const effectController = {
    // Boolean Op Uniforms
    currentOp: 'UNION',
    currentOpUniform: uniform( uint( 0 ) ),
    // Grid Uniforms
    cellWidth: uniform( 15 ),
    lineWidth: uniform( 1.0 ),
    // Vignette Uniforms
    vignetteColorMin: uniform( 0.3 ),
    vignetteColorMax: uniform( 1.0 ),
    vignetteRadius: uniform( 1.0 ),
    lightFallOff: uniform( 0.3 ),
    // Antialias Uniforms
    antialiasRange: uniform( 1.0 ),
  };
  const red = vec3( 1.0, 0.0, 0.0 );
  const black = vec3( 0.0, 0.0, 0.0 );

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

  const opUnionFn = Fn( ( [ d1, d2 ] ) => {

    return min( d1, d2 );

  } ).setLayout( {
    name: 'opUnion',
    type: 'float',
    inputs: [
      { name: 'd1', type: 'float' },
      { name: 'd2', type: 'float' }
    ]
  } );

  const opIntersectionFn = Fn( ( [ d1, d2 ] ) => {

    return max( d1, d2 );

  } ).setLayout( {
    name: 'opIntersection',
    type: 'float',
    inputs: [
      { name: 'd1', type: 'float' },
      { name: 'd2', type: 'float' }
    ]
  } );

  const opSubtraction = ( d1Node, d2Node ) => {

    return max( negate( d1Node ), d2Node );

  };

  material.colorNode = Fn( () => {

    const {
      cellWidth,
      lineWidth,
      antialiasRange,
      currentOpUniform
    } = effectController;

    const vUv = uv();

    // Create baseline color
    const color = vec3( 0.9 ).toVar( 'color' );
    const center = vUv.sub( 0.5 );
    // Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
    const viewportPosition = center.mul( viewportSize );

    const offsetFromViewportX = viewportSize.x.div( 4 );

    const boxD = SDFBox( rotate( viewportPosition, time ), vec2( 200.0, 100.0 ) );
    const d1 = SDFCircle( viewportPosition.sub( vec2( negate( offsetFromViewportX ), - 150.0 ) ), float( 150.0 ) );
    const d2 = SDFCircle( viewportPosition.sub( vec2( offsetFromViewportX, - 150.0 ) ), float( 150.0 ) );
    const d3 = SDFCircle( viewportPosition.sub( vec2( 0, 200.0 ) ), float( 150.0 ) );

    const d = opUnionFn( opUnionFn( d1, d2 ), d3 ).toVar( 'd' );

    If( currentOpUniform.equal( 0 ), () => {

      d.assign( opUnionFn( boxD, d ) );

    } ).ElseIf( currentOpUniform.equal( 1 ), () => {

      d.assign( opIntersectionFn( boxD, d ) );

    } ).Else( () => {

      d.assign( opSubtraction( boxD, d ) );

    } );


    color.assign( drawBackgroundColor() );
    color.assign( DrawGrid( center.mul( viewportSize ), color, vec3( 0.5 ), cellWidth, lineWidth ) );
    color.assign( DrawGrid( center.mul( viewportSize ), color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
    color.assign( mix( red, color, smoothstep( negate( antialiasRange ), antialiasRange, d ) ) );


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
  gui.add( effectController, 'currentOp', [ 'UNION', 'INTERSECTION', 'SUBTRACTION' ] ).onChange( () => {

    effectController.currentOpUniform.value = BooleanEnum[ effectController.currentOp ];

  } );
  gui.add( effectController.antialiasRange, 'value', 0.1, 5.0 ).step( 0.1 ).name( 'antialiasRange' );


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
