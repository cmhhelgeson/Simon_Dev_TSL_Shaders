import * as THREE from 'three';
import {
	texture,
	uv,
	Fn,
	remap,
	uniform,
	pass,
	vec3,
	color,
	dot,
	mix,
	saturate
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MeshBasicNodeMaterial, PostProcessing, WebGPURenderer } from 'three/webgpu';

let renderer, camera, scene, gui;

// Post Processing Outputs
let postScene, postColor;

const effectController = {
	remapUVXBegin: uniform( 0.25 ),
	remapUVXEnd: uniform( 0.75 ),
	bleachOpacity: uniform( 0.8 ),
	testVal: uniform( 0.5 ),
	tintColor: color( 1.0, 0.5, 0.5 ),
	saturation: uniform( 1.312 ),
	brightness: uniform( - 0.2 ),
	contrast: uniform( 1.2 ),
	midpoint: uniform( - 0.01 )
};

const postProcessFunction = Fn( ( [ color ] ) => {

	const { midpoint, brightness, saturation, contrast } = effectController;

	const c = vec3( color ).toVar( 'inputColor' );

	//Tinting
	//c.mulAssign( effectController.tintColor );

	//Brightness
	c.addAssign( brightness );

	//Saturation (accounting for relative brightness of each color)
	const luminance = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
	c.assign( mix( vec3( luminance ), c, saturation ) );

	// Alt Contrast
	//const sg = sign( c.y.sub( midpoint ) ).toVar( 'sg' );
	//const b = abs( c.sub( midpoint ) ).mul( 2 ).toVar( 'b' );
	//const k = float( 1.0 ).div( contrast );
	//c.assign(
	//  sg.mul( pow(
	//    b, vec3( k )
	//  ) ).mul( 0.5 ).add( 0.5 )
	//);
	c.assign( saturate( c.sub( midpoint ) ).mul( contrast ).add( midpoint ) );

	return c;


} );

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
	postColor = new PostProcessing( renderer );

	const scenePass = pass( scene, camera );
	postScene.outputNode = scenePass;
	postColor.outputNode = postProcessFunction( scenePass );

	window.addEventListener( 'resize', onWindowResize );

	gui = new GUI();
	gui.add( effectController.remapUVXBegin, 'value', 0.01, 0.9 ).name( 'remapXBegin' );
	gui.add( effectController.remapUVXEnd, 'value', 0.01, 0.9 ).name( 'remapXEnd' );
	const postProcessingFolder = gui.addFolder( 'Post Processing' );
	postProcessingFolder.add( effectController.saturation, 'value', 0.0, 2.0 ).name( 'saturation' );
	postProcessingFolder.add( effectController.brightness, 'value', - 1.0, 1.0 ).step( 0.1 ).name( 'brightness' );
	postProcessingFolder.add( effectController.contrast, 'value', 0.0, 2.0 ).step( 0.1 ).name( 'contrast' );
	postProcessingFolder.add( effectController.midpoint, 'value', - 1.0, 1.0 ).step( 0.01 ).name( 'midpoint' );


};

const onWindowResize = () => {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

};

function animate() {

	// Altering the code a bit to work within a more typical postProcessing context
	const halfWidth = window.innerWidth / 2;

	renderer.setViewport( 0, 0, halfWidth, window.innerHeight );

	postScene.render();

	renderer.autoClear = false;

	renderer.setViewport( halfWidth, 0, halfWidth, window.innerHeight );
	postColor.render();

	renderer.autoClear = true;


}

init();
