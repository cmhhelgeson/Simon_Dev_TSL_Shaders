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
  timerLocal,
  uint,
  pow,
  mix,
  sin,
  mod,
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
    skyGradient: uniform( 0.5 ),
    shadowIntensity: uniform( 0.5 ),
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

  const DrawBackground = () => {

    const { skyGradient } = effectController;

    return mix(
      vec3( 0.42, 0.58, 0.75 ),
      vec3( 0.36, 0.46, 0.82 ),
      smoothstep( 0.0, 1.0, pow( uv().x.mul( uv().y ), skyGradient ) )
    );

  };

  const sdfCircle = ( positionNode, radiusNode ) => {

    return length( positionNode ).sub( radiusNode );

  };

  const sdfCloud = ( positionNode, scaleNode ) => {

    const puff1 = sdfCircle( positionNode.mul( scaleNode ), float( 100.0 ) );
    const puff2 = sdfCircle( positionNode.mul( scaleNode ).sub( vec2( 120.0, - 10.0 ) ), float( 75.0 ) );
    const puff3 = sdfCircle( positionNode.mul( scaleNode ).add( vec2( 120.0, 10.0 ) ), float( 75.0 ) );

    const d = opUnion( puff1, opUnion( puff2, puff3 ) );

    return d;

  };

  const sdfBox = ( posNode, boundNode ) => {

    const d = abs( posNode ).sub( boundNode );
    return length( max( d, 0.0 ) ).add( min( max( d.x, d.y ), 0.0 ) );

  };

  const opUnion = ( d1Node, d2Node ) => {

    return min( d1Node, d2Node );

  };

  const opIntersection = ( d1Node, d2Node ) => {

    return max( d1Node, d2Node );

  };

  const opSubtraction = ( d1Node, d2Node ) => {

    return max( negate( d1Node ), d2Node );

  };

  material.colorNode = Fn( () => {

    const vUv = uv();

    const { shadowIntensity } = effectController;

    // Create baseline color and uvs
    const color = vec3( 0.0 ).toVar( 'color' );
    const center = vUv.sub( 0.5 );
    const viewportPosition = center.mul( viewportSize );

    color.assign( DrawBackground() );

    const moveBy = timerLocal().mul( 50 );

    const cloud = sdfCloud( viewportPosition, smoothstep( - 1.0, 1.0, sin( timerLocal() ) ).add( 1 ) );
    const cloudShadow = sdfCircle( viewportPosition.add( vec2( 50.0 ) ).add( moveBy ), 120.0 );

    color.assign( mix( color, vec3( 0.0 ), remap( smoothstep( - 100.0, 0.0, cloudShadow ), 0.0, 1.0, 1.0, 0.0 ).mul( shadowIntensity ) ) );
    color.assign(
      mix( vec3( 1.0 ), color, smoothstep( 0.0, 1.0, cloud ) )
    );

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
  gui.add( effectController.skyGradient, 'value', 0.01, 1.0 ).name( 'gradientControl' );
  gui.add( effectController.shadowIntensity, 'value', 0.1, 5.0 ).step( 0.01 ).name( 'shadowIntensity' );

  window.addEventListener;


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
