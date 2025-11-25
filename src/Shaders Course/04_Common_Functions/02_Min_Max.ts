import * as THREE from 'three';
import { uniform, Fn, mix, clamp, min, max, select, smoothstep, abs, uv, vec3 } from 'three/tsl';

import { App } from '../../utils/App';
import { MeshBasicNodeMaterial, Node } from 'three/webgpu';


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

type ShaderType = 'Lines';

class MinMax extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();

		const effectController = {
			currentShader: 'Lines',
			// Step uniforms
			clampMin: uniform( 0.25 ),
			clampMax: uniform( 0.75 )

		};

		const red = vec3( 1.0, 0.0, 0.0 );
		const blue = vec3( 0.0, 0.0, 1.0 );
		const white = vec3( 1.0, 1.0, 1.0 );

		const fakeClamp = ( val: Node | number, minVal: Node | number, maxVal: Node | number ) => {

			return min( maxVal, max( minVal, val ) );

		};

		const shaders: Record<ShaderType, Node> = {

			'Lines': Fn( () => {

				const { clampMin, clampMax } = effectController;

				const vUv = uv();
				// Create line exactly as we did in last shader
				const line = smoothstep( 0.0, 0.005, abs( vUv.y.sub( 0.5 ) ) );
				const value1 = clamp( vUv.x, clampMin, clampMax );
				const value2 = fakeClamp( smoothstep( 0.0, 1.0, vUv.x ), clampMin, clampMax );
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

		this.DebugGui.add( effectController.clampMin, 'value', 0.0, 1.0 ).name( 'clampMin' );
		this.DebugGui.add( effectController.clampMax, 'value', 0.0, 1.0 ).name( 'clampMax' );

	}

}

const APP_ = new MinMax();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Chapter 4: Min, Max',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
