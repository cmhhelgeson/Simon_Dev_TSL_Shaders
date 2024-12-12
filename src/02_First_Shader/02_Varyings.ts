import * as THREE from 'three';
import { vec3, Fn, uv, ShaderNodeObject, Node } from 'three/tsl';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

type EffectType = 'Show UV X' | 'Show UV Y' | 'Show UV' | 'Homework'

const init = () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );
  const material = new THREE.MeshBasicNodeMaterial();

  const effectNames: EffectType[] = [
    'Homework',
    'Show UV',
    'Show UV X',
    'Show UV Y',
  ];

  // three/src/nodes/accessors/UV.js
  // export const uv = ( index ) => attribute( 'uv' + ( index > 0 ? index : '' ), 'vec2' );

  const effects: Record<EffectType, ShaderNodeObject<Node>> = {
    'Show UV X': Fn( () => {

      const vUV = uv();

      return vec3( vUV.x );

    } )(),

    'Show UV Y': Fn( () => {

      const vUV = uv();

      return vec3( vUV.y );

    } )(),

    'Show UV': Fn( () => {

      return vec3( uv(), 0.0 );

    } )(),

    'Homework': Fn( () => {

      const vUv = uv();

      return vec3( vUv.y, 0.0, vUv.x );


    } )(),

  };

  const effectController = {
    effect: 'Show UV X'
  };

  material.colorNode = effects[ 'Homework' ];

  const quad = new THREE.Mesh( geometry, material );
  scene.add( quad );

  renderer = new THREE.WebGPURenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize );

  gui = new GUI();
  gui.add( effectController, 'effect', effectNames ).onChange( () => {

    material.colorNode = effects[ effectController.effect ];
    material.needsUpdate = true;

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
