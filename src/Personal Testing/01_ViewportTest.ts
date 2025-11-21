
import * as THREE from 'three';
import { uniform, viewportSize, viewportUV, viewportCoordinate, Fn, texture, dFdx, dFdy, time, sin, mix, floor, float, vec3, dot, fract, uint, Loop, uv, viewportSafeUV, screenUV } from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Node, MeshBasicNodeMaterial, WebGPURenderer } from 'three/webgpu';

let renderer, camera, scene, gui;

type ShaderType =
	'Standard UV' |
	'Fract UV' |
	'Viewport Coordinate' |
	'Fract Viewport Coordinate' |
	'Viewport UV' |
	'UV Mul ViewSize' |
	'Fract UV Mul ViewSize' |
	'Fract Viewport UV' |
	'Viewport Safe UV' |
	'Screen UV';

const effectController = {
	currentShader: 'Standard UV',
	updateCamera: true,
	updateRenderSize: true,
	zoom: uniform( 1 ),
	gridSize: uniform( 5 ),
};

const init = async () => {

	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	scene = new THREE.Scene();
	const geometry = new THREE.PlaneGeometry( 2, 2 );

	const material = new MeshBasicNodeMaterial();
	const textureLoader = new THREE.TextureLoader();
	const map = textureLoader.load( './resources/uv_grid_opengl.jpg' );

	const fragmentShaders: Record<string, Node> = {

		// Corresponds to WebGL Texture coordinates
		'Standard UV': Fn( () => {

			return uv();

		} )(),

		'Fract UV': Fn( () => {

			return fract( uv().mul( effectController.gridSize ) );

		} )(),

		'Viewport Coordinate': Fn( () => {

			return viewportCoordinate.div( effectController.zoom );

		} )(),

		'Fract Viewport Coordinate': Fn( () => {

			return fract( viewportCoordinate.div( effectController.zoom ) );

		} )(),

		'UV Mul ViewSize': Fn( () => {

			return ( uv().mul( viewportSize ) ).div( effectController.zoom );

		} )(),

		'Fract UV Mul ViewSize': Fn( () => {

			return fract( ( uv().mul( viewportSize ) ).div( effectController.zoom ) );

		} )(),

		'Viewport UV': Fn( () => {

			return viewportUV;

		} )(),

		'Fract Viewport UV': Fn( () => {

			return fract( viewportUV.mul( effectController.gridSize ) );


		} )(),

		'Screen UV': Fn( () => {

			return screenUV;


		} )(),

	};

	// Grid shaders succintly demonstrate the functionality of dFdx due to the harsh
	// changes between grid lines and the rest of the grid space.
	material.colorNode = fragmentShaders[ effectController.currentShader ];

	const quad = new THREE.Mesh( geometry, material );
	scene.add( quad );

	renderer = new WebGPURenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	document.body.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize );

	gui = new GUI();
	gui.add( effectController, 'currentShader', Object.keys( fragmentShaders ) ).onChange( () => {

		console.log( effectController.currentShader );

		material.colorNode = fragmentShaders[ effectController.currentShader ];
		material.needsUpdate = true;

	} );
	const fractUVFolder = gui.addFolder( 'fractUV' );
	fractUVFolder.add( effectController.gridSize, 'value', 1, 100 ).step( 1 ).name( 'gridSize' );
	gui.add( effectController.zoom, 'value', 1, 200 ).step( 1 ).name( 'zoom' );
	gui.add( effectController, 'updateCamera', [ true, false ] ).onChange( () => {

		if ( effectController.updateCamera ) {

			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();


		}

	} );
	gui.add( effectController, 'updateRenderSize', [ true, false ] ).onChange( () => {

		if ( effectController.updateRenderSize ) {

			renderer.setSize( window.innerWidth, window.innerHeight );

		}

	} );

};

const onWindowResize = () => {

	if ( effectController.updateCamera ) {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

	}

	if ( effectController.updateRenderSize ) {

  	renderer.setSize( window.innerWidth, window.innerHeight );

	}

};

function animate() {

	renderer.render( scene, camera );

}

init();
