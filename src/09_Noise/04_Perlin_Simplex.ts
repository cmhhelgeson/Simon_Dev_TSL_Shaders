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
  vec2,
  If,
  rotate,
  uint,
  time,
  dot,
  clamp,
  int,
  Loop,
  sin,
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
    functionDetail: uniform( 1.0 ),
    baseAmplitude: uniform( 128.0 ),
    baseFrequencyController: 64.0,
    baseFrequency: uniform( 1.0 / 64.0 ),
    amplitudePersistence: uniform( 0.5 ),
    frequencyLacunity: uniform( 2.0 ),
    detailIterations: uniform( uint( 2 ) ),
  };
  const red = vec3( 1.0, 0.0, 0.0 );
  const black = vec3( 0.0, 0.0, 0.0 );

  const sdfLine = ( pNode, aNode, bNode ) => {

    const pa = pNode.sub( aNode );
    const ba = bNode.sub( aNode );
    const h = clamp( dot( pa, ba ).div( dot( ba, ba ) ), 0.0, 1.0 );

    return length( pa.sub( ba.mul( h ) ) );

  };

  const evaluateSinFunction = ( x ) => {

    const {
      baseAmplitude,
      baseFrequency,
      amplitudePersistence,
      frequencyLacunity,
      detailIterations
    } = effectController;

    const y = float( 0.0 ).toVar( 'ySin' );

    const currentAmplitude = float( 0.0 ).toVar( 'currentAmplitude' );
    currentAmplitude.assign( baseAmplitude );

    const currentFrequency = float( 0.0 ).toVar( 'currentFrequency' );
    currentFrequency.assign( baseFrequency );

    Loop( { start: uint( 0 ), end: detailIterations, type: 'uint', condition: '<' }, ( { i } ) => {

    	y.addAssign(
        sin( baseFrequency.mul( x ) ).mul( currentAmplitude )
      );
      currentAmplitude.mulAssign( amplitudePersistence );
      currentFrequency.mulAssign( frequencyLacunity );

    } );

    return y;

  };

  // Draw the function at varying levels of detail by drawing multiple
  // sublines of the function.
  const plotSinFunction = ( p, px, curTime ) => {

    const result = float( 10000000.0 ).toVar( 'result' );

    Loop( { start: int( - 5 ), end: int( 5 ), type: 'int', condition: '<' }, ( { i } ) => {

      const c1 = p.add( vec2( px.mul( float( i ) ), 0.0 ) ).toVar( 'c1' );
      const c2 = p.add( vec2( px.mul( float( i ).add( 1.0 ) ), 0.0 ) ).toVar( 'c2' );

      const a = vec2( c1.x, evaluateSinFunction( c1.x ) );
      const b = vec2( c2.x, evaluateSinFunction( c2.x ) );
      result.assign( min( result, sdfLine( p, a, b ) ) );

    } );

    return result;

  };


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

  material.colorNode = Fn( () => {

    const {
      cellWidth,
      lineWidth,
    } = effectController;

    const vUv = uv();

    // Create baseline color
    const color = vec3( 0.9 ).toVar( 'color' );
    const center = vUv.sub( 0.5 );
    // Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
    const viewportPosition = center.mul( viewportSize );


    color.assign( drawBackgroundColor() );
    const distToFunction = plotSinFunction( viewportPosition, float( 2.0 ), time );
    color.assign( drawGrid( color, vec3( 0.5 ), cellWidth, lineWidth ) );
    color.assign( drawGrid( color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
    const lineBorder = smoothstep( 4.0, 6.0, distToFunction );
    color.assign( mix( red, color, lineBorder ) );


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
  const shapeFolder = gui.addFolder( 'Line Shape' );
  gui.add( effectController.antialiasRange, 'value', 0.1, 5.0 ).step( 0.1 ).name( 'antialiasRange' );
  shapeFolder.add( effectController.baseAmplitude, 'value', 10, 256 ).step( 1 ).name( 'Base Amplitude' );
  shapeFolder.add( effectController, 'baseFrequencyController', 0.0, 200.0 ).step( 0.1 ).name( 'Base Frequency' ).onChange( () => {

    effectController.baseFrequency.value = 1.0 / effectController.baseFrequencyController;

  } );
  const detailFolder = gui.addFolder( 'Line Detail' );
  detailFolder.add( effectController.detailIterations, 'value', 1, 10 ).step( 1 ).name( 'Detail Iterations' );


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
