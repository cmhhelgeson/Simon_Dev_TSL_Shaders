import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { App } from '../../../utils/App';
import * as THREE from 'three';
import { PointsNodeMaterial, SpriteNodeMaterial } from 'three/webgpu';
import { attribute, float, vec3 } from 'three/tsl';


class GPGPUProject extends App {

	#shaders = {};

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		await this.loadHDRBackground( './resources/moonless_golf_2k.hdr' );
		this.Camera.position.z = 4;
		await this.#setupGPUParticlesStateless();

		this.setDPR( 0.5 );

	}


	async #setupGPUParticlesStateless() {

		const pointMaterial = new PointsNodeMaterial( { positionNode: vec3( 1, 1, 1 ), sizeNode: float( 10.0 ) } );
		const mesh = new THREE.Sprite( pointMaterial );
		this.Scene.add( mesh );

	}


}

const APP_ = new GPGPUProject();
const rendererType = 'WebGPU';
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: true,
		projectName: `${rendererType} GPGPU Particles`,
		rendererType: rendererType,
		initialCameraMode: 'perspective'
	} );

} );
