import * as THREE from 'three';
import {
	uniform,
	Fn,
	mix,
	sin,
	step,
	select,
	smoothstep,
	abs,
	uv,
	vec3,
	time,
} from 'three/tsl';
import { MeshBasicNodeMaterial, Node } from 'three/webgpu';

import { App } from '../../utils/App';

// step(edge, x): Generate a step function by comparing x to edge
// if (x < edge) return 0.0;
// return 1.0;

// mix(a, b, t)
// return a + t * (b - a);
// also known as lerp

// smoothstep(edge1, edge2, x): Returns a smooth Hermite interpolation between 0 and 1 if x is in
// the range [edge1, edge2]
// smoothstep(10.0, 20.0, 10.0) -> 0.0
// smoothstep(10.0, 20.0, 15.0) -> 0.5
// smoothstep(10.0, 20.0, 20.0) -> 1.0

type ShaderType = 'Step' | 'Smoothstep' | 'Mix' | 'Lines';

class StepMixSmoothstep extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();

		const effectController = {
			currentShader: 'Lines',
			// Step uniforms
			stepEdgeX: uniform( 0.5 ),
			stepEdgeY: uniform( 0.5 ),
			// Smoothstep uniforms
			smoothstepRangeStart: uniform( 0.012 ),
			smoothstepRangeEnd: uniform( 0.001 ),
		};

		const red = vec3( 1.0, 0.0, 0.0 );
		const blue = vec3( 0.0, 0.0, 1.0 );
		const white = vec3( 1.0, 1.0, 1.0 );

		const shaders: Record<ShaderType, Node> = {

			'Step': Fn( () => {

				const { stepEdgeX, stepEdgeY } = effectController;

				const vUv = uv();

				const color = vec3( step( stepEdgeX, sin( vUv.x ) ).mul( step( stepEdgeY, vUv.y ) ) );

				return color;


			} )(),

			'Mix': Fn( () => {

				return mix( vec3( 1.0, 0.0, 0.0 ), vec3( 0.0, 0.0, 1.0 ), sin( time ) );


			} )(),

			'Smoothstep': Fn( () => {

				const { smoothstepRangeStart, smoothstepRangeEnd } = effectController;

				return smoothstep( smoothstepRangeStart, smoothstepRangeEnd, abs( uv().y.sub( 0.5 ) ) );


			} )(),

			'Lines': Fn( () => {

				const vUv = uv();
				// Create line exactly as we did in last shader
				const line = smoothstep( 0.0, 0.005, abs( vUv.y.sub( 0.5 ) ) );
				const value1 = vUv.x;
				const value2 = smoothstep( 0.0, 1.0, vUv.x );
				const linearLine = smoothstep( 0.0, 0.005, abs( vUv.y.sub( mix( 0.5, 1.0, value1 ) ) ) );
				const smoothstepLine = smoothstep( 0.0, 0.005, abs( vUv.y.sub( mix( 0.0, 0.5, value2 ) ) ) );

				const color = select( vUv.y.greaterThan( 0.5 ), mix( red, blue, vUv.x ), mix( blue, red, vUv.x ) ).toVar( 'color' );
				color.assign( mix( white, color, line ) );
				color.assign( mix( white, color, linearLine ) );
				color.assign( mix( white, color, smoothstepLine ) );

				return color;


			} )(),


		};

		material.colorNode = shaders[ effectController.currentShader as ShaderType ];

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		this.DebugGui.add( effectController, 'currentShader', Object.keys( shaders ) ).onChange( () => {

			material.colorNode = shaders[ effectController.currentShader as ShaderType ];
			material.needsUpdate = true;

		} );
		const stepFolder = this.DebugGui.addFolder( 'Step Shader' );
		stepFolder.add( effectController.stepEdgeX, 'value', 0, 1.0 ).name( 'stepEdgeX' );
		stepFolder.add( effectController.stepEdgeY, 'value', 0, 1.0 ).name( 'stepEdgeY' );
		const smoothstepFolder = this.DebugGui.addFolder( 'Smoothstep Shader' );
		smoothstepFolder.add( effectController.smoothstepRangeStart, 'value', 0.001, 0.5, 0.001 ).name( 'Range Start' );
		smoothstepFolder.add( effectController.smoothstepRangeEnd, 'value', 0.001, 0.5, 0.001 ).name( 'Range End' );

	}

}

const APP_ = new StepMixSmoothstep();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Step, Mix, Smoothstep',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
