import * as THREE from 'three';
import { mix, uv, Fn, uniform } from 'three/tsl';
import { App } from '../../utils/App';
import { MeshBasicNodeMaterial } from 'three/webgpu';
class Uniforms extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );
		const material = new MeshBasicNodeMaterial();

		const effectController = {
			colorLeft: uniform( new THREE.Color( 1.0, 0.0, 1.0 ) ),
			colorRight: uniform( new THREE.Color( 1.0, 1.0, 0.0 ) )
		};

		material.colorNode = Fn( () => {

			const { colorLeft, colorRight } = effectController;
			return mix( colorLeft, colorRight, uv().x );

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		this.DebugGui.addColor( { color: effectController.colorLeft.value.getHex( THREE.SRGBColorSpace ) }, 'color' ).onChange( ( value ) => {

			effectController.colorLeft.value.set( value );

		} ).name( 'colorLeft' );
		this.DebugGui.addColor( { color: effectController.colorRight.value.getHex( THREE.SRGBColorSpace ) }, 'color' ).onChange( ( value ) => {

			effectController.colorRight.value.set( value );

		} ).name( 'colorRight' );

	}

}

const APP_ = new Uniforms();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Uniforms',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );



