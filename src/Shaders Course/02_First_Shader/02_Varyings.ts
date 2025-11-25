import * as THREE from 'three';
import { MeshBasicNodeMaterial, Node } from 'three/webgpu';
import { vec3, Fn, uv } from 'three/tsl';
import { App } from '../../utils/App';


type EffectType = 'Show UV X' | 'Show UV Y' | 'Show UV' | 'Homework'

class Varyings extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );
		const material = new MeshBasicNodeMaterial();

		const effectNames: EffectType[] = [
			'Homework',
			'Show UV',
			'Show UV X',
			'Show UV Y',
		];

		// three/src/nodes/accessors/UV.js
		// export const uv = ( index ) => attribute( 'uv' + ( index > 0 ? index : '' ), 'vec2' );

		const effects: Record<EffectType, Node> = {
			'Show UV X': Fn( () => {

				const vUV = uv();

				return vec3( vUV.x );

			} )(),

			'Show UV Y': Fn( () => {

				const vUV = uv();

				return vec3( vUV.y );

			} )(),

			'Show UV': Fn( () => {

				return vec3( uv(), 0.0 );

			} )(),

			'Homework': Fn( () => {

				const vUv = uv();

				return vec3( vUv.y, 0.0, vUv.x );


			} )(),

		};

		const effectController: Record<string, EffectType> = {
			effect: 'Show UV X'
		};

		material.colorNode = effects[ 'Homework' ];

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		this.DebugGui.add( effectController, 'effect', effectNames ).onChange( () => {

			material.colorNode = effects[ effectController.effect ];
			material.needsUpdate = true;

		} );

	}

}

const APP_ = new Varyings();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Varyings',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
