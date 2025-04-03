import * as THREE from 'three';
import {
	fract,
	float,
	Fn,
	sin,
	vec2,
	viewportSize,
	uv,
	vec3,
	time,
	floor,
	mix,
	uniform,
	ShaderNodeObject
} from 'three/tsl';

let renderer, camera, scene, gui;

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Node } from 'three/webgpu';

type ShaderType =
  'Random Noise' |
  'Block Noise';

const init = async () => {

	const effectController = {
		seed: uniform( 16.0 ),
		'Current Shader': 'Random Noise'
	};

	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	scene = new THREE.Scene();
	const geometry = new THREE.PlaneGeometry( 2, 2 );

	const material = new THREE.MeshBasicNodeMaterial();

	const randomFn = Fn( ( [ positionNode ] ) => {

		const p = float( 50.0 ).mul( fract( positionNode.mul( 0.3183099 ).add( vec2( 0.71, 0.113 ) ) ) );

		const fractCalc = fract( p.x.mul( p.y ).mul( p.x.add( p.y ) ) );
		return float( - 1.0 ).add( float( 2.0 ).mul( fractCalc ) );

	} ).setLayout( {
		name: 'randomFn',
		type: 'float',
		inputs: [
			{ name: 'positionNode', type: 'vec2' }
		]
	} );

	const BlockyNoise = Fn( ( [ position ] ) => {

		const i = floor( position );
		const f = fract( position );

		const u = f.mul( f ).mul( float( 3.0 ).sub( f.mul( 2.0 ) ) );

		const mix1 = mix(
			randomFn( i.add( vec2( 0.0, 0.0 ) ) ),
			randomFn( i.add( vec2( 1.0, 0.0 ) ) ),
			u.x
		);

		const mix2 = mix(
			randomFn( i.add( vec2( 0.0, 1.0 ) ) ),
			randomFn( i.add( vec2( 1.0, 1.0 ) ) ),
			u.x
		);

		return mix( mix1, mix2, u.y );

	} ).setLayout( {
		name: 'BlockyNoise',
		type: 'float',
		inputs: [
			{ name: 'position', type: 'vec2' }
		]
	} );

	const shaders: Record<ShaderType, ShaderNodeObject<Node>> = {
		'Random Noise': Fn( () => {

			const { seed } = effectController;

			const center = uv().sub( 0.5 );
			const pixelCoord = center.mul( viewportSize );

			return vec3( randomFn( pixelCoord.div( seed ) ) );

		} )(),

		'Block Noise': Fn( () => {

			const { seed } = effectController;

			const center = uv().sub( 0.5 );
			const pixelCoord = center.mul( viewportSize );

			return vec3( BlockyNoise( pixelCoord.div( seed ) ) );

		} )(),

	};

	material.colorNode = shaders[ effectController[ 'Current Shader' ] ];

	const quad = new THREE.Mesh( geometry, material );
	scene.add( quad );

	renderer = new THREE.WebGPURenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	document.body.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize );

	gui = new GUI();
	gui.add( effectController, 'Current Shader', Object.keys( shaders ) ).onChange( () => {

		console.log( effectController[ 'Current Shader' ] );

		material.colorNode = shaders[ effectController[ 'Current Shader' ] ];
		material.needsUpdate = true;

	} );
	gui.add( effectController.seed, 'value', 1.0, 30.0 ).name( 'seed' );

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
