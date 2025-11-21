import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { App } from '../../utils/App';
import * as THREE from 'three';
import { PointsNodeMaterial, SpriteNodeMaterial } from 'three/webgpu';
import { attribute, float } from 'three/tsl';


class GPGPUProject extends App {

	#shaders = {};

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		await this.loadRGBE( './resources/moonless_golf_2k.hdr' );
		this.Camera.position.z = 4;
		await this.#setupGPUParticlesStateless();
		this.setDPR( 0.5 );

	}


	async #setupGPUParticlesStateless() {

		const pointGeo = new THREE.BufferGeometry();
		const positions = new Float32Array( [ 1, 1, 1 ] );
		pointGeo.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

		const pointSettings = {
			size: 200.0,
			distance: 1.0,
		};
		const pointMaterial = new THREE.PointsMaterial( { size: pointSettings.size * pointSettings.distance / ( 0.5 * window.innerHeight ) } );
		const mesh = new THREE.Points( pointGeo, pointMaterial );
		this.Scene.add( mesh );

	}


}

const APP_ = new GPGPUProject();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: true,
		projectName: 'GPGPU Particles',
		rendererType: 'WebGL',
		initialCameraMode: 'perspective'
	} );

} );
