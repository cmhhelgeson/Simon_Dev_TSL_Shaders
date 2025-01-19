
import * as THREE from 'three';
import {
  uniform,
  Fn,
  mix,
  sin,
  step,
  select,
  smoothstep,
  abs,
  uv,
  vec3,
  time,
  ShaderNodeObject
} from 'three/tsl';
import { Node } from 'three/webgpu';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

type ShaderType = 'Step' | 'Smoothstep' | 'Mix' | 'Lines';

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();
  const textureLoader = new THREE.TextureLoader();
  const map = textureLoader.load( './resources/uv_grid_opengl.jpg' );

  const effectController = {
    currentShader: 'Lines',
    // Step uniforms
    stepEdgeX: uniform( 0.5 ),
    stepEdgeY: uniform( 0.5 ),
    // Smoothstep uniforms
    smoothstepRangeStart: uniform( 0.012 ),
    smoothstepRangeEnd: uniform( 0.001 ),
  };

  const red = vec3( 1.0, 0.0, 0.0 );
  const blue = vec3( 0.0, 0.0, 1.0 );
  const white = vec3( 1.0, 1.0, 1.0 );

  const shaders: Record<ShaderType, ShaderNodeObject<Node>> = {

    'Step': Fn( () => {

      const { stepEdgeX, stepEdgeY } = effectController;

      const vUv = uv();

      const color = vec3( step( stepEdgeX, sin( vUv.x ) ).mul( step( stepEdgeY, vUv.y ) ) );

      return color;


    } )(),

    'Mix': Fn( () => {

      return mix( vec3( 1.0, 0.0, 0.0 ), vec3( 0.0, 0.0, 1.0 ), sin( time ) );


    } )(),

    'Smoothstep': Fn( () => {

      const { smoothstepRangeStart, smoothstepRangeEnd } = effectController;

      return smoothstep( smoothstepRangeStart, smoothstepRangeEnd, abs( uv().y.sub( 0.5 ) ) );


    } )(),

    'Lines': Fn( () => {

      const vUv = uv();
      // Create line exactly as we did in last shader
      const line = smoothstep( 0.0, 0.005, abs( vUv.y.sub( 0.5 ) ) );
      const value1 = vUv.x;
      const value2 = smoothstep( 0.0, 1.0, vUv.x );
      const linearLine = smoothstep( 0.0, 0.005, abs( vUv.y.sub( mix( 0.5, 1.0, value1 ) ) ) );
      const smoothstepLine = smoothstep( 0.0, 0.005, abs( vUv.y.sub( mix( 0.0, 0.5, value2 ) ) ) );

      const color = select( vUv.y.greaterThan( 0.5 ), mix( red, blue, vUv.x ), mix( blue, red, vUv.x ) ).toVar( 'color' );
      color.assign( mix( white, color, line ) );
      color.assign( mix( white, color, linearLine ) );
      color.assign( mix( white, color, smoothstepLine ) );

      return color;


    } )(),


  };

  material.colorNode = shaders[ effectController.currentShader ];

  const quad = new THREE.Mesh( geometry, material );
  scene.add( quad );

  renderer = new THREE.WebGPURenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize );

  gui = new GUI();
  gui.add( effectController, 'currentShader', Object.keys( shaders ) ).onChange( () => {

    material.colorNode = shaders[ effectController.currentShader ];
    material.needsUpdate = true;

  } );
  const stepFolder = gui.addFolder( 'Step Shader' );
  stepFolder.add( effectController.stepEdgeX, 'value', 0, 1.0 ).name( 'stepEdgeX' );
  stepFolder.add( effectController.stepEdgeY, 'value', 0, 1.0 ).name( 'stepEdgeY' );
  const smoothstepFolder = gui.addFolder( 'Smoothstep Shader' );
  smoothstepFolder.add( effectController.smoothstepRangeStart, 'value', 0.001, 0.5, 0.001 ).name( 'Range Start' );
  smoothstepFolder.add( effectController.smoothstepRangeEnd, 'value', 0.001, 0.5, 0.001 ).name( 'Range End' );

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
