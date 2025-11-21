import * as THREE from 'three';
import { uniform, Fn, texture, viewportCoordinate, textureSize } from 'three/tsl';
import { App } from '../utils/App';
import { MeshBasicNodeMaterial } from 'three/webgpu';

class SimpleTexture extends App {


	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();
		const textureLoader = new THREE.TextureLoader();
		const map = textureLoader.load( './resources/uv_grid_opengl.jpg' );

		const effectController = {
			tint: uniform( new THREE.Color( 1.0, 1.0, 1.0 ) ),
		};

		material.colorNode = Fn( () => {

			const { tint } = effectController;

			const color = texture( map );

			const size = textureSize( color );

			return texture( map, viewportCoordinate.div( size ) ).mul( tint );

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		this.DebugGui.addColor( { color: effectController.tint.value.getHex( THREE.SRGBColorSpace ) }, 'color' ).onChange( ( value ) => {

			effectController.tint.value.set( value );

		} ).name( 'tint' );

	}

}

const APP_ = new SimpleTexture();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Simple Texture',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
