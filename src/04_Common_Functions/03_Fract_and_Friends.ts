import * as THREE from 'three';
import { fract, Fn, vec2, float, floor, uniform, min, max, smoothstep, abs, uv, vec3 } from 'three/tsl';
import { Node, ShaderNodeObject } from 'three/tsl';

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

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();

  const effectController = {
    gridDimensions: uniform( 10 ),
    lineWidth: uniform( 1.0 ),
  };

  material.colorNode = Fn( () => {

    const { gridDimensions, lineWidth } = effectController;

    // Create baseline color
    const color = vec3( 0.75 ).toVar( 'color' );
    const scaledCell = uv().mul( gridDimensions );
    const cell = fract( scaledCell );

    cell.assign( vec2(
      abs( cell.x.sub( 0.5 ) ),
      abs( cell.y.sub( 0.5 ) )
    ) );

    const scaledDist = ( lineWidth.add( 1.0 ) ).mul( max( cell.x, cell.y ) ).oneMinus();
    const ceilLine = smoothstep( 0.0, 0.05, scaledDist );
    color.assign( vec3( ceilLine ) );

    return vec3( ceilLine );

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
  gui.add( effectController.gridDimensions, 'value', 1, 100 ).step( 1 ).name( 'Grid Dimensions' );
  gui.add( effectController.lineWidth, 'value', 1.0, 8.0 ).name( 'Line Width' );

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
