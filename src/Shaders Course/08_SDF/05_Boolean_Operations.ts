import * as THREE from 'three';
import { MeshBasicNodeMaterial, Node } from 'three/webgpu';
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
	max,
	negate,
	min,
	vec2,
	If,
	rotate,
	uint,
	time,
} from 'three/tsl';

import { DrawGrid, SDFBox } from './util';
import { App } from '../../utils/App';
import { sdfCircle } from '../../utils/tsl/sdf/shapes';

enum BooleanEnum {
	UNION,
	INTERSECTION,
	SUBTRACTION
}

class BooleanOperations extends App {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	#settings: any;

	async onSetupProject( ): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();

		this.#settings = {
		// Boolean Op Uniforms
			currentOp: 'UNION',
			currentOpUniform: uniform( uint( 0 ) ),
			// Grid Uniforms
			cellWidth: uniform( 15 ),
			lineWidth: uniform( 1.0 ),
			// Vignette Uniforms
			vignetteColorMin: uniform( 0.3 ),
			vignetteColorMax: uniform( 1.0 ),
			vignetteRadius: uniform( 1.0 ),
			lightFallOff: uniform( 0.3 ),
			// Antialias Uniforms
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

		// Annotating the destructured tuple is what steers Fn to its array-argument
		// overload; without it TypeScript matches the ( builder: NodeBuilder ) => ...
		// signature and every parameter degrades to an untyped node.
		type SDFPair = [ Node<'float'>, Node<'float'> ];

		const opUnion = /*@__PURE__*/ Fn( ( [ d1, d2 ]: SDFPair ) => {

			return min( d1, d2 );

		}, { d1: 'float', d2: 'float', return: 'float' } );

		const opIntersection = Fn( ( [ d1, d2 ]: SDFPair ) => {

			return max( d1, d2 );

		}, { d1: 'float', d2: 'float', return: 'float' } );

		// Subtracts d1 from d2, matching the call convention used in 06_Cloudy_Day.
		const opSubtraction = Fn( ( [ d1, d2 ]: SDFPair ) => {

			return max( negate( d1 ), d2 );

		}, { d1: 'float', d2: 'float', return: 'float' } );

		material.colorNode = Fn( () => {

			const {
				cellWidth,
				lineWidth,
				antialiasRange,
				currentOpUniform
			} = this.#settings;

			const vUv = uv();

			// Create baseline color
			const color = vec3( 0.9 ).toVar( 'color' );
			const center = vUv.sub( 0.5 );
			// Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
			const viewportPosition = center.mul( viewportSize );

			const offsetFromViewportX = viewportSize.x.div( 4 );

			// Must be a var in this scope. An Fn call materialises as a variable
			// whose declaration is hoisted to function scope but whose assignment
			// is emitted wherever the node is first built - here, the first If
			// branch. The remaining branches would read it still zero-initialised,
			// so SUBTRACTION would compute max( -0, d ) and merely flatten the
			// circles to d = 0 instead of carving the box out of them.
			const boxD = SDFBox( rotate( viewportPosition, time ), vec2( 200.0, 100.0 ) ).toVar( 'boxD' );
			const d1 = sdfCircle( viewportPosition.sub( vec2( negate( offsetFromViewportX ), - 150.0 ) ), float( 150.0 ) );
			const d2 = sdfCircle( viewportPosition.sub( vec2( offsetFromViewportX, - 150.0 ) ), float( 150.0 ) );
			const d3 = sdfCircle( viewportPosition.sub( vec2( 0, 200.0 ) ), float( 150.0 ) );

			const d = opUnion( opUnion( d1, d2 ), d3 ).toVar( 'd' );

			If( currentOpUniform.equal( 0 ), () => {

				d.assign( opUnion( boxD, d ) );

			} ).ElseIf( currentOpUniform.equal( 1 ), () => {

				d.assign( opIntersection( boxD, d ) );

			} ).Else( () => {

				d.assign( opSubtraction( boxD, d ) );

			} );


			color.assign( drawBackgroundColor() );
			color.assign( DrawGrid( center.mul( viewportSize ), color, vec3( 0.5 ), cellWidth, lineWidth ) );
			color.assign( DrawGrid( center.mul( viewportSize ), color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );
			color.assign( mix( red, color, smoothstep( negate( antialiasRange ), antialiasRange, d ) ) );


			return color;

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		const gui = this.Inspector.createParameters( 'Boolean Operations' );
		gui.add( this.#settings, 'currentOp', [ 'UNION', 'INTERSECTION', 'SUBTRACTION' ] ).onChange( () => {

			this.#settings.currentOpUniform.value = BooleanEnum[ this.#settings.currentOp ];

		} );
		gui.add( this.#settings.antialiasRange, 'value', 0.1, 5.0 ).step( 0.1 ).name( 'antialiasRange' );

	}

}

const APP_ = new BooleanOperations();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Boolean Operations',
		debug: false,
		withInspector: true,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
