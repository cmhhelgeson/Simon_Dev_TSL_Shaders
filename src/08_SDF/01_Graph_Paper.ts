import * as THREE from 'three';
import {
	fract,
	length,
	smoothstep,
	float,
	Fn,
	mix,
	If,
	round,
	ceil,
	viewportSize,
	floor,
	uniform,
	abs,
	uv,
	vec3,
	remap,
} from 'three/tsl';

import { DrawGrid } from './util';
import { App } from '../utils/App';
import { MeshBasicNodeMaterial } from 'three/webgpu';


enum FunctionMode {
	CEIL,
	FLOOR,
	ROUND,
	FRACT,
}

class GraphPaper extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();

		const effectController = {
			cellWidth: uniform( 100 ),
			lineWidth: uniform( 1.0 ),
			vignetteColorMin: uniform( 0.3 ),
			vignetteColorMax: uniform( 1.0 ),
			vignetteRadius: uniform( 1.0 ),
			lightFallOff: uniform( 0.3 ),
			functionMode: uniform( 0 ),
			'Display Function': 'CEIL',
		};
		const red = vec3( 1.0, 0.0, 0.0 );
		const blue = vec3( 0.0, 0.0, 1.0 );
		const yellow = vec3( 1.0, 1.0, 0.0 );
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

			const { cellWidth, lineWidth, functionMode } = effectController;

			const vUv = uv();

			// Create baseline color
			const color = vec3( 0.9 ).toVar( 'color' );
			const center = vUv.sub( 0.5 );
			// Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
			const gridPosition = center.mul( viewportSize ).div( cellWidth );

			color.assign( drawBackgroundColor() );
			color.assign( DrawGrid( center.mul( viewportSize ), color, vec3( 0.5 ), cellWidth, lineWidth ) );
			color.assign( DrawGrid( center.mul( viewportSize ), color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );

			const xAxis = smoothstep( 0, 0.002, abs( vUv.y.sub( 0.5 ) ) );
			const yAxis = smoothstep( 0, 0.002, abs( vUv.x.sub( 0.5 ) ) );

			const createFunctionLine = ( xVal ) => {

				return smoothstep( 0.0, 0.075, abs( gridPosition.y.sub( xVal ) ) );

			};

			const functionLine = smoothstep( 0.0, 0.075, abs( gridPosition.y.sub( gridPosition.x ) ) );
			const ceilFunctionLine = createFunctionLine( ceil( gridPosition.x ) );
			const floorFunctionLine = createFunctionLine( floor( gridPosition.x ) );
			const roundFunctionLine = createFunctionLine( round( gridPosition.x ) );
			const fractFunctionLine = createFunctionLine( fract( gridPosition.x ) );

			color.assign( mix( blue, color, xAxis ) );
			color.assign( mix( blue, color, yAxis ) );
			color.assign( mix( yellow, color, functionLine ) );

			If( functionMode.equal( FunctionMode.CEIL ), () => {

			    color.assign( mix( red, color, ceilFunctionLine ) );

			} );

			If( functionMode.equal( FunctionMode.FLOOR ), () => {

			    color.assign( mix( red, color, floorFunctionLine ) );

			} );

			If( functionMode.equal( FunctionMode.ROUND ), () => {

			    color.assign( mix( red, color, roundFunctionLine ) );

			} );

			If( functionMode.equal( FunctionMode.FRACT ), () => {

				color.assign( mix( red, color, fractFunctionLine ) );

			} );


			return color;

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		const gridFolder = this.DebugGui.addFolder( 'Grid' );
		gridFolder.add( effectController.cellWidth, 'value', 5, 200 ).step( 1 ).name( 'Cell Width (px)' );
		gridFolder.add( effectController.lineWidth, 'value', 1.0, 8.0 ).name( 'Line Width' );
		gridFolder.add( effectController, 'Display Function', [ 'CEIL', 'FLOOR', 'ROUND', 'FRACT' ] ).onChange( () => {

			effectController.functionMode.value = FunctionMode[ effectController[ 'Display Function' ] ];

		} );
		const vignetteFolder = this.DebugGui.addFolder( 'Vignette' );
		vignetteFolder.add( effectController.vignetteColorMin, 'value', 0.0, 0.5 ).step( 0.01 ).name( 'vignetteColorMin' );
		vignetteFolder.add( effectController.vignetteColorMax, 'value', 0.5, 1.0 ).step( 0.01 ).name( 'vignetteColorMax' );
		vignetteFolder.add( effectController.vignetteRadius, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'vignetteRadius' );
		vignetteFolder.add( effectController.lightFallOff, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'lightFallOff' );


	}

}

const APP_ = new GraphPaper();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Chapter 8: Graph Paper',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
