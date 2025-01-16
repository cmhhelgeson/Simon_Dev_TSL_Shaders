import * as THREE from 'three';
import {
  Fn,
  vec3,
  remap,
  sin,
  time,
  positionLocal,
  rotate,
  varyingProperty,
  mix,
  If,
  abs,
  smoothstep,
  uv,
  pow,
  uniform
} from 'three/tsl';
import { Node, ShaderNodeObject } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

type ShaderType = 'Varying Color' | 'Red Blue Mix' | 'Varying vs Native';

interface EffectControllerType {
  'Current Shader': ShaderType,
  tChanger: UniformNode,
}

const red = vec3( 1.0, 0.0, 0.0 );
const blue = vec3( 0.0, 0.0, 1.0 );
const white = vec3( 1.0, 1.0, 1.0 );
const yellow = vec3( 1.0, 1.0, 0.0 );

const init = async () => {

  camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );
  camera.position.z = 4;

  scene = new THREE.Scene();

  const effectController: EffectControllerType = {
    'Current Shader': 'Varying Color',
    tChanger: uniform( 2.0 ),
  };

  const varyingColor = varyingProperty( 'vec3', 'vColor' );

  const vertexShaders: Record<ShaderType, ShaderNodeObject<Node>> = {
    'Varying Color': Fn( () => {

      varyingColor.assign( vec3( 1.0, 0.0, 0.0 ) );

      return positionLocal;

    } )(),

    'Red Blue Mix': Fn( () => {

      const t = remap( positionLocal.x, - 0.5, 0.5, 0.0, 1.0 );

      const color = mix( red, blue, t );

      varyingColor.assign( color );

      return positionLocal;

    } )(),

    'Varying vs Native': Fn( () => {

      const { tChanger } = effectController;

      const t = remap( positionLocal.x, - 0.5, 0.5, 0.0, 1.0 ).toVar( 't' );
      t.assign( pow( t, tChanger ) );

      const color = mix( red, blue, t );

      varyingColor.assign( color );

      return positionLocal;


    } )(),

  };

  const fragmentShaders: Record<ShaderType, ShaderNodeObject<Node>> = {

    'Varying Color': Fn( () => {

      return varyingColor;

    } )(),

    'Red Blue Mix': Fn( () => {

      return varyingColor;

    } )(),

    'Varying vs Native': Fn( () => {

      const { tChanger } = effectController;

      const color = vec3( 0.0 ).toVar( 'color' );
      color.assign( varyingColor );

      If( positionLocal.y.lessThan( 0.0 ), () => {

        const t = remap( positionLocal.x, - 0.5, 0.5, 0.0, 1.0 ).toVar( 't' );
        t.assign( pow( t, tChanger ) );

        color.assign( mix( red, blue, t ) );

      } );

      const value1 = uv().x;
      const middleLine = smoothstep( 0.004, 0.005, abs( positionLocal.y ) );
      color.assign( mix( vec3( 0.0 ), color, middleLine ) );
      const topLine = smoothstep( 0.0, 0.005, abs( uv().y.sub( mix( 0.5, 1.0, value1 ) ) ) );
      const bottomLine = smoothstep( 0.0, 0.005, abs( uv().y.sub( mix( 0.0, 0.5, value1 ) ) ) );

      color.assign( mix( yellow, color, topLine ) );
      color.assign( mix( yellow, color, bottomLine ) );


      return color;


    } )(),


  };

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

  const cubemap = new THREE.CubeTextureLoader().load( urls );
  scene.background = cubemap;

  const suzanneMaterial = new THREE.MeshStandardNodeMaterial();
  suzanneMaterial.positionNode = vertexShaders[ 'Varying Color' ];
  suzanneMaterial.colorNode = fragmentShaders[ 'Varying Color' ];

  const boxGeometry = new THREE.BoxGeometry( 2, 2, 2 );
  const boxMesh = new THREE.Mesh( boxGeometry, suzanneMaterial );
  scene.add( boxMesh );

  const light = new THREE.DirectionalLight( 0xffffff, 2 );
  const light2 = new THREE.DirectionalLight( 0xffffff, 1 );
  light.position.x = 2;
  light.position.z = 3;
  light2.position.x = - 2;
  light2.position.z = - 3;
  scene.add( light );
  scene.add( light2 );

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
  gui.add( effectController, 'Current Shader', Object.keys( vertexShaders ) ).onChange( () => {

    suzanneMaterial.positionNode = vertexShaders[ effectController[ 'Current Shader' ] ];
    suzanneMaterial.colorNode = fragmentShaders[ effectController[ 'Current Shader' ] ];
    suzanneMaterial.needsUpdate = true;

  } );
  gui.add( effectController.tChanger, 'value', 1.0, 10.0 ).step( 1.0 ).name( 'tPower' );


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
