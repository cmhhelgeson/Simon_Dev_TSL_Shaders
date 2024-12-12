import * as THREE from 'three';
import { attribute, Fn } from 'three/tsl';

let renderer, camera, scene;

const init = () => {

  camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
  scene = new THREE.Scene();
  const geometry = new THREE.PlaneGeometry( 2, 2 );

  const colors = [
    new THREE.Color( 0xFF0000 ),
    new THREE.Color( 0x00FF00 ),
    new THREE.Color( 0x0000FF ),
    new THREE.Color( 0x00FFFF ),
  ];

  const colorFloats = colors.map( c => c.toArray() ).flat();

  geometry.setAttribute( 'vColor', new THREE.Float32BufferAttribute( colorFloats, 3 ) );

  const material = new THREE.MeshBasicNodeMaterial();

  // three/src/nodes/core/AttributeNode.js
  /*
    // If in the vertex stage, build the attribute.
    if ( builder.shaderStage === 'vertex' ) {

      return builder.format( nodeAttribute.name, attributeType, nodeType );

    // Else, if in the fragment stage, pass the attribute as a varying to
    // the fragment shader.
    } else {

      const nodeVarying = varying( this );

      return nodeVarying.build( builder, nodeType );

    }
  */

  material.colorNode = Fn( () => {

    return attribute( 'vColor' );

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
