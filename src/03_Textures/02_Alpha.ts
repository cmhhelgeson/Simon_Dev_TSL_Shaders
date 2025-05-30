import * as THREE from 'three';
import { uniform, Fn, texture, mix } from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

const init = async () => {

	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	scene = new THREE.Scene();
	const geometry = new THREE.PlaneGeometry( 2, 2 );

	const material = new THREE.MeshBasicNodeMaterial();
	const textureLoader = new THREE.TextureLoader();
	const gridMap = textureLoader.load( './resources/uv_grid_opengl.jpg' );
	const overlayMap = textureLoader.load( './resources/overlay.png' );

	const effectController = {
		tint: uniform( new THREE.Color( 1.0, 1.0, 1.0 ) ),
		transparency: uniform( 1.0 ),
	};

	material.colorNode = Fn( () => {

		const { tint, transparency } = effectController;
		const gridColor = texture( gridMap ).mul( tint );
		const overlayColor = texture( overlayMap ).mul( transparency );

		return mix( gridColor, overlayColor, overlayColor.w );

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
	gui.addColor( { color: effectController.tint.value.getHex( THREE.SRGBColorSpace ) }, 'color' ).onChange( ( value ) => {

		effectController.tint.value.set( value );

	} ).name( 'tint' );
	gui.add( effectController.transparency, 'value', 0.0, 1.0 ).name( 'transparency' );

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
