import * as THREE from 'three';
import {
  texture,
  uv,
  Fn,
  remap,
  uniform,
  pass,
  vec3,
  color,
  dot,
  mix,
  saturate
} from 'three/tsl';
import PostProcessing from './PostProcessing';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

// Post Processing Outputs
let postScene, postColor;

const effectController = {
  remapUVXBegin: uniform( 0.25 ),
  remapUVXEnd: uniform( 0.75 ),
  bleachOpacity: uniform( 0.8 ),
  testVal: uniform( 0.5 ),
  tintColor: color( 1.0, 0.5, 0.5 ),
  saturation: uniform( 1.312 ),
  brightness: uniform( - 0.2 ),
  contrast: uniform( 1.2 ),
  midpoint: uniform( - 0.01 )
};

//1.312
//-0.3
//1.2
//-0.01

//0.82
//-0.4
// 1.7
// 0.02

/*const DrawBackground = () => {

};

const sdfCircle = ( positionNode, radiusNode ) => {

  return length( positionNode ).sub( radiusNode );

};

const sdfCloud = ( positionNode ) => {

  const puff1 = sdfCircle( positionNode, float( 100.0 ) );
  const puff2 = sdfCircle( positionNode.sub( vec2( 120.0, - 10.0 ) ), float( 75.0 ) );
  const puff3 = sdfCircle( positionNode.add( vec2( 120.0, 10.0 ) ), float( 75.0 ) );

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

const hash = ( vNode ) => {

  const t = dot( vNode, vec2( 36.5323, 73.945 ) );
  return sin( t );

};

const inverseLerp = ( currentValue, minValue, maxValue ) => {

  return ( currentValue.sub( minValue ) ).div( maxValue.sub( minValue ) );

};

const easeOut = ( x, p ) => {

  return float( 1.0 ).sub( pow( x.oneMinus(), p ) );

}; */

const postProcessFunction = Fn( ( [ color ] ) => {

  const { midpoint, brightness, saturation, contrast } = effectController;

  const c = vec3( color ).toVar( 'inputColor' );

  //Tinting
  //c.mulAssign( effectController.tintColor );

  //Brightness
  c.addAssign( brightness );

  //Saturation (accounting for relative brightness of each color)
  const luminance = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c.assign( mix( vec3( luminance ), c, saturation ) );

  c.assign( saturate( c.sub( midpoint ) ).mul( contrast ).add( midpoint ) );

  return c;


} );

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();

  const textureLoader = new THREE.TextureLoader();
  const tomatoTexture = textureLoader.load( './resources/tomato.jpg' );

  material.colorNode = Fn( () => {

    const { remapUVXBegin, remapUVXEnd } = effectController;

    const vUv = uv().toVar( 'vUv' );

    vUv.x.assign( remap( uv().x, 0.0, 1.0, remapUVXBegin, remapUVXEnd ) );
    return texture( tomatoTexture, vUv );

  } )();

  const quad = new THREE.Mesh( geometry, material );
  scene.add( quad );

  renderer = new THREE.WebGPURenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild( renderer.domElement );

  postScene = new PostProcessing( renderer );
  postColor = new PostProcessing( renderer );

  const scenePass = pass( scene, camera );
  postScene.outputNode = scenePass;
  postColor.outputNode = postProcessFunction( scenePass );

  window.addEventListener( 'resize', onWindowResize );

  gui = new GUI();
  gui.add( effectController.remapUVXBegin, 'value', 0.01, 0.9 ).name( 'remapXBegin' );
  gui.add( effectController.remapUVXEnd, 'value', 0.01, 0.9 ).name( 'remapXEnd' );
  const postProcessingFolder = gui.addFolder( 'Post Processing' );
  postProcessingFolder.add( effectController.saturation, 'value', 0.0, 2.0 ).name( 'saturation' );
  postProcessingFolder.add( effectController.brightness, 'value', - 1.0, 1.0 ).step( 0.1 ).name( 'brightness' );
  postProcessingFolder.add( effectController.contrast, 'value', 0.0, 2.0 ).step( 0.1 ).name( 'contrast' );
  postProcessingFolder.add( effectController.midpoint, 'value', - 1.0, 1.0 ).step( 0.01 ).name( 'midpoint' );


};

const onWindowResize = () => {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );

};

function animate() {

  // Altering the code a bit to work within a more typical postProcessing context
  const halfWidth = window.innerWidth / 2;

  renderer.setViewport( 0, 0, halfWidth, window.innerHeight );

  postScene.render();

  renderer.autoClear = false;

  renderer.setViewport( halfWidth, 0, halfWidth, window.innerHeight );
  postColor.render();

  renderer.autoClear = true;


}

init();
