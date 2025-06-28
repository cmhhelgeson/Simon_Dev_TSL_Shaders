import * as THREE from 'three';
import { uniform, Fn, texture, mix } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { App } from '../utils/App';


class Alpha extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );
		const material = new MeshBasicNodeMaterial();
		const textureLoader = new THREE.TextureLoader();
		const gridMap = textureLoader.load( './resources/uv_grid_opengl.jpg' );
		const overlayMap = textureLoader.load( './resources/overlay.png' );

		const effectController = {
			tint: uniform( new THREE.Color( 1.0, 1.0, 1.0 ) ),
			transparency: uniform( 1.0 ),
		};

		material.colorNode = Fn( () => {

			const { tint, transparency } = effectController;
			const gridColor = texture( gridMap ).mul( tint );
			const overlayColor = texture( overlayMap ).mul( transparency );

			return mix( gridColor, overlayColor, overlayColor.w );

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		this.DebugGui.addColor( { color: effectController.tint.value.getHex( THREE.SRGBColorSpace ) }, 'color' ).onChange( ( value ) => {

			effectController.tint.value.set( value );

		} ).name( 'tint' );
		this.DebugGui.add( effectController.transparency, 'value', 0.0, 1.0 ).name( 'transparency' );

	}

}


const APP_ = new Alpha();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Alpha',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );



