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
	negate,
	min,
	dot,
	vec2,
	clamp,
	sign,
	If,
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { DrawGrid, SDFBox, SDFCircle } from './util';
import { MeshBasicNodeMaterial, WebGPURenderer } from 'three/webgpu';
import { App } from '../utils/App';

let renderer, camera, scene, gui;

enum ShapeEnum {
	CIRCLE,
	BOX,
	HEXAGON
}

class Antialiasing extends App {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	#settings: any;

	async onSetupProject( ): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();

		this.#settings = {
			shape: 'CIRCLE',
			shapeUniform: uniform( 0 ).label( 'shapeUniform' ),
			cellWidth: uniform( 15 ),
			lineWidth: uniform( 1.0 ),
			vignetteColorMin: uniform( 0.3 ),
			vignetteColorMax: uniform( 1.0 ),
			vignetteRadius: uniform( 1.0 ),
			lightFallOff: uniform( 0.3 ),
			circleRadius: uniform( 250 ),
			antialiasRange: uniform( 1.0 ),
		};
		const red = vec3( 1.0, 0.0, 0.0 );
		const black = vec3( 0.0, 0.0, 0.0 );

		const drawBackgroundColor = () => {

			const {
				vignetteColorMin,
				vignetteColorMax,
				vignetteRadius,
				lightFallOff,
			} = this.#settings;

			// Get the distance from the center of the uvs
			const distFromCenter = length( abs( uv().sub( 0.5 ) ) );
			// Move distance from range [0, 0.5] to range [1.0, 0.5]/[0.5, 1.0]
			const vignette = float( 1.0 ).sub( distFromCenter );
			vignette.assign( smoothstep( vignetteRadius.oneMinus(), lightFallOff.oneMinus(), vignette ) );
			return vec3( remap( vignette, 0.0, 1.0, vignetteColorMin, vignetteColorMax ) );

		};

		const sdfHexagon = ( pNode, rNode ) => {

			const k = vec3( - 0.866025404, 0.5, 0.577350269 );
			pNode.assign( abs( pNode ) );
			const minCalc = min( dot( k.xy, pNode ), 0.0 );
			pNode.subAssign( minCalc.mul( k.xy ).mul( 2.0 ) );
			pNode.subAssign( vec2( clamp( pNode.x, negate( k.z ).mul( rNode ), k.z.mul( rNode ) ), rNode ) );
			return length( pNode ).mul( sign( pNode.y ) );

		};


		material.colorNode = Fn( () => {

			const {
				cellWidth,
				shapeUniform,
				lineWidth,
				circleRadius,
				antialiasRange
			} = this.#settings;

			const vUv = uv();

			// Create baseline color
			const color = vec3( 0.9 ).toVar( 'color' );
			const center = vUv.sub( 0.5 );
			// Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
			const viewportPosition = center.mul( viewportSize );

			const sdfDistance = float( 0.0 ).toVar( 'sdfDistance' );

			If( shapeUniform.equal( ShapeEnum.CIRCLE ), () => {

				sdfDistance.assign( SDFCircle( viewportPosition, circleRadius ) );

			} ).ElseIf( shapeUniform.equal( ShapeEnum.BOX ), () => {

				sdfDistance.assign( SDFBox( viewportPosition, vec2( circleRadius, 50.0 ) ) );

			} ).ElseIf( shapeUniform.equal( ShapeEnum.HEXAGON ), () => {

				sdfDistance.assign( sdfHexagon( viewportPosition, circleRadius ) );

			} );

			color.assign( drawBackgroundColor() );
			color.assign( DrawGrid( viewportPosition, color, vec3( 0.5 ), cellWidth, lineWidth ) );
			color.assign( DrawGrid( viewportPosition, color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
			color.assign( mix( red, color, smoothstep( negate( antialiasRange ), antialiasRange, sdfDistance ) ) );


			return color;

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		this.DebugGui.add( this.#settings, 'shape', [ 'CIRCLE', 'BOX', 'HEXAGON' ] ).onChange( () => {

			const value = ShapeEnum[ this.#settings.shape ];
			console.log( value );

			this.#settings.shapeUniform.value = ShapeEnum[ this.#settings.shape ];
			material.needsUpdate = true;

		} );
		this.DebugGui.add( this.#settings.circleRadius, 'value', 1.0, 500.0 ).step( 1.0 ).name( 'sdfSize' );
		this.DebugGui.add( this.#settings.antialiasRange, 'value', 0.1, 5.0 ).step( 10.0 ).name( 'antialiasRange' );
		const vignetteFolder = this.DebugGui.addFolder( 'Vignette' );
		vignetteFolder.add( this.#settings.vignetteColorMin, 'value', 0.0, 0.5 ).step( 0.01 ).name( 'vignetteColorMin' );
		vignetteFolder.add( this.#settings.vignetteColorMax, 'value', 0.5, 1.0 ).step( 0.01 ).name( 'vignetteColorMax' );
		vignetteFolder.add( this.#settings.vignetteRadius, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'vignetteRadius' );
		vignetteFolder.add( this.#settings.lightFallOff, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'lightFallOff' );

	}

}

const APP_ = new Antialiasing();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Antialiasing',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );



