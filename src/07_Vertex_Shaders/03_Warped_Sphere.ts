import * as THREE from 'three';
import {
	Fn,
	vec3,
	remap,
	positionLocal,
	varyingProperty,
	mix,
	If,
	abs,
	smoothstep,
	pow,
	uniform,
	sin,
	normalGeometry,
	time,
} from 'three/tsl';
import { UniformNode } from 'three/webgpu';
import { Node, ShaderNodeObject, } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let renderer, camera, scene, gui;

type ShaderType = 'Warp Sphere';

const init = async () => {

	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );
	camera.position.z = 4;

	scene = new THREE.Scene();

	const effectController = {
		'Current Shader': 'Warp Sphere',
		sphereDetail: 100,
		undulationSize: 1.0,
		undulationUniform: uniform( 50.0 ),
		undulationExtrusion: uniform( 0.2 ),
	};

	const varyingColor = varyingProperty( 'vec3', 'vColor' );

	const vertexShaders: Record<ShaderType, ShaderNodeObject<Node>> = {
		'Warp Sphere': Fn( () => {

			const { undulationUniform, undulationExtrusion } = effectController;

			varyingColor.assign( vec3( 1.0, 0.0, 0.0 ) );

			const t = sin( positionLocal.y.mul( undulationUniform ).add( time.mul( 10.0 ) ) ).toVar( 't' );
			t.assign( remap( t, - 1.0, 1.0, 0.0, undulationExtrusion ) );

			positionLocal.addAssign( normalGeometry.mul( t ) );

			varyingColor.assign(
				mix(
					vec3( 0.0, 0.0, 0.6 ),
					vec3( 0.07, 0.65, 0.94 ),
					smoothstep( 0.0, 0.2, t )
				),
			);

			return vec3( positionLocal );

		} )(),

	};

	const fragmentShaders: Record<ShaderType, ShaderNodeObject<Node>> = {

		'Warp Sphere': Fn( () => {

			return varyingColor;

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

	const sphereMaterial = new THREE.MeshStandardNodeMaterial();
	sphereMaterial.positionNode = vertexShaders[ effectController[ 'Current Shader' ] ];
	sphereMaterial.colorNode = fragmentShaders[ effectController[ 'Current Shader' ] ];

	const sphereGeometry = new THREE.IcosahedronGeometry( 1, 100 );
	const sphereMesh = new THREE.Mesh( sphereGeometry, sphereMaterial );
	scene.add( sphereMesh );

	const light = new THREE.DirectionalLight( 0xffffff, 2 );
	const light2 = new THREE.DirectionalLight( 0xffffff, 1 );
	light.position.x = 2;
	light.position.z = 3;
	light2.position.x = - 2;
	light2.position.z = - 3;
	scene.add( light );
	scene.add( light2 );

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

	window.addEventListener( 'resize', onWindowResize );

	gui = new GUI();
	gui.add( effectController, 'Current Shader', Object.keys( vertexShaders ) ).onChange( () => {

		sphereMaterial.positionNode = vertexShaders[ effectController[ 'Current Shader' ] ];
		sphereMaterial.colorNode = fragmentShaders[ effectController[ 'Current Shader' ] ];
		sphereMaterial.needsUpdate = true;

	} );
	gui.add( effectController, 'sphereDetail', 1, 100 ).step( 1 ).name( 'sphereDetail' ).onChange( () => {

		sphereMesh.geometry.dispose();
		sphereMesh.geometry = new THREE.IcosahedronGeometry( 1, effectController.sphereDetail );

	} );
	gui.add( effectController, 'undulationSize', 0.01, 10.0 ).step( 0.01 ).onChange( () => {

		effectController.undulationUniform.value = 50.0 / effectController.undulationSize;

	} );
	gui.add( effectController.undulationExtrusion, 'value', 0.01, 0.5 ).step( 0.01 ).name( 'undulationExtrusion' );


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
