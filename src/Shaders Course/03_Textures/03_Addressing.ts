import * as THREE from 'three';
import { uniform, Fn, texture, uv } from 'three/tsl';
import { App } from '../../utils/App';
import { MeshBasicNodeMaterial } from 'three/webgpu';


const textureWrappings = {
	'Repeat': THREE.RepeatWrapping,
	'Mirrored Repeat': THREE.MirroredRepeatWrapping,
	'ClampToEdge': THREE.ClampToEdgeWrapping,
};

class Addressing extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();
		const textureLoader = new THREE.TextureLoader();
		const gridMap = textureLoader.load( './resources/uv_grid_opengl.jpg' );

		gridMap.wrapS = THREE.RepeatWrapping;
		gridMap.wrapT = THREE.RepeatWrapping;
		const effectController = {
			tint: uniform( new THREE.Color( 1.0, 1.0, 1.0 ) ),
			uvSize: uniform( 1 ),
			wrappingMode: 'Repeat Wrapping'
		};

		material.colorNode = Fn( () => {

			const { tint, uvSize } = effectController;
			const gridColor = texture( gridMap, uv().mul( uvSize ) ).mul( tint );
			return gridColor;

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		this.DebugGui.addColor( { color: effectController.tint.value.getHex( THREE.SRGBColorSpace ) }, 'color' ).onChange( ( value ) => {

			effectController.tint.value.set( value );

		} ).name( 'tint' );
		this.DebugGui.add( effectController.uvSize, 'value', 1, 10 ).step( 1 ).name( 'uvSize' );
		this.DebugGui.add( effectController, 'wrappingMode', Object.keys( textureWrappings ) ).onChange( () => {

			const wrappingMode = textureWrappings[ effectController.wrappingMode ];

			gridMap.wrapS = gridMap.wrapT = wrappingMode;
			gridMap.needsUpdate = true;
			material.needsUpdate = true;

		} );

	}

}

const APP_ = new Addressing();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Texture Addressing',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );



