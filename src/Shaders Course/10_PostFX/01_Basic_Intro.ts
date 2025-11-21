import * as THREE from 'three';
import {
	texture,
	uv,
	Fn,
	remap,
	uniform,
	pass,
} from 'three/tsl';

import { sobel } from 'three/addons/tsl/display/SobelOperatorNode.js';
import { bleach } from 'three/addons/tsl/display/BleachBypass.js';
import { dotScreen } from 'three/addons/tsl/display/DotScreenNode.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { WebGPURenderer, PostProcessing, MeshBasicNodeMaterial } from 'three/webgpu';

let renderer, camera, scene, gui;

// Post Processing Outputs
let postScene, postSobel, postBleach, postPixelation;

const effectController = {
	remapUVXBegin: uniform( 0.25 ),
	remapUVXEnd: uniform( 0.75 ),
	bleachOpacity: uniform( 0.8 ),
	pixelSize: uniform( 6 ),
	normalEdgeStrength: uniform( 0.3 ),
	depthEdgeStrength: uniform( 0.4 ),
};

const init = async () => {

	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	scene = new THREE.Scene();
	const geometry = new THREE.PlaneGeometry( 2, 2 );

	const material = new MeshBasicNodeMaterial();

	const textureLoader = new THREE.TextureLoader();
	const tomatoTexture = textureLoader.load( './resources/tomato.jpg' );

	material.colorNode = Fn( () => {

		const { remapUVXBegin, remapUVXEnd } = effectController;

		const vUv = uv().toVar( 'vUv' );

		vUv.x.assign( remap( uv().x, 0.0, 1.0, remapUVXBegin, remapUVXEnd ) );
		return texture( tomatoTexture, vUv );

	} )();

	const quad = new THREE.Mesh( geometry, material );
	scene.add( quad );

	renderer = new WebGPURenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	document.body.appendChild( renderer.domElement );

	postScene = new PostProcessing( renderer );
	postSobel = new PostProcessing( renderer );
	postBleach = new PostProcessing( renderer );
	postPixelation = new PostProcessing( renderer );

	const scenePass = pass( scene, camera );
	postScene.outputNode = scenePass;
	postBleach.outputNode = bleach( scenePass, effectController.bleachOpacity );
	postSobel.outputNode = sobel( scenePass );
	postPixelation.outputNode = dotScreen( scenePass );

	window.addEventListener( 'resize', onWindowResize );

	gui = new GUI();
	gui.add( effectController.remapUVXBegin, 'value', 0.01, 0.9 ).name( 'remapXBegin' );
	gui.add( effectController.remapUVXEnd, 'value', 0.01, 0.9 ).name( 'remapXEnd' );
	const postProcessingFolder = gui.addFolder( 'Post Processing' );
	postProcessingFolder.add( effectController.bleachOpacity, 'value', 0.01, 10.0 ).name( 'bleachOpacity' );

};

const onWindowResize = () => {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

};

function animate() {

	// Altering the code a bit to work within a more typical postProcessing context
	const halfWidth = window.innerWidth / 2;
	const halfHeight = window.innerHeight / 2;

	renderer.setViewport( 0, 0, halfWidth, halfHeight );

	postScene.render();

	renderer.autoClear = false;

	renderer.setViewport( halfWidth, 0, halfWidth, halfHeight );
	postBleach.render();

	renderer.setViewport( 0, halfHeight, halfWidth, halfHeight );
	postSobel.render();

	renderer.setViewport( halfWidth, halfHeight, halfWidth, halfHeight );
	postPixelation.render();

	renderer.autoClear = true;

}

init();
