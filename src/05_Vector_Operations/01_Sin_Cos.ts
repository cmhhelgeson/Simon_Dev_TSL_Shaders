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
} from 'three/tsl';
import { Node, ShaderNodeObject } from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

type ShaderType = 'Basic Sin' | 'Basic CRT' | 'Refined CRT' | 'Expert CRT';

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();
  const textureLoader = new THREE.TextureLoader();
  const map = textureLoader.load( './resources/dog.jpg' );
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const effectController = {
    currentShader: 'Expert CRT',
    // Basic CRT + Refine
    lineSize: uniform( 20.0 ),
    lineSpeed: uniform( 10.0 ),
    // Refined CRT
    lineSize2: uniform( 20.0 ),
    lineSpeed2: uniform( 20.0 ),
    // Expert CRT
    zoom: uniform( 1 ),
    cellSize: uniform( 1 ),
    cellOffset: uniform( 0.5 ),
    borderMask: uniform( 1 ),
    pulseIntensity: uniform( 0.03 ),
    pulseWidth: uniform( 1 ),
    pulseRate: uniform( 20 ),
    screenCurvature: uniform( 0 ),
  };

  const red = vec3( 1.0, 0.0, 0.0 );
  const blue = vec3( 0.0, 0.0, 1.0 );

  const shaders: Record<ShaderType, ShaderNodeObject<Node>> = {

    'Basic Sin': Fn( () => {

      // Map sin of time from range -1 to 1 to range 0 to 1
      const t = vec3( remap( sin( timerLocal() ), - 1.0, 1.0, 0.0, 1.0 ) );

      // Use range to switch between red and blue

      return mix( red, blue, t );

    } )(),

    'Basic CRT': Fn( () => {

      const { lineSize, lineSpeed } = effectController;

      const color = texture( map );

      const lines = sin( uv().y.mul( viewportSize.y.div( lineSize ) ).add( timerLocal().mul( lineSpeed ) ) );
      //const lines2 = sin( uv().y.mul( viewportSize.y.div( lineSize ) ).sub( timerLocal().mul( lineSpeed ) ) );

      color.assign( mix( color, lines, 0.05 ) );

      return color;

    } )(),
    'Refined CRT': Fn( () => {

      const { lineSpeed, lineSize, lineSpeed2, lineSize2 } = effectController;

      const size1 = viewportSize.y.div( lineSize );
      const size2 = viewportSize.y.div( lineSize2 );

      const t1 = remap(
        sin( uv().y.mul( size1 ).add( timerLocal() ).mul( lineSpeed ) ),
        - 1.0,
        1.0,
        0.9,
        1.0
      );

      const t2 = remap(
        sin( uv().y.mul( size2 ).add( timerLocal() ).mul( lineSpeed2 ) ),
        - 1.0,
        1.0,
        0.95,
        1.0
      );

      const color = texture( map ).mul( t1 ).mul( t2 );

      return color;

    } )(),
    'Expert CRT': Fn( () => {

      //Zoom effect hack, doesn't work past certain screen curvatures
      //Add select statement at -1.0 to show what would happen if -1.0 was - 0.0

      const { zoom, screenCurvature, cellSize, cellOffset, borderMask, pulseIntensity, pulseRate, pulseWidth } = effectController;

      // Move into WebGPU NDC coordinates
      const vUv = uv().mul( 2 ).sub( 1 );

      const tvUV = vUv.mul(
        zoom.add(
          dot( vUv, vUv ).mul( screenCurvature )
        )
      );

      const pixel = tvUV.mul( 0.5 ).add( 0.5 );
      pixel.mulAssign( viewportSize.xy );

      const coord = pixel.div( cellSize );
      const subcoord = coord.mul(
        vec2( select( 3.0, cellSize, cellSize.greaterThan( 6 ) ),
          1.0
        ) );

      const cellOffsetVal = vec2(
        0,
        fract( floor( coord.x ) ).mul( cellOffset )
      );

      const maskCoord = floor( coord.add( cellOffsetVal ) ).mul( cellSize );

      const samplePoint = maskCoord.div( viewportSize.xy );

      const color = texture( map, samplePoint );

      const ind = floor( subcoord.x ).modInt( 3 );

      const maskColor = vec3(
        ind.equal( 0.0 ),
        ind.equal( 1.0 ),
        ind.equal( 2.0 )
      );

      const cellUV = fract( subcoord.add( cellOffsetVal ) ).mul( 2.0 ).sub( 1.0 );

      const border = float( 1.0 ).sub( cellUV.mul( cellUV ).mul( borderMask ) );

      maskColor.mulAssign( vec3( clamp( border.x, 0.0, 1.0 ).mul( clamp( border.y, 0.0, 1.0 ) ) ) );
      color.mulAssign( vec3( float( 1.0 ).add( maskColor.sub( 1.0 ) ) ) );

      const pulse = float( 1.0 ).add( pulseIntensity ).mul( sin( pixel.y.div( pulseWidth ).add( timerLocal().mul( pulseRate ) ) ) );

      color.r.mulAssign( pulse );
      color.b.mulAssign( pulse );
      color.g.mulAssign( pulse );

      color.mulAssign( 2.5 );

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
  const basicCRTFolder = gui.addFolder( 'Basic CRT' );
  basicCRTFolder.add( effectController.lineSize, 'value', 1.0, 100.0 ).step( 1.0 ).name( 'Line Size' );
  basicCRTFolder.add( effectController.lineSpeed, 'value', 1.0, 100.0 ).step( 1.0 ).name( 'Line Speed' );
  const refinedCRTFolder = gui.addFolder( 'Refined CRT' );
  refinedCRTFolder.add( effectController.lineSize2, 'value', 1.0, 100.0 ).step( 1.0 ).name( 'Line 2 Size' );
  refinedCRTFolder.add( effectController.lineSpeed2, 'value', 1.0, 100.0 ).step( 1.0 ).name( 'Line 2 Speed' );
  const expertCRTFolder = gui.addFolder( 'Expert CRT' );
  expertCRTFolder.add( effectController.cellSize, 'value', 1, 50 ).step( 1 ).name( 'Cell Size' );
  expertCRTFolder.add( effectController.cellOffset, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'Cell Offset' );
  expertCRTFolder.add( effectController.borderMask, 'value', 0.0, 5.0 ).step( 0.1 ).name( 'Border Mask' );
  expertCRTFolder.add( effectController.pulseIntensity, 'value', 0.0, 0.5 ).step( 0.01 ).name( 'Pulse Intensity' );
  expertCRTFolder.add( effectController.pulseWidth, 'value', 1, 100 ).step( 5 ).name( 'Pulse Width' );
  expertCRTFolder.add( effectController.pulseRate, 'value', 0, 100 ).step( 10 ).name( 'Pulse Rate' );
  expertCRTFolder.add( effectController.screenCurvature, 'value', 0, 0.5 ).step( 0.01 ).name( 'Screen Curvature' );
  expertCRTFolder.add( effectController.zoom, 'value', 0, 1 ).step( 0.1 ).name( 'Zoom' );

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
