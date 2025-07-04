import * as THREE from 'three';
import {
	texture,
	uv,
	Fn,
	remap,
	uniform,
	vec3,
	color,
	dot,
	mix,
	saturate,
	smoothstep,
	normalize,
	pow,
	fract,
	vec2,
	abs,
	uint,
	length,
	sin,
	time,
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { pixelationPass } from 'three/examples/jsm/tsl/display/PixelationPassNode.js';
import { MeshBasicNodeMaterial, PostProcessing, WebGPURenderer } from 'three/webgpu';

let renderer, camera, scene, gui;

// Post Processing Outputs
let postScene, postColor;

// TODO: Modify ripple to always be in center of screen irrespective of remapped x range
const effectController = {
	remapUVXBegin: uniform( 0.0 ),
	remapUVXEnd: uniform( 1.0 ),
	bleachOpacity: uniform( 0.8 ),
	testVal: uniform( 0.5 ),
	tintColor: color( 1.0, 0.5, 0.5 ),
	saturation: uniform( 1.312 ),
	brightness: uniform( - 0.2 ),
	contrast: uniform( 1.2 ),
	midpoint: uniform( - 0.01 ),
	colorWeightPower: uniform( 32 ),
	pixelSize: uniform( uint( 1 ) ),
	rippleRingSize: uniform( 50 ),
	rippleSpeed: uniform( 2 ),
	rippleStrength: uniform( 0.01 ),
	mouseX: uniform( 0.5 ),
	mouseY: uniform( 0.5 ),
};

const postProcessFunction = Fn( ( [ color ] ) => {

	const { midpoint, brightness, saturation, contrast, colorWeightPower } = effectController;

	const c = vec3( color ).toVar( 'inputColor' );

	// Tinting

	//c.mulAssign( effectController.tintColor );

	// Brightness

	c.addAssign( brightness );

	// Saturation (accounting for relative brightness of each color)

	const luminance = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
	c.assign( mix( vec3( luminance ), c, saturation ) );
	c.assign( saturate( c.sub( midpoint ) ).mul( contrast ).add( midpoint ) );

	// Initial Color Boost

	//const refColor = vec3( 0.72, 0.25, 0.25 );
	//const colorWeight = float( 1.0 ).sub( distance( c, refColor ) ).toVar( 'colorWeight' );
	//colorWeight.assign( smoothstep( 0.45, 1.0, colorWeight ) );
	//c.assign( mix( vec3( luminance ), c, colorWeight ) );

	// Refined Color Boost

	const refColor = vec3( 0.72, 0.25, 0.25 );
	// The degree to which we desaturate is determined by the current color's similarity
	// to the reference color, which is then exponentiated by a value to refine it.
	const colorWeight = dot( normalize( c ), normalize( refColor ) ).toVar( 'colorWeight' );
	colorWeight.assign( pow( colorWeight, colorWeightPower ) );
	c.assign( mix( vec3( luminance ), c, colorWeight ) );

	const vignetteCoords = fract( uv().mul( vec2( 2.0, 1.0 ) ) );
	const remappedCoordsX = remap( abs( vignetteCoords.x.sub( 0.5 ) ), 0.0, 2.0, 2.0, 0.0 );
	const remappedCoordsY = remap( abs( vignetteCoords.y.sub( 0.5 ) ), 0.0, 1.0, 1.0, 0.0 );

	const v1 = smoothstep( 0.2, 0.5, remappedCoordsX );
	const v2 = smoothstep( 0.2, 0.5, remappedCoordsY );
	const vignetteAmount = v1.mul( v2 ).toVar( 'vignetteAmount' );
	vignetteAmount.assign( pow( vignetteAmount, 0.25 ) );
	vignetteAmount.assign( remap( vignetteAmount, 0.0, 1.0, 0.5, 1.0 ) );

	c.mulAssign( vignetteAmount );

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

		const { mouseX, mouseY, remapUVXBegin, remapUVXEnd, rippleRingSize, rippleSpeed, rippleStrength } = effectController;

		const vUv = uv().toVar( 'vUv' );

		vUv.x.assign( remap( vUv.x, 0.0, 1.0, remapUVXBegin, remapUVXEnd ) );

		const mousePos = vec2( mouseX, mouseY ).toVar( 'mousePos' );

		const distToCenter = length( vUv.sub( mousePos ) ).toVar( 'distToCenter' );
		const d = sin( distToCenter.mul( rippleRingSize ).sub( time.mul( rippleSpeed ) ) ).toVar( 'd' );
		const dir = normalize( vUv.sub( mousePos ) );
		const rippleCoords = vUv.add( d.mul( dir ).mul( rippleStrength ) );


		return texture( tomatoTexture, rippleCoords );

	} )();

	console.log( material );

	const quad = new THREE.Mesh( geometry, material );
	scene.add( quad );

	renderer = new WebGPURenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	document.body.appendChild( renderer.domElement );

	postScene = new PostProcessing( renderer );
	postColor = new PostProcessing( renderer );

	const scenePass = pixelationPass( scene, camera, effectController.pixelSize, uniform( 0 ), uniform( 0 ) );
	postScene.outputNode = scenePass;
	postColor.outputNode = postProcessFunction( scenePass );

	window.addEventListener( 'resize', onWindowResize );
	window.addEventListener( 'mousemove', onMouseMove );

	//const rawShader = await renderer.debug.getShaderAsync( scene, camera, quad );
	//console.log( rawShader );

	gui = new GUI();
	gui.add( effectController.remapUVXBegin, 'value', 0.01, 0.9 ).name( 'remapXBegin' );
	gui.add( effectController.remapUVXEnd, 'value', 0.01, 0.9 ).name( 'remapXEnd' );
	const rippleFolder = gui.addFolder( 'Ripple' );
	rippleFolder.add( effectController.rippleRingSize, 'value', 20, 200 ).step( 1 ).name( 'rippleRingSize' );
	rippleFolder.add( effectController.rippleSpeed, 'value', 0, 10 ).step( 1 ).name( 'rippleSpeed' );
	rippleFolder.add( effectController.rippleStrength, 'value', 0.00, 0.1 ).step( 0.001 ).name( 'rippleStrength' );
	const postProcessingFolder = gui.addFolder( 'Post Processing' );
	postProcessingFolder.add( effectController.saturation, 'value', 0.0, 2.0 ).name( 'saturation' );
	postProcessingFolder.add( effectController.brightness, 'value', - 1.0, 1.0 ).step( 0.1 ).name( 'brightness' );
	postProcessingFolder.add( effectController.contrast, 'value', 0.0, 2.0 ).step( 0.1 ).name( 'contrast' );
	postProcessingFolder.add( effectController.midpoint, 'value', - 1.0, 1.0 ).step( 0.01 ).name( 'midpoint' );
	// Change how specific the color boost is.
	postProcessingFolder.add( effectController.colorWeightPower, 'value', 1.0, 200.0 ).step( 1 ).name( 'colorWeightPower' );
	postProcessingFolder.add( effectController.pixelSize, 'value', 1, 20 ).step( 1 ).name( 'pixelSize' );


};

const onWindowResize = () => {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

};

const onMouseMove = ( e ) => {

	const { mouseX, mouseY } = effectController;

	// Terrible fract emulation
	if ( e.offsetX >= ( window.innerWidth / 2 ) ) {

		mouseX.value = ( e.offsetX / ( window.innerWidth / 2 ) ) - 1;

	} else {

		mouseX.value = ( e.offsetX / ( window.innerWidth / 2 ) );

	}

	mouseY.value = 1 - ( e.offsetY / window.innerHeight );

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
