import * as THREE from 'three';
import {
  fract,
  float,
  Fn,
  sin,
  time,
  vec2,
  viewportSize,
  uv,
  vec3
} from 'three/tsl';

let renderer, camera, scene;

const init = async () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const material = new THREE.MeshBasicNodeMaterial();

  const RandomTSL = ( pNode ) => {

    const p = float( 50.0 ).mul( fract( pNode.mul( 0.3183099 ).add( vec2( 0.71, 0.113 ) ) ) );

    const fractCalc = fract( p.x.mul( p.y ).mul( p.x.add( p.y ) ) );
    return float( - 1.0 ).add( float( 2.0 ).mul( fractCalc ) );


  };

  material.colorNode = Fn( () => {

    const center = uv().sub( 0.5 );
    const pixelCoord = center.mul( viewportSize );

    return vec3( RandomTSL( pixelCoord.mul( sin( time ) ) ) );

  } )();

  const quad = new THREE.Mesh( geometry, material );
  scene.add( quad );

  renderer = new THREE.WebGPURenderer( { antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  document.body.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize );

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
