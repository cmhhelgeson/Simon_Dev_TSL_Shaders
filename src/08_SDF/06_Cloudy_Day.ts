import * as THREE from 'three';
import {
  fract,
  length,
  smoothstep,
  float,
  Fn,
  viewportSize,
  uniform,
  abs,
  uv,
  vec3,
  remap,
  max,
  negate,
  min,
  dot,
  vec2,
  clamp,
  sign,
  If,
  rotate,
  uint,
  mix,
  sin,
  mod,
  For,
  Loop,
  time,
  step,
  pow,
  saturate,
  exp,
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

enum BooleanEnum {
	UNION,
	INTERSECTION,
	SUBTRACTION
}

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();

  const effectController = {
    skyGradient: uniform( 0.5 ),
    shadowIntensity: uniform( 0.5 ),
    dayLength: uniform( 4.0 ),
  };
  const red = vec3( 1.0, 0.0, 0.0 );
  const black = vec3( 0.0, 0.0, 0.0 );

  const drawGrid = ( baseColor, lineColor, cellWidth, lineWidth ) => {

    const center = uv().sub( 0.5 );

    const gridPosition = center.mul( viewportSize ).div( cellWidth );
    // Access each individual cell's uv space.
    const cellUV = fract( gridPosition );

    // Move center of each cell (0, 0) from bottom-left to the middle.
    cellUV.assign( abs( cellUV.sub( 0.5 ) ) );
    const distToEdge = ( float( 0.5 ).sub( max( cellUV.x, cellUV.y ) ) ).mul( cellWidth );
    const ceilLine = smoothstep( 0.0, lineWidth, distToEdge );

    const color = mix( lineColor, baseColor, ceilLine );

    return color;

  };

  const DrawBackground = () => {

    const { skyGradient, dayLength } = effectController;

    const morning = mix(
      vec3( 0.44, 0.64, 0.84 ),
      vec3( 0.34, 0.51, 0.94 ),
      smoothstep( 0.0, 1.0, pow( uv().x.mul( uv().y ), 0.5 ) )
    );

    const midday = mix(
      vec3( 0.42, 0.58, 0.75 ),
      vec3( 0.36, 0.46, 0.82 ),
      smoothstep( 0.0, 1.0, pow( uv().x.mul( uv().y ), 0.5 ) )
    );

    const evening = mix(
      vec3( 0.82, 0.51, 0.25 ),
      vec3( 0.88, 0.71, 0.39 ),
      smoothstep( 0.0, 1.0, pow( uv().x.mul( uv().y ), 0.5 ) )
    );

    const night = mix(
      vec3( 0.07, 0.1, 0.19 ),
      vec3( 0.19, 0.2, 0.29 ),
      smoothstep( 0.0, 1.0, pow( uv().x.mul( uv().y ), 0.5 ) )
    );

    const dayTime = mod( time, dayLength );

    const skyColor = vec3( 0.0 ).toVar( 'skyColor' );

    const morningEnd = dayLength.mul( 0.25 );
    const middayEnd = dayLength.mul( 0.5 );
    const eveningEnd = dayLength.mul( 0.75 );

    If( dayTime.lessThan( morningEnd ), () => {

      skyColor.assign( mix( morning, midday, smoothstep( 0.0, morningEnd, dayTime ) ) );

    } ).ElseIf( dayTime.lessThan( middayEnd ), () => {

      skyColor.assign( mix( midday, evening, smoothstep( morningEnd, middayEnd, dayTime ) ) );

    } ).ElseIf( dayTime.lessThan( eveningEnd ), () => {

      skyColor.assign( mix( evening, night, smoothstep( middayEnd, eveningEnd, dayTime ) ) );

    } ).Else( () => {

      skyColor.assign( mix( night, morning, smoothstep( eveningEnd, dayLength, dayTime ) ) );

    } );

    return skyColor;

  };

  const sdfCircle = ( positionNode, radiusNode ) => {

    return length( positionNode ).sub( radiusNode );

  };

  const sdfCloud = ( positionNode ) => {

    const puff1 = sdfCircle( positionNode, float( 100.0 ) );
    const puff2 = sdfCircle( positionNode.sub( vec2( 120.0, - 10.0 ) ), float( 75.0 ) );
    const puff3 = sdfCircle( positionNode.add( vec2( 120.0, 10.0 ) ), float( 75.0 ) );

    const d = opUnion( puff1, opUnion( puff2, puff3 ) );

    return d;

  };

  const sdfBox = ( posNode, boundNode ) => {

    const d = abs( posNode ).sub( boundNode );
    return length( max( d, 0.0 ) ).add( min( max( d.x, d.y ), 0.0 ) );

  };

  const opUnion = ( d1Node, d2Node ) => {

    return min( d1Node, d2Node );

  };

  const opIntersection = ( d1Node, d2Node ) => {

    return max( d1Node, d2Node );

  };

  const opSubtraction = ( d1Node, d2Node ) => {

    return max( negate( d1Node ), d2Node );

  };

  const hash = ( vNode ) => {

    const t = dot( vNode, vec2( 36.5323, 73.945 ) );
    return sin( t );

  };

  const inverseLerp = ( currentValue, minValue, maxValue ) => {

    return ( currentValue.sub( minValue ) ).div( maxValue.sub( minValue ) );

  };

  material.colorNode = Fn( () => {

    const vUv = uv();

    const { shadowIntensity, dayLength } = effectController;

    // Create baseline color and uvs
    const color = vec3( 0.0 ).toVar( 'color' );
    // Space is standard texture UV space
    const origin = vUv;
    // Move to space of 0 to viewportSize
    const viewportPosition = origin.mul( viewportSize );

    color.assign( DrawBackground() );

    const dayTime = mod( time, dayLength );

    If( dayTime.lessThan( dayLength.mul( 0.75 ) ), () => {

      const t = saturate( dayTime );

      const sunDefaultPosition = vec2( 200.0, viewportSize.y.mul( float( 0.8 ) ) );
      const sunMovement = mix( vec2( 0.0, 400.0 ), vec2( 0.0 ), t );

      const sunOffset = sunDefaultPosition.add( sunMovement );
      const sunPos = viewportPosition.sub( sunOffset );

      const sun = sdfCircle( sunPos, float( 100.0 ) );
      color.assign( mix( vec3( 0.84, 0.62, 0.26 ), color, smoothstep( 0.0, 2.0, sun ) ) );

      // Exponenially increase brightness as we get closer to edge of sun
      const s = max( 0.001, sun );
      const p = saturate( exp( s.mul( s ).mul( - 0.001 ) ) );
      color.addAssign( mix( vec3( 0.0 ), vec3( 0.9, 0.85, 0.47 ), p ).mul( 0.5 ) );

    } );


    const numClouds = float( 10.0 ).toVar( 'numClouds' );

    Loop( { start: uint( 0 ), end: uint( 10 ), type: 'uint', condition: '<' }, ( { i } ) => {

      // const size = mix(maxSizeScale, minSizeScale)
      const size = mix( 2.0, 1.0, float( i ).div( numClouds ).add( hash( vec2( i ) ).mul( 0.1 ) ) );
      const speed = size.mul( 0.25 );

      const cloudOffset = vec2( float( i ).mul( 200.0 ).add( time.mul( 100.0 ).mul( speed ) ), float( 200.0 ).mul( hash( vec2( i ) ) ) );
      const cloudPosition = mod( viewportPosition.sub( cloudOffset ), viewportSize );
      cloudPosition.assign( cloudPosition.sub( viewportSize.mul( 0.5 ) ) );

      const cloudShadow = sdfCloud( cloudPosition.mul( size ).add( vec2( 25.00 ) ) ).sub( 40.0 );


      const cloud = sdfCloud( cloudPosition.mul( size ) );

      color.assign(
        mix(
          color,
          vec3( 0.0 ),
          remap( smoothstep( - 100.0, 0.0, cloudShadow ), 0.0, 1.0, 1.0, 0.0 ).mul( shadowIntensity )
        )
      );
      color.assign(
        mix(
          vec3( 1.0 ),
          color,
          smoothstep( 0.0, 1.0, cloud )
        )
      );


    } );

    return color;

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
  gui.add( effectController.skyGradient, 'value', 0.01, 1.0 ).name( 'gradientControl' );
  gui.add( effectController.shadowIntensity, 'value', 0.1, 5.0 ).step( 0.01 ).name( 'shadowIntensity' );
  gui.add( effectController.dayLength, 'value', 4.0, 40.0 ).step( 4.0 ).name( 'dayLength' );

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
