import * as THREE from 'three';
import {
	length,
	smoothstep,
	float,
	Fn,
	mix,
	viewportSize,
	uniform,
	abs,
	uv,
	vec3,
	remap,
	step,
	vec2,
	rotate,
	sin,
	time
} from 'three/tsl';

import { DrawGrid, SDFBox } from './util';

let renderer, camera, scene;

const init = async () => {

	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	scene = new THREE.Scene();
	const geometry = new THREE.PlaneGeometry( 2, 2 );

	const material = new THREE.MeshBasicNodeMaterial();

	const effectController = {
		cellWidth: uniform( 15 ),
		lineWidth: uniform( 1.0 ),
		vignetteColorMin: uniform( 0.3 ),
		vignetteColorMax: uniform( 1.0 ),
		vignetteRadius: uniform( 1.0 ),
		lightFallOff: uniform( 0.3 ),
		circleRadius: uniform( 250 ),
		boxX: uniform( 0.0 ),
		boxY: uniform( 0.0 ),
		functionMode: uniform( 0 ),
		'Display Function': 'CEIL',
	};
	const black = vec3( 0.0, 0.0, 0.0 );
	const green = vec3( 0.0, 1.0, 0.0 );

	const DrawBackgroundColor = Fn( ( [ inputUV ] ) => {

		const {
			vignetteColorMin,
			vignetteColorMax,
			vignetteRadius,
			lightFallOff,
		} = effectController;

		// Get the distance from the center of the uvs
		const distFromCenter = length( abs( inputUV.sub( 0.5 ) ) );
		// Move distance from range [0, 0.5] to range [1.0, 0.5]/[0.5, 1.0]
		const vignette = float( 1.0 ).sub( distFromCenter );
		vignette.assign( smoothstep( vignetteRadius.oneMinus(), lightFallOff.oneMinus(), vignette ) );
		return vec3( remap( vignette, 0.0, 1.0, vignetteColorMin, vignetteColorMax ) );

	} ).setLayout( {
		name: 'DrawBackgroundColor',
		type: 'vec3',
		inputs: [
			{ name: 'inputUV', type: 'vec2' }
		],
	} );

	material.colorNode = Fn( () => {

		const { cellWidth, lineWidth, boxX, boxY } = effectController;

		const vUv = uv();

		// Create baseline color
		const color = vec3( 0.9 ).toVar( 'color' );
		const center = vUv.sub( 0.5 );
		// Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
		const viewportPosition = center.mul( viewportSize );

		const moveBox = viewportPosition.sub( vec2( boxX, boxY ) );
		const rotateBox = rotate( moveBox, mix( - 3.0, 3.0, sin( time ) ) );
		const boxDistance = SDFBox( rotateBox, vec2( 200.0, 50.0 ) );

		color.assign( DrawBackgroundColor( uv() ) );
		color.assign( DrawGrid( viewportPosition, color, vec3( 0.5 ), cellWidth, lineWidth ) );
		color.assign( DrawGrid( viewportPosition, color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
		color.assign( mix( green, color, step( 0.0, boxDistance ) ) );

		return color;

	} )();

	const quad = new THREE.Mesh( geometry, material );
	scene.add( quad );

	renderer = new THREE.WebGPURenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	document.body.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize );

	window.addEventListener( 'mousemove', ( e ) => {

		const { offsetX, offsetY } = e;
		const { boxX, boxY } = effectController;

		boxX.value = offsetX - window.innerWidth / 2;
		boxY.value = window.innerHeight - offsetY - window.innerHeight / 2;

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
