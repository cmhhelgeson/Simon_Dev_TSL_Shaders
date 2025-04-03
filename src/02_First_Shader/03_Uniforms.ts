import * as THREE from 'three';
import { mix, uv, Fn, uniform } from 'three/tsl';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

const init = () => {

	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	scene = new THREE.Scene();
	const geometry = new THREE.PlaneGeometry( 2, 2 );
	const material = new THREE.MeshBasicNodeMaterial();

	const effectController = {
		colorLeft: uniform( new THREE.Color( 1.0, 0.0, 1.0 ) ),
		colorRight: uniform( new THREE.Color( 1.0, 1.0, 0.0 ) )
	};

	material.colorNode = Fn( () => {

		const { colorLeft, colorRight } = effectController;
		return mix( colorLeft, colorRight, uv().x );

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
	gui.addColor( { color: effectController.colorLeft.value.getHex( THREE.SRGBColorSpace ) }, 'color' ).onChange( ( value ) => {

		effectController.colorLeft.value.set( value );

	} ).name( 'colorLeft' );
	gui.addColor( { color: effectController.colorRight.value.getHex( THREE.SRGBColorSpace ) }, 'color' ).onChange( ( value ) => {

		effectController.colorRight.value.set( value );

	} ).name( 'colorRight' );

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
