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
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

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

  const sdfCircleFn = Fn( ( [ position, radius ] ) => {

    return length( position ).sub( radius );

  } ).setLayout( {
    name: 'sdfCircleFn',
    type: 'float',
    inputs: [
      { name: 'position', type: 'vec2' },
      { name: 'radius', type: 'float' }
    ]
  } );

  const sdfBoxFn = Fn( ( [ pos, bound ] ) => {

    const d = abs( pos ).sub( bound );
    return length( max( d, 0.0 ) ).add( min( max( d.x, d.y ), 0.0 ) );

  } ).setLayout( {
    name: 'sdfBoxFn',
    type: 'float',
    inputs: [
      { name: 'pos', type: 'vec2' },
      { name: 'bound', type: 'vec2' }
    ]
  } );

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

    const boxD = sdfBoxFn( rotate( viewportPosition, time ), vec2( 200.0, 100.0 ) );
    const d1 = sdfCircleFn( viewportPosition.sub( vec2( negate( offsetFromViewportX ), - 150.0 ) ), float( 150.0 ) );
    const d2 = sdfCircleFn( viewportPosition.sub( vec2( offsetFromViewportX, - 150.0 ) ), float( 150.0 ) );
    const d3 = sdfCircleFn( viewportPosition.sub( vec2( 0, 200.0 ) ), float( 150.0 ) );

    const d = opUnionFn( opUnionFn( d1, d2 ), d3 ).toVar( 'd' );

    If( currentOpUniform.equal( 0 ), () => {

      d.assign( opUnionFn( boxD, d ) );

    } ).ElseIf( currentOpUniform.equal( 1 ), () => {

      d.assign( opIntersectionFn( boxD, d ) );

    } ).Else( () => {

      d.assign( opSubtraction( boxD, d ) );

    } );


    color.assign( drawBackgroundColor() );
    color.assign( drawGrid( color, vec3( 0.5 ), cellWidth, lineWidth ) );
    color.assign( drawGrid( color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
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
