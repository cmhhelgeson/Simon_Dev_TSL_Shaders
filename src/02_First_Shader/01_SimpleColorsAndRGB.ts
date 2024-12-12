import * as THREE from 'three';
import { vec3, Fn, uniform } from 'three/tsl';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

const init = () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );
  const material = new THREE.MeshBasicNodeMaterial();

  const effectController = {
    red: uniform( 1.0 ),
    green: uniform( 1.0 ),
    blue: uniform( 1.0 )
  };

  material.colorNode = Fn( () => {

    const { red, green, blue } = effectController;

    return vec3( red, green, blue );

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
  gui.add( effectController.red, 'value', 0.0, 1.0 ).name( 'red' );
  gui.add( effectController.green, 'value', 0.0, 1.0 ).name( 'green' );
  gui.add( effectController.blue, 'value', 0.0, 1.0 ).name( 'blue' );

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
