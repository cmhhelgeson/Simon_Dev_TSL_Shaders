import * as THREE from 'three';
import { vec3, Fn, uniform } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { App } from '../../utils/App';

class SimpleColorsAndRGB extends App {

	async onSetupProject( ): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );
		const material = new MeshBasicNodeMaterial();

		const effectController = {
			red: uniform( 1.0 ),
			green: uniform( 1.0 ),
			blue: uniform( 1.0 )
		};

		material.colorNode = Fn( () => {

			const { red, green, blue } = effectController;

			return vec3( red, green, blue );

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		const gui = this.Inspector.createParameters( 'Simple Colors and RGB' );
		gui.add( effectController.red, 'value', 0.0, 1.0 ).name( 'red' );
		gui.add( effectController.green, 'value', 0.0, 1.0 ).name( 'green' );
		gui.add( effectController.blue, 'value', 0.0, 1.0 ).name( 'blue' );

	}

}

const APP_ = new SimpleColorsAndRGB();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Simple Colors and RGB',
		debug: false,
		withInspector: true,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );

