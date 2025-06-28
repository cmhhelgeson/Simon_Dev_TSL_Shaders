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
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { SDFCircle, DrawGrid } from './util';
import { App } from '../utils/App';
import { MeshBasicNodeMaterial } from 'three/webgpu';

class SimpleShapes extends App {

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();

		const effectController = {
			cellWidth: uniform( 15 ),
			lineWidth: uniform( 1.0 ),
			vignetteColorMin: uniform( 0.3 ),
			vignetteColorMax: uniform( 1.0 ),
			vignetteRadius: uniform( 1.0 ),
			lightFallOff: uniform( 0.3 ),
			circleRadius: uniform( 250 ),
			functionMode: uniform( 0 ),
			'Display Function': 'CEIL',
		};
		const black = vec3( 0.0, 0.0, 0.0 );
		const green = vec3( 0.0, 1.0, 0.0 );

		const drawBackgroundColor = () => {

			const {
				vignetteColorMin,
				vignetteColorMax,
				vignetteRadius,
				lightFallOff,
			} = effectController;

			// Get the distance from the center of the uvs
			const distFromCenter = length( abs( uv().sub( 0.5 ) ) );
			// Move distance from range [0, 0.5] to range [1.0, 0.5]/[0.5, 1.0]
			const vignette = float( 1.0 ).sub( distFromCenter );
			vignette.assign( smoothstep( vignetteRadius.oneMinus(), lightFallOff.oneMinus(), vignette ) );
			return vec3( remap( vignette, 0.0, 1.0, vignetteColorMin, vignetteColorMax ) );

		};

		material.colorNode = Fn( () => {

			const { cellWidth, lineWidth, circleRadius } = effectController;

			const vUv = uv();

			// Create baseline color
			const color = vec3( 0.9 ).toVar( 'color' );
			const center = vUv.sub( 0.5 );
			// Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
			const viewportPosition = center.mul( viewportSize );

			const circleDistance = SDFCircle( viewportPosition, circleRadius );

			color.assign( drawBackgroundColor() );
			color.assign( DrawGrid( viewportPosition, color, vec3( 0.5 ), cellWidth, lineWidth ) );
			color.assign( DrawGrid( viewportPosition, color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
			color.assign( mix( green, color, step( 0.0, circleDistance ) ) );


			return color;

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		this.DebugGui.add( effectController.circleRadius, 'value', 1.0, 500.0 ).step( 1.0 ).name( 'circleRadius' );
		const vignetteFolder = this.DebugGui.addFolder( 'Vignette' );
		vignetteFolder.add( effectController.vignetteColorMin, 'value', 0.0, 0.5 ).step( 0.01 ).name( 'vignetteColorMin' );
		vignetteFolder.add( effectController.vignetteColorMax, 'value', 0.5, 1.0 ).step( 0.01 ).name( 'vignetteColorMax' );
		vignetteFolder.add( effectController.vignetteRadius, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'vignetteRadius' );
		vignetteFolder.add( effectController.lightFallOff, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'lightFallOff' );

	}

}

const APP_ = new SimpleShapes();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Simple Shapes',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );


