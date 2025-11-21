import * as THREE from 'three';
import {
	Fn,
	vec3,
	remap,
	mix,
	uniform,
	normalGeometry,
	normalize,
	color,
	max,
	dot,
	cameraPosition,
	positionWorld,
	reflect,
	negate,
	pow,
	float,
} from 'three/tsl';
import { Node, ShaderNodeObject } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

type ShaderType = 'Phong Specular';

const init = async () => {

	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );
	camera.position.z = 4;

	scene = new THREE.Scene();

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

	const effectController = {
		'Current Shader': 'Phong Specular',
		objectColor: uniform( color( 0.5, 0.5, 0.5 ) ),
		// Direct Light Position
		shininessValue: uniform( 32.0 ),

	};

	const cubemap = new THREE.CubeTextureLoader().load( urls );
	scene.background = cubemap;

	const loader = new GLTFLoader();
	const suzanneMaterial = new THREE.MeshStandardNodeMaterial();

	const lights: Record<string, THREE.Light> = {
		'HemisphereLight': new THREE.HemisphereLight( 0x0095cb, 0xcb9659, 1 ),
		'DirectionalLight': new THREE.DirectionalLight( 0x0095cb, 10 ),
	};

	lights[ 'HemisphereLight' ].position.set( 0, 20, 0 );
	scene.add( lights[ 'HemisphereLight' ] );
	scene.add( lights[ 'DirectionalLight' ] );

	const shaders: Record<ShaderType, ShaderNodeObject<Node>> = {

		// Crudely emulate Phong Specular Shading.
		'Phong Specular': Fn( () => {

			const { objectColor, shininessValue } = effectController;

			const baseColor = objectColor;
			const viewDir = normalize( cameraPosition.sub( positionWorld ) );

			const ambient = vec3( 0.5 ).toVar( 'ambient' );
			const lighting = vec3( 0.0 ).toVar( 'lighting' );

			const skyColor = vec3( 0.0, 0.3, 0.6 );
			const groundColor = vec3( 0.6, 0.3, 0.1 );

			const hemiMix = remap( normalGeometry.y, - 1.0, 1.0, 0.0, 1.0 );
			const hemi = mix( groundColor, skyColor, hemiMix );

			const lightDir = normalize( vec3( 1.0, 1.0, 1.0 ) );
			const lightColor = vec3( 1.0, 1.0, 0.9 );

			const dp = max( 0.0, dot( lightDir, normalGeometry ) );
			const diffuse = dp.mul( lightColor );

			const normal = normalize( normalGeometry );

			// Phong Specular
			// Represents the direction of the light reflecting off the object
			const r = normalize( reflect( negate( lightDir ), normal ) );
			// When the view dir and the light bounce are directly opposite, then the specular
			// is at its highest power.
			const phongValue = max( 0.0, dot( viewDir, r ) ).toVar( 'phongValue' );
			phongValue.assign( pow( phongValue, shininessValue ) );

			const specular = vec3( phongValue );

			lighting.assign( ambient.mul( 0.0 ).add( hemi.mul( 0.0 ) ).add( diffuse.mul( 1.0 ) ) );

			const color = baseColor.mul( lighting ).add( specular ).toVar( 'color' );
			color.assign( pow( color, vec3( float( 1.0 ).div( 2.2 ) ) ) );

			return color;

		} )(),

	};

	const defaultFragmentNode = suzanneMaterial.fragmentNode;
	suzanneMaterial.fragmentNode = shaders[ 'Phong Specular' ];

	loader.load( './resources/suzanne.glb', function ( gltf ) {

		gltf.scene.traverse( c => {

			c.material = suzanneMaterial;

		} );

		scene.add( gltf.scene );

	} );

	renderer = new THREE.WebGPURenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	document.body.appendChild( renderer.domElement );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.enableZoom = false;
	controls.enablePan = false;
	controls.minPolarAngle = Math.PI / 4;
	controls.maxPolarAngle = Math.PI / 1.5;

	gui = new GUI();
	gui.add( effectController.shininessValue, 'value', 0.0, 100.0 ).name( 'shininess' );

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
