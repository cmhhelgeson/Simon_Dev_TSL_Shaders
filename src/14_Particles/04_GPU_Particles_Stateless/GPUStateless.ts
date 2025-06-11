import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { App } from '../utils/App';
import * as THREE from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { attribute, float } from 'three/tsl';


class GPGPUProject extends App {

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		await this.loadRGBE( './resources/moonless_golf_2k.hdr' );
		await this.#setupGPUParticlesStateless();

	}

	async #setupGPUParticlesStateless() {

		const numParticles = 100;

		const positions = new Float32Array( numParticles * 3 );

		for ( let i = 0; i < numParticles; i ++ ) {

			positions[ i * 3 ] = i;
			positions[ i * 3 + 1 ] = 0;
			positions[ i * 3 + 2 ] = 0;

		}

		const material = new PointsNodeMaterial( {
			positionNode: attribute( 'instancePosition' ),
			depthWrite: false,
			depthTest: true,
			sizeNode: float( 10 ),
		} );

		const mesh = new THREE.Sprite( material );
		mesh.geometry.setAttribute( 'instancePosition', new THREE.InstancedBufferAttribute( positions, 3 ) );
		material.needsUpdate = true;
		mesh.count = numParticles;

		this.Scene.add( mesh );

	}

	onStep( dt: number, totalTimeElapsed: number ) {


	}

}

const APP_ = new GPGPUProject();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: false,
		projectName: 'GPGPU Particles'
	} );

} );
