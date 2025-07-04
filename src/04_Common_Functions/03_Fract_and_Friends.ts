import * as THREE from 'three';
import { fract, Fn, mix, If, round, ceil, viewportSize, floor, uniform, max, smoothstep, abs, uv, vec3 } from 'three/tsl';

import { App } from '../utils/App';
import { MeshBasicNodeMaterial } from 'three/webgpu';

// abs(a) - returns the absolute value of a
// return a < 0 > -a : a;

// floor(a)
// return nearest integer value of 'a' that's less than or equal to 'a'

// ceil(a)
// return nearest integer value of 'a' that's less than or equal to 'a'

// fract(a)
// return fractional part of 'a'

// mod(x, y)
// return x modulo y.

enum FunctionMode {
	CEIL,
	FLOOR,
	ROUND,
	FRACT,
}
class FractAndFriends extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();

		const effectController = {
			cellWidth: uniform( 100 ),
			lineWidth: uniform( 1.0 ),
			functionMode: uniform( 0 ),
			'Display Function': 'CEIL',
		};
		const red = vec3( 1.0, 0.0, 0.0 );
		const blue = vec3( 0.0, 0.0, 1.0 );
		const yellow = vec3( 1.0, 1.0, 0.0 );
		const black = vec3( 0.0, 0.0, 0.0 );

		material.colorNode = Fn( () => {

			const { cellWidth, lineWidth, functionMode } = effectController;

			const vUv = uv();

			// Create baseline color
			// Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
			const center = vUv.sub( 0.5 );
			const color = vec3( 0.9 ).toVar( 'color' );
			const pos = center.mul( viewportSize ).div( cellWidth );
			// Create a grid of cells of size 'cellWidth' normalized to the viewportSize.
			const scaledCell = center.mul( viewportSize ).div( cellWidth );
			// Access each individual cell's uv space.
			const cellUV = fract( scaledCell );

			// Move center of each cell (0, 0) from bottom-left to the middle.
			cellUV.assign( abs( cellUV.sub( 0.5 ) ) );

			// Max distance from a given point within the cell to any side.
			const distToCellWall = max( cellUV.x, cellUV.y );

			const scaledDist = ( lineWidth.add( 1.0 ) ).mul( distToCellWall ).oneMinus();
			const ceilLine = smoothstep( 0.0, 0.05, scaledDist );

			const xAxis = smoothstep( 0, 0.002, abs( vUv.y.sub( 0.5 ) ) );
			const yAxis = smoothstep( 0, 0.002, abs( vUv.x.sub( 0.5 ) ) );

			const createFunctionLine = ( xVal ) => {

				return smoothstep( 0.0, 0.075, abs( pos.y.sub( xVal ) ) );

			};

			const functionLine = smoothstep( 0.0, 0.075, abs( pos.y.sub( pos.x ) ) );
			const ceilFunctionLine = createFunctionLine( ceil( pos.x ) );
			const floorFunctionLine = createFunctionLine( floor( pos.x ) );
			const roundFunctionLine = createFunctionLine( round( pos.x ) );
			const fractFunctionLine = createFunctionLine( fract( pos.x ) );
			//const cellUVShift = cellUV.add( - 100 );
			//const diagonalLine = smoothstep( 0, 0.005, abs( cellUVShift.y.sub( cellUVShift.x ) ) );

			color.assign( mix( black, color, ceilLine ) );
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

		this.DebugGui.add( effectController.cellWidth, 'value', 1, 100 ).step( 1 ).name( 'Cell Width (px)' );
		this.DebugGui.add( effectController.lineWidth, 'value', 1.0, 8.0 ).name( 'Line Width' );
		this.DebugGui.add( effectController, 'Display Function', [ 'CEIL', 'FLOOR', 'ROUND', 'FRACT' ] ).onChange( () => {

			effectController.functionMode.value = FunctionMode[ effectController[ 'Display Function' ] ];

		} );

	}

}

const APP_ = new FractAndFriends();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Chapter 4: Fract and Friends',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
