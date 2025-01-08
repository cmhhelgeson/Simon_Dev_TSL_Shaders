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
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

enum ShapeEnum {
	CIRCLE,
	BOX,
	HEXAGON
}

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();

  const effectController = {
    shape: 'CIRCLE',
    shapeUniform: uniform( 0 ).label( 'shapeUniform' ),
    cellWidth: uniform( 15 ),
    lineWidth: uniform( 1.0 ),
    vignetteColorMin: uniform( 0.3 ),
    vignetteColorMax: uniform( 1.0 ),
    vignetteRadius: uniform( 1.0 ),
    lightFallOff: uniform( 0.3 ),
    circleRadius: uniform( 250 ),
    antialiasRange: uniform( 1.0 ),
    functionMode: uniform( 0 ),
    'Display Function': 'CEIL',
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

  const sdfCircle = ( positionNode, radiusNode ) => {

    return length( positionNode ).sub( radiusNode );

  };

  const sdfHexagon = ( pNode, rNode ) => {

    const k = vec3( - 0.866025404, 0.5, 0.577350269 );
    pNode.assign( abs( pNode ) );
    const minCalc = min( dot( k.xy, pNode ), 0.0 );
    pNode.subAssign( minCalc.mul( k.xy ).mul( 2.0 ) );
    pNode.subAssign( vec2( clamp( pNode.x, negate( k.z ).mul( rNode ), k.z.mul( rNode ) ), rNode ) );
    return length( pNode ).mul( sign( pNode.y ) );

  };

  const sdfBox = ( posNode, boundNode ) => {

    const d = abs( posNode ).sub( boundNode );
    return length( max( d, 0.0 ) ).add( min( max( d.x, d.y ), 0.0 ) );

  };


  material.colorNode = Fn( () => {

    const {
      cellWidth,
      shapeUniform,
      lineWidth,
      circleRadius,
      antialiasRange
    } = effectController;

    const vUv = uv();

    // Create baseline color
    const color = vec3( 0.9 ).toVar( 'color' );
    const center = vUv.sub( 0.5 );
    // Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
    const viewportPosition = center.mul( viewportSize );

    const sdfDistance = float( 0.0 ).toVar( 'sdfDistance' );

    If( shapeUniform.equal( ShapeEnum.CIRCLE ), () => {

      sdfDistance.assign( sdfCircle( viewportPosition, circleRadius ) );

    } ).ElseIf( shapeUniform.equal( ShapeEnum.BOX ), () => {

      sdfDistance.assign( sdfBox( viewportPosition, vec2( circleRadius, 50.0 ) ) );

    } ).ElseIf( shapeUniform.equal( ShapeEnum.HEXAGON ), () => {

      sdfDistance.assign( sdfHexagon( viewportPosition, circleRadius ) );

    } );

    color.assign( drawBackgroundColor() );
    color.assign( drawGrid( color, vec3( 0.5 ), cellWidth, lineWidth ) );
    color.assign( drawGrid( color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
    color.assign( mix( red, color, smoothstep( negate( antialiasRange ), antialiasRange, sdfDistance ) ) );


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
  gui.add( effectController, 'shape', [ 'CIRCLE', 'BOX', 'HEXAGON' ] ).onChange( () => {

    const value = ShapeEnum[ effectController.shape ];
    console.log( value );

    effectController.shapeUniform.value = ShapeEnum[ effectController.shape ];
    material.needsUpdate = true;

  } );
  gui.add( effectController.circleRadius, 'value', 1.0, 500.0 ).step( 1.0 ).name( 'sdfSize' );
  gui.add( effectController.antialiasRange, 'value', 0.1, 5.0 ).step( 10.0 ).name( 'antialiasRange' );
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
