import * as THREE from 'three';
import { vec4, Fn } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { App } from '../../utils/App';

class IntroductionShader extends App {

	async onSetupProject( ): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );
		const material = new MeshBasicNodeMaterial();

		const getColorUsingOut = ( color ) => {

			return color.mul( vec4( 0.5 ) );

		};

		material.colorNode = Fn( () => {

			return getColorUsingOut( vec4( 1.0 ) );

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

	}

}

const APP_ = new IntroductionShader();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Introduction Shader',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
