import * as THREE from 'three';
import {
	Fn,
	vec3,
	remap,
	sin,
	time,
	positionLocal,
	rotate,
} from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MeshStandardNodeMaterial, Node, WebGPURenderer } from 'three/webgpu';

let renderer, camera, scene, gui;

type ShaderType =
  'Move Z' |
  'Stretch XZ' |
  'Rotate X' |
  'Rotate Y' |
  'Rotate Z' |
  'Rotate All'

interface EffectControllerType {
  'Current Shader': ShaderType,
}

const init = async () => {

	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );
	camera.position.z = 4;

	scene = new THREE.Scene();

	const effectController: EffectControllerType = {
		'Current Shader': 'Move Z'
	};

	const shaders: Record<ShaderType, Node> = {
		'Move Z': Fn( () => {

			const position = positionLocal.toVar( 'newPosition' );
			position.z.addAssign( sin( time ) );

			return position;

		} )(),

		'Stretch XZ': Fn( () => {

			const newPosition = positionLocal.toVar( 'newPosition' );
			newPosition.xz.mulAssign( remap( sin( time ), - 1.0, 1.0, 0.5, 1.5 ) );

			return newPosition;


		} )(),

		'Rotate X': Fn( () => {

			const newPosition = positionLocal.toVar( 'newPosition' );
			newPosition.assign( rotate( newPosition, vec3( time, 0.0, 0.0 ) ) );

			return newPosition;


		} )(),

		'Rotate Y': Fn( () => {

			const newPosition = positionLocal.toVar( 'newPosition' );
			newPosition.assign( rotate( newPosition, vec3( 0.0, time, 0.0 ) ) );

			return newPosition;


		} )(),

		'Rotate Z': Fn( () => {

			const newPosition = positionLocal.toVar( 'newPosition' );
			newPosition.assign( rotate( newPosition, vec3( 0.0, 0.0, time ) ) );

			return newPosition;

		} )(),

		'Rotate All': Fn( () => {

			const newPosition = positionLocal.toVar( 'newPosition' );
			newPosition.assign( rotate( newPosition, time ) );

			return newPosition;

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

	const loader = new GLTFLoader();
	const suzanneMaterial = new MeshStandardNodeMaterial();
	suzanneMaterial.positionNode = shaders[ 'Move Z' ];

	const light = new THREE.DirectionalLight( 0xffffff, 2 );
	const light2 = new THREE.DirectionalLight( 0xffffff, 1 );
	light.position.x = 2;
	light.position.z = 3;
	light2.position.x = - 2;
	light2.position.z = - 3;
	scene.add( light );
	scene.add( light2 );

	loader.load( './resources/suzanne.glb', function ( gltf ) {

		gltf.scene.traverse( c => {

			c.material = suzanneMaterial;

		} );

		scene.add( gltf.scene );

	} );

	renderer = new WebGPURenderer( { antialias: true } );
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
	gui.add( effectController, 'Current Shader', Object.keys( shaders ) ).onChange( () => {

		suzanneMaterial.positionNode = shaders[ effectController[ 'Current Shader' ] ];
		suzanneMaterial.needsUpdate = true;

	} );


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
