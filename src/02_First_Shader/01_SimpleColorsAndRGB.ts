/* eslint-disable compat/compat */
import * as THREE from 'three';
import { vec3, Fn, uniform } from 'three/tsl';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MeshBasicNodeMaterial, WebGPURenderer } from 'three/webgpu';

import { ShaderMaterial } from 'three';

let renderer, camera, scene, gui;

const getShaderMaterial = async () => {

	const vsh = await fetch( './vertex-shader.glsl' );
	const fsh = await fetch( './shaders/fragment-shader.glsl' );

	const colorShader = new ShaderMaterial( {
		uniforms: {
			red: { value: 1.0 },
			green: { value: 1.0 },
			blue: { value: 1.0 }
		},
		vertexShader: await vsh.text(),
		fragmentShader: await fsh.text()
	} );

	return colorShader;

};

const init = () => {

	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	scene = new THREE.Scene();
	const geometry = new THREE.PlaneGeometry( 2, 2 );
	const material = new MeshBasicNodeMaterial();

	const effectController = {
		red: uniform( 1.0 ),
		green: uniform( 1.0 ),
		blue: uniform( 1.0 )
	};

	const shaderMaterialColorShader = getShaderMaterial();

	material.colorNode = Fn( () => {

		const { red, green, blue } = effectController;

		return vec3( red, green, blue );

	} )();

	const quad = new THREE.Mesh( geometry, material );
	scene.add( quad );

	renderer = new WebGPURenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	document.body.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize );

	gui = new GUI();
	gui.add( effectController.red, 'value', 0.0, 1.0 ).name( 'red' );
	gui.add( effectController.green, 'value', 0.0, 1.0 ).name( 'green' );
	gui.add( effectController.blue, 'value', 0.0, 1.0 ).name( 'blue' );

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
