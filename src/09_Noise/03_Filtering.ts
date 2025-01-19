import * as THREE from 'three';
import { uniform, Fn, texture, uv, vec3, textureSize, floor, vec2, mix, fract } from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();
  const textureLoader = new THREE.TextureLoader();
  const gridMap = textureLoader.load( './resources/texture.png' );

  gridMap.minFilter = THREE.NearestFilter;
  gridMap.magFilter = THREE.NearestFilter;

  // TexSize is already known since we are working with a 2x2 texture
  // Alternatively, it can be derived from the textureSize function

  const size = textureSize( texture( gridMap, uv() ) );


  material.colorNode = Fn( () => {

    // Scale the uvs by the texture size, and shift origin left
    const pc = uv().mul( size ).sub( 0.5 );

    // The 2D coordinate of the pixel in the texture
    const textureBaseCoord = floor( pc );

    const base = textureBaseCoord.add( 0.5 );

    const sample1 = texture(
      gridMap,
      ( base.add( vec2( 0.0, 0.0 ) ) ).div( size )
    );
    const sample2 = texture(
      gridMap,
      ( base.add( vec2( 1.0, 0.0 ) ) ).div( size )
    );
    const sample3 = texture(
      gridMap,
      ( base.add( vec2( 0.0, 1.0 ) ) ).div( size )
    );
    const sample4 = texture(
      gridMap,
      ( base.add( vec2( 1.0, 1.0 ) ) ).div( size )
    );

    const px1 = mix( sample1, sample2, fract( pc ).x );
    const px2 = mix( sample3, sample4, fract( pc ).x );

    return mix( px1, px2, fract( pc ).y );

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
