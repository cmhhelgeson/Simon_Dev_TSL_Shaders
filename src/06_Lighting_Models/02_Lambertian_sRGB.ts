import * as THREE from 'three';
import {
  Fn,
  vec3,
  remap,
  mix,
  uniform,
  normalGeometry,
  normalize,
  color,
  max,
  dot,
} from 'three/tsl';
import { Node, ShaderNodeObject } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

type ShaderType =
'Basic Ambient' |
'Basic Normal' |
'Basic Direct' |
'Basic Hemi' |
'HemisphereLight' |
'DirectionalLight'

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
    // Material Properties
    objectColor: uniform( color( 1.0, 1.0, 1.0 ) ),
    // Hemi Lighting Shader
    skyColor: uniform( color( 0.0, 0.3, 0.6 ) ),
    groundColor: uniform( color( 0.6, 0.3, 0.1 ) ),
    // Direct Light Position
    lightX: uniform( 0.0 ),
    lightY: uniform( 0.0 ),

  };

  const cubemap = new THREE.CubeTextureLoader().load( urls );
  scene.background = cubemap;

  const loader = new GLTFLoader();
  const suzanneMaterial = new THREE.MeshStandardNodeMaterial();

  const lights: Record<string, THREE.Light> = {
    'HemisphereLight': new THREE.HemisphereLight( 0x0095cb, 0xcb9659, 1 ),
    'DirectionalLight': new THREE.DirectionalLight( 0x0095cb, 10 ),
  };

  lights[ 'HemisphereLight' ].position.set( 0, 20, 0 );
  scene.add( lights[ 'HemisphereLight' ] );
  scene.add( lights[ 'DirectionalLight' ] );

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

    // Direct lighting
    'Basic Direct': Fn( () => {

      const { skyColor, objectColor, lightX, lightY } = effectController;

      const lightDir = normalize( vec3( lightX, lightY, 1.0 ) );
      const dp = max( 0.0, dot( lightDir, normalGeometry ) );

      const diffuse = dp.mul( skyColor );
      return objectColor.mul( diffuse );


    } )(),

    // Crudely emulate THREE.HemisphereLight.
    'Basic Hemi': Fn( () => {

      const { skyColor, groundColor, objectColor } = effectController;

      const ambient = vec3( 0.5 );
      const lighting = vec3( 0.0 ).toVar( 'lighting' );

      const hemiMix = remap( normalGeometry.y, - 1.0, 1.0, 0.0, 1.0 );
      const hemi = mix( groundColor, skyColor, hemiMix );

      lighting.assign( ambient.mul( 0.0 ).add( hemi ) );

      return objectColor.mul( lighting );

    } )(),

    // Actual THREE.HemisphereLight implementation
    'HemisphereLight': Fn( () => {} ),
    // Actual THREE.DirectionalLight implementation
    'DirectionalLight': Fn( () => {} ),

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

  window.addEventListener( 'mousemove', ( e ) => {

    const { lightX, lightY } = effectController;
    // 0 to width -> 0 to 1 -> 0 -> 2 -> -1 to 1
    lightX.value = ( e.offsetX / window.innerWidth ) * 5 - 2.5;
    lightY.value = ( e.offsetY / window.innerHeight ) * 5 - 2.5;
    lights[ 'DirectionalLight' ].position.x = lightX.value;
    lights[ 'DirectionalLight' ].position.y = lightY.value;

  } );

  window.addEventListener( 'resize', onWindowResize );

  gui = new GUI();
  gui.add( effectController, 'Current Shader', Object.keys( shaders ) ).onChange( () => {

    const currentShader = effectController[ 'Current Shader' ];

    if ( currentShader === 'HemisphereLight' || currentShader === 'DirectionalLight' ) {

      suzanneMaterial.fragmentNode = defaultFragmentNode;
      suzanneMaterial.needsUpdate = true;
      for ( const lightName of Object.keys( lights ) ) {

        lights[ lightName ].visible = ( lightName === currentShader );

      }

      return;

    }

    suzanneMaterial.fragmentNode = shaders[ effectController[ 'Current Shader' ] ];
    suzanneMaterial.needsUpdate = true;

  } );

  gui.addColor( { color: effectController.objectColor.value.getHex( THREE.SRGBColorSpace ) }, 'color' )
    .name( 'objectColor' )
    .onChange( function ( value ) {

      effectController.objectColor.value.set( value );
      suzanneMaterial.colorNode = Fn( () => {

        return effectController.objectColor;

      } )();
      suzanneMaterial.needsUpdate = true;

    } );


  gui.addColor( { color: effectController.skyColor.value.getHex( THREE.SRGBColorSpace ) }, 'color' )
    .name( 'skyColor' )
    .onChange( function ( value ) {

      effectController.skyColor.value.set( value );
      lights[ 'HemisphereLight' ].color.setHex( value );
      lights[ 'DirectionalLight' ].color.setHex( value );

    } );

  gui.addColor( { color: effectController.groundColor.value.getHex( THREE.SRGBColorSpace ) }, 'color' )
    .name( 'groundColor' )
    .onChange( function ( value ) {

      effectController.groundColor.value.set( value );
      lights[ 'HemisphereLight' ].groundColor.setHex( value );

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
