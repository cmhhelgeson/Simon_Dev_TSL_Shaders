import * as THREE from 'three';
import { uniform, Fn, texture, uv, vec3, textureSize, floor, vec2, mix, fract, If, uint, smoothstep } from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

const externalFilterModes = {
  'NearestFilter': THREE.NearestFilter,
  'LinearFilter': THREE.LinearFilter
};

const internalFilterModes = {
  'None': 0,
  'Linear Interpolation': 1,
  'Smoothstep Interpolation': 2,
};

const effectController = {
  externalFilterMode: 'NearestFilter',
  internalFilterMode: 'None',
  internalFilterUniform: uniform( uint( 0 ) ),
};

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();
  const textureLoader = new THREE.TextureLoader();
  let gridMap = textureLoader.load( './resources/texture.png' );

  gridMap.minFilter = THREE.LinearFilter;
  gridMap.magFilter = THREE.NearestFilter;

  // TexSize is already known since we are working with a 2x2 texture
  // Alternatively, it can be derived from the textureSize function
  const size = textureSize( texture( gridMap ) );

  const colorShader = Fn( () => {

    const { internalFilterUniform } = effectController;

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

    const newColor = vec3( 0.0 ).toVar( 'newColor' );

    If( internalFilterUniform.equal( uint( 0 ) ), () => {

      newColor.assign( texture( gridMap, uv() ) );

    } ).ElseIf( internalFilterUniform.equal( uint( 1 ) ), () => {

      const f = fract( pc );

      const px1 = mix( sample1, sample2, f.x );
      const px2 = mix( sample3, sample4, f.x );
      newColor.assign( mix( px1, px2, f.y ) );

    } ).Else( () => {

      const f = smoothstep( 0.0, 1.0, fract( pc ) );

      const px1 = mix( sample1, sample2, f.x );
      const px2 = mix( sample3, sample4, f.x );
      newColor.assign( mix( px1, px2, f.y ) );

    } );

    return newColor;

  } );

  material.colorNode = colorShader();

  const quad = new THREE.Mesh( geometry, material );
  scene.add( quad );

  renderer = new THREE.WebGPURenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize );

  gui = new GUI();
  gui.add( effectController, 'externalFilterMode', Object.keys( externalFilterModes ) ).onChange( () => {

    // Destroy current shader to prevent destroyed texture from being accessed in a submit
    material.colorNode = null;
    material.needsUpdate = true;
    // Dipsose of current grid map to change filter mode
    gridMap.dispose();
    gridMap = textureLoader.load( './resources/texture.png' );
    gridMap.minFilter = gridMap.magFilter = externalFilterModes[ effectController[ 'externalFilterMode' ] ];
    // Reinitialize shader
    material.colorNode = colorShader();

  } );

  gui.add( effectController, 'internalFilterMode', Object.keys( internalFilterModes ) ).onChange( () => {

    effectController.internalFilterUniform.value = internalFilterModes[ effectController.internalFilterMode ];


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
