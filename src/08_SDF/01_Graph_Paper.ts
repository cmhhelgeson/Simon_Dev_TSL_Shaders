import * as THREE from 'three';
import { uniform, Fn, texture, uv } from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

const textureWrappings = {
  'Repeat': THREE.RepeatWrapping,
  'Mirrored Repeat': THREE.MirroredRepeatWrapping,
  'ClampToEdge': THREE.ClampToEdgeWrapping,
};

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();
  const textureLoader = new THREE.TextureLoader();
  const gridMap = textureLoader.load( './resources/uv_grid_opengl.jpg' );

  gridMap.wrapS = THREE.RepeatWrapping;
  gridMap.wrapT = THREE.RepeatWrapping;
  gridMap.minFilter = THREE.NearestFilter;
  gridMap.magFilter = THREE.NearestFilter;
  const effectController = {
    tint: uniform( new THREE.Color( 1.0, 1.0, 1.0 ) ),
    zoom: uniform( 1 ),
    wrappingMode: 'Repeat Wrapping'

  };

  material.colorNode = Fn( () => {

    const { tint, zoom } = effectController;
    const gridColor = texture( gridMap, uv().div( zoom ) ).mul( tint );
    return gridColor;

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
  gui.addColor( { color: effectController.tint.value.getHex( THREE.SRGBColorSpace ) }, 'color' ).onChange( ( value ) => {

    effectController.tint.value.set( value );

  } ).name( 'tint' );
  gui.add( effectController.zoom, 'value', 1, 10 ).step( 1 ).name( 'zoom' );
  gui.add( effectController, 'wrappingMode', Object.keys( textureWrappings ) ).onChange( () => {

    const wrappingMode = textureWrappings[ effectController.wrappingMode ];

    gridMap.wrapS = gridMap.wrapT = wrappingMode;
    gridMap.needsUpdate = true;

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
