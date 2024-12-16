import * as THREE from 'three';
import {
  Fn,
  fract,
  floor,
  vec2,
  vec3,
  dot,
  remap,
  texture,
  mix,
  uniform,
  uv,
  sin,
  select,
  clamp,
  float,
  viewportSize,
  timerLocal,
  modelNormalMatrix,
  normalGeometry,
  normalize,
  color,
} from 'three/tsl';
import { Node, ShaderNodeObject } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

type ShaderType = 'Basic Ambient' | 'Basic Normal' | 'Basic Hemi' | 'HemisphereLight';

const init = async () => {

  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );
  camera.position.z = 4;

  scene = new THREE.Scene();

  // Cubemap texture
  const path = './resources/Cold_Sunset/';
  const urls = [
    path + 'Cold_Sunset__Cam_2_Left+X.png',
    path + 'Cold_Sunset__Cam_3_Right-X.png',
    path + 'Cold_Sunset__Cam_4_Up+Y.png',
    path + 'Cold_Sunset__Cam_5_Down-Y.png',
    path + 'Cold_Sunset__Cam_0_Front+Z.png',
    path + 'Cold_Sunset__Cam_1_Back-Z.png',
  ];

  const effectController = {
    'Current Shader': 'Basic Ambient',
    // Hemi Lighting Shader
    skyColor: uniform( color( 0.0, 0.3, 0.6 ) ),
    groundColor: uniform( color( 0.6, 0.3, 0.1 ) )

  };

  const cubemap = new THREE.CubeTextureLoader().load( urls );
  scene.background = cubemap;

  const loader = new GLTFLoader();
  const suzanneMaterial = new THREE.MeshStandardNodeMaterial();

  const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 2 );
  hemiLight.color.setHSL( 0.6, 1, 0.6 );
  hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
  hemiLight.position.set( 0, 20, 0 );
  scene.add( hemiLight );

  const shaders: Record<ShaderType, ShaderNodeObject<Node>> = {


    // Basic Ambient lighting
    'Basic Ambient': Fn( () => {

      const baseColor = vec3( 0.5 );
    	// Ambient Lighting
    	const ambient = vec3( 0.5 );
    	return baseColor.mul( ambient );


    } )(),

    // Return mesh normals
    'Basic Normal': Fn( () => {

      // Equivalent of normalize(vNormal);
      return normalize( normalGeometry );


    } )(),

    // Crudely emulate THREE.HemisphereLight.
    'Basic Hemi': Fn( () => {

      const { skyColor, groundColor } = effectController;

      const baseColor = vec3( 1.0 );
      const ambient = vec3( 0.5 );
      const lighting = vec3( 0.0 ).toVar( 'lighting' );

      const hemiMix = remap( normalGeometry.y, - 1.0, 1.0, 0.0, 1.0 );
      const hemi = mix( groundColor, skyColor, hemiMix );

      lighting.assign( ambient.mul( 0.0 ).add( hemi ) );

      return baseColor.mul( lighting );

    } )(),

    // Actual Three.HemisphereLight implementation
    'HemisphereLight': Fn( () => {} ),

  };

  const defaultFragmentNode = suzanneMaterial.fragmentNode;
  suzanneMaterial.fragmentNode = shaders[ 'Basic Ambient' ];


  loader.load( './resources/suzanne.glb', function ( gltf ) {

    gltf.scene.traverse( c => {

      c.material = suzanneMaterial;

    } );

    scene.add( gltf.scene );

  } );

  renderer = new THREE.WebGPURenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild( renderer.domElement );

  const controls = new OrbitControls( camera, renderer.domElement );
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 1.5;

  window.addEventListener( 'resize', onWindowResize );

  gui = new GUI();
  gui.add( effectController, 'Current Shader', Object.keys( shaders ) ).onChange( () => {

    if ( effectController[ 'Current Shader' ] === 'HemisphereLight' ) {

      suzanneMaterial.fragmentNode = defaultFragmentNode;
      suzanneMaterial.needsUpdate = true;
      return;

    }

    suzanneMaterial.fragmentNode = shaders[ effectController[ 'Current Shader' ] ];
    suzanneMaterial.needsUpdate = true;

  } );


  gui.addColor( { color: effectController.skyColor.value.getHex( THREE.SRGBColorSpace ) }, 'color' )
    .name( 'skyColor' )
    .onChange( function ( value ) {

      effectController.skyColor.value.set( value );
      hemiLight.color.setHex( value );

    } );

  gui.addColor( { color: effectController.groundColor.value.getHex( THREE.SRGBColorSpace ) }, 'color' )
    .name( 'groundColor' )
    .onChange( function ( value ) {

      effectController.groundColor.value.set( value );
      hemiLight.groundColor.setHex( value );

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
