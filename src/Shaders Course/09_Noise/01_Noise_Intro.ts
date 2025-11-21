import * as THREE from 'three';
import {
	fract,
	float,
	Fn,
	vec2,
	viewportSize,
	uv,
	vec3,
	floor,
	mix,
	uniform,
} from 'three/tsl';

import { MeshBasicNodeMaterial, Node } from 'three/webgpu';
import { App } from '../../utils/App';

type ShaderType =
  'Random Noise' |
  'Block Noise';

class NoiseIntro extends App {

	async onSetupProject(): Promise<void> {

		const effectController = {
			seed: uniform( 16.0 ),
			'Current Shader': 'Random Noise'
		};

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();

		const randomFn = Fn( ( [ positionNode ] ) => {

			const p = float( 50.0 ).mul( fract( positionNode.mul( 0.3183099 ).add( vec2( 0.71, 0.113 ) ) ) );

			const fractCalc = fract( p.x.mul( p.y ).mul( p.x.add( p.y ) ) );
			return float( - 1.0 ).add( float( 2.0 ).mul( fractCalc ) );

		}, { positionNode: 'vec2', return: 'float' } );

		const BlockyNoise = Fn( ( [ position ] ) => {

			const i = floor( position );
			const f = fract( position );

			const u = f.mul( f ).mul( float( 3.0 ).sub( f.mul( 2.0 ) ) );

			const mix1 = mix(
				randomFn( i.add( vec2( 0.0, 0.0 ) ) ),
				randomFn( i.add( vec2( 1.0, 0.0 ) ) ),
				u.x
			);

			const mix2 = mix(
				randomFn( i.add( vec2( 0.0, 1.0 ) ) ),
				randomFn( i.add( vec2( 1.0, 1.0 ) ) ),
				u.x
			);

			return mix( mix1, mix2, u.y );

		}, { position: 'vec2', return: 'float' } );

		const shaders: Record<ShaderType, Node> = {
			'Random Noise': Fn( () => {

				const { seed } = effectController;

				const center = uv().sub( 0.5 );
				const pixelCoord = center.mul( viewportSize );

				return vec3( randomFn( pixelCoord.div( seed ) ) );

			} )(),

			'Block Noise': Fn( () => {

				const { seed } = effectController;

				const center = uv().sub( 0.5 );
				const pixelCoord = center.mul( viewportSize );

				return vec3( BlockyNoise( pixelCoord.div( seed ) ) );

			} )(),

		};

		material.colorNode = shaders[ effectController[ 'Current Shader' ] ];

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		this.DebugGui.add( effectController, 'Current Shader', Object.keys( shaders ) ).onChange( () => {

			console.log( effectController[ 'Current Shader' ] );

			material.colorNode = shaders[ effectController[ 'Current Shader' ] ];
			material.needsUpdate = true;

		} );
		this.DebugGui.add( effectController.seed, 'value', 1.0, 30.0 ).name( 'seed' );

	}

}

const APP_ = new NoiseIntro();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Chapter 9: Noise Intro',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );

