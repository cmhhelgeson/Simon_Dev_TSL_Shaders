
import * as THREE from 'three';
import { uniform, viewportSize, viewportUV, viewportCoordinate, Fn, texture, dFdx, dFdy, time, sin, mix, timerLocal, floor, float, vec3, dot, fract, uint, Loop, uv, negate, length, smoothstep, vec2, ShaderNodeObject, distance, exp } from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Node } from 'three/webgpu';

let renderer, camera, scene, gui;

const hash3 = ( pNode ) => {

  const p = vec3(
    dot( pNode, vec3( 127.1, 311.7, 74.7 ) ),
    dot( pNode, vec3( 269.5, 183.3, 246.1 ) ),
    dot( pNode, vec3( 113.5, 271.9, 124.6 ) )
  );

  return float( - 1.0 ).add(
    float( 2.0 ).mul( fract(
      sin( p ).mul( 43578.543123 )
    ) )
  );

};

const noise3D = ( p ) => {

  const i = floor( p );
  const f = fract( p );

  const u = f.mul( f ).mul(
    float( 3.0 ).sub( f.mul( 2.0 ) )
  );

  // Gradients
  const ga = hash3( i.add( vec3( 0.0, 0.0, 0.0 ) ) );
  const gb = hash3( i.add( vec3( 1.0, 0.0, 0.0 ) ) );
  const gc = hash3( i.add( vec3( 0.0, 1.0, 0.0 ) ) );
  const gd = hash3( i.add( vec3( 1.0, 1.0, 0.0 ) ) );
  const ge = hash3( i.add( vec3( 0.0, 0.0, 1.0 ) ) );
  const gf = hash3( i.add( vec3( 1.0, 0.0, 1.0 ) ) );
  const gg = hash3( i.add( vec3( 0.0, 1.0, 1.0 ) ) );
  const gh = hash3( i.add( vec3( 1.0, 1.0, 1.0 ) ) );

  // Projections
  const va = f.sub( vec3( 0.0, 0.0, 0.0 ) );
  const vb = f.sub( vec3( 1.0, 0.0, 0.0 ) );
  const vc = f.sub( vec3( 0.0, 1.0, 0.0 ) );
  const vd = f.sub( vec3( 1.0, 1.0, 0.0 ) );
  const ve = f.sub( vec3( 0.0, 0.0, 1.0 ) );
  const vf = f.sub( vec3( 1.0, 0.0, 1.0 ) );
  const vg = f.sub( vec3( 0.0, 1.0, 1.0 ) );
  const vh = f.sub( vec3( 1.0, 1.0, 1.0 ) );

  return mix(
    mix(
      mix(
        dot( ga, va ), dot( gb, vb ), u.x
      ),
      mix(
        dot( gc, vc ), dot( gd, vd ), u.x
      ),
      u.y
    ),
    mix(
      mix(
        dot( ge, ve ), dot( gf, vf ), u.x
      ),
      mix(
        dot( gg, vg ), dot( gh, vh ), u.x
      ),
      u.y
    ),
    u.z
  );

};

const fbm = ( pNode ) => {

  const {
    amplitudePersistence,
    frequencyLacunarity,
    octaves
  } = effectController;

  const currentAmplitude = float( 0.0 ).toVar( 'currentAmplitude' );
  const currentFrequency = float( 0.0 ).toVar( 'currentFrequency' );
  const total = float();

  Loop( { start: uint( 0 ), end: octaves, type: 'uint', condition: '<' }, () => {

    const noiseValue = noise3D( pNode.mul() );


  } );


};

const mod289 = ( x ) => {

  return x.sub( floor( x / 289.0 ).mul( 289.0 ) );

};

const permute = ( x ) => {

  return mod289(
    ( x.mul( 34.0 ).add( 1.0 ) ).mul( x )
  );


};

const taylorInvSqrt = ( r ) => {

  return float( 1.79284291400159 ).sub( r.mul( 0.85373472095314 ) );

};

type ShaderType =
  'Step 1: ViewportCoordinate' |
  'Step 2: Base UV' |
  'Step 3: Negate UV' |
  'Step 4: Cells' |
  'Step 5: Offset Origin' |
  'Step 6: Expand Cell Range' |
  'Complete Shader'


const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();
  const textureLoader = new THREE.TextureLoader();
  const map = textureLoader.load( './resources/uv_grid_opengl.jpg' );

  const effectController = {
    currentShader: 'Complete Shader',
    tint: uniform( new THREE.Color( 1.0, 0.0, 0.0 ) ),
    cellSize: uniform( 100 ),
    starRadius: uniform( 4.0 ),
    distanceFromCellCenter: uniform( 4.0 ),
  };

  const StepOne = () => {

    return viewportCoordinate;

  };

  type StepTwoArgs = ReturnType<typeof StepOne>

  const StepTwo = ( args: StepTwoArgs ) => {

    const { cellSize } = effectController;

    const cellInvert = args.div( cellSize ).toVar( 'cellInvert' );

    return { cellInvert };

  };

  const StepThree = ( args ) => {

    args.y.assign( negate( args.y ) );
    return args;

  };

  const fragmentShaders: Record<ShaderType, ShaderNodeObject<Node>> = {
    'Step 1: ViewportCoordinate': Fn( () => {

      return StepOne();

    } )(),
    'Step 2: Base UV': Fn( () => {

      return StepTwo( StepOne() );

    } )(),

    'Step 3: Negate UV': Fn( () => {

      return StepThree( StepTwo( StepOne() ) );

    } )(),

    'Complete Shader': Fn( () => {

      const { cellSize, starRadius, distanceFromCellCenter } = effectController;

      // Use viewportCoordinate instead of uv to ensure that the stars have a uniform
      // size irrespective of whether the screen size increases
      const cellInvert = viewportCoordinate.div( cellSize ).toVar( 'cellInvert' );
      cellInvert.y.assign( negate( cellInvert.y ) );

      const cellCoords = fract( cellInvert ).sub( 0.5 ).mul( cellSize );
      const cellID = floor( cellInvert );

      const cellHashValue = hash3( vec3( cellID, 0.0 ) );

      const starPosition = vec2( 0.0 ).toVar( 'starPosition' );
      starPosition.addAssign( cellHashValue.xy.mul( cellSize.mul( 0.5 ).sub( starRadius.mul( distanceFromCellCenter ) ) ) );
      const distToStar = length( cellCoords.sub( starPosition ) );

      // Create baseline glow
      const glow = exp( float( - 2.0 ).mul( distToStar.div( starRadius ) ) );

      // Randomize extent of the glow
      const starBrightness = cellHashValue.z;

      return vec3( glow.mul( starBrightness ) );


    } )(),


  };

  // Grid shaders succintly demonstrate the functionality of dFdx due to the harsh
  // changes between grid lines and the rest of the grid space.
  material.colorNode = fragmentShaders[ effectController.currentShader ];

  const quad = new THREE.Mesh( geometry, material );
  scene.add( quad );

  renderer = new THREE.WebGPURenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize );

  gui = new GUI();
  gui.add( effectController, 'currentShader', Object.keys( fragmentShaders ) ).onChange( () => {

    material.colorNode = fragmentShaders[ effectController.currentShader ];
    material.needsUpdate = true;


  } );
  const starsFolder = gui.addFolder( 'Stars' );
  starsFolder.add( effectController.cellSize, 'value', 1, 200 ).step( 0.1 ).name( 'cellSize' );
  starsFolder.add( effectController.starRadius, 'value', 1.0, 20.0 ).step( 0.1 ).name( 'starRadius' );
  starsFolder.add( effectController.distanceFromCellCenter, 'value', 0.5, 10.0 ).step( 0.1 ).name( 'starDistanceFromCellCenter' );


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
