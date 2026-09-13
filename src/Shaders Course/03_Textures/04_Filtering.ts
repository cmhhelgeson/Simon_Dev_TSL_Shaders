import * as THREE from 'three';
import { uniform, Fn, texture, uv } from 'three/tsl';
import { App } from '../../utils/App';
import { MeshBasicNodeMaterial } from 'three/webgpu';

const textureWrappings: Record<string, THREE.Wrapping> = {
	'Repeat': THREE.RepeatWrapping,
	'Mirrored Repeat': THREE.MirroredRepeatWrapping,
	'ClampToEdge': THREE.ClampToEdgeWrapping,
};

/**
 * Magnification only happens between four neighbouring texels, so there is no
 * mip chain to consult and WebGPU only accepts the two non-mipmap modes here.
 */
const magFilters: Record<string, THREE.MagnificationTextureFilter> = {
	'Nearest': THREE.NearestFilter,
	'Linear': THREE.LinearFilter,
};

/**
 * Minification additionally chooses how the mip chain is sampled: the first
 * word filters within a mip level, the second picks between levels.
 */
const minFilters: Record<string, THREE.MinificationTextureFilter> = {
	'Nearest': THREE.NearestFilter,
	'Linear': THREE.LinearFilter,
	'Nearest, Mip Nearest': THREE.NearestMipmapNearestFilter,
	'Nearest, Mip Linear': THREE.NearestMipmapLinearFilter,
	'Linear, Mip Nearest': THREE.LinearMipmapNearestFilter,
	'Linear, Mip Linear (Trilinear)': THREE.LinearMipmapLinearFilter,
};

class Filtering extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();
		const textureLoader = new THREE.TextureLoader();
		const gridMap = textureLoader.load( './resources/uv_grid_opengl.jpg' );

		gridMap.wrapS = THREE.RepeatWrapping;
		gridMap.wrapT = THREE.RepeatWrapping;
		gridMap.minFilter = THREE.NearestFilter;
		gridMap.magFilter = THREE.NearestFilter;
		const effectController = {
			tint: uniform( new THREE.Color( 1.0, 1.0, 1.0 ) ),
			zoom: uniform( 1 ),
			// Tiling pushes the uvs past 1.0, which is what drives the texture
			// into minification and makes minFilter observable.
			tiling: uniform( 1 ),
			wrappingMode: 'Repeat',
			magFilter: 'Nearest',
			minFilter: 'Nearest'

		};

		material.colorNode = Fn( () => {

			const { tint, zoom, tiling } = effectController;
			const gridColor = texture( gridMap, uv().mul( tiling ).div( zoom ) ).mul( tint );
			return gridColor;

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		const gui = this.Inspector.createParameters( 'Texture Filtering' );
		gui.addColor( effectController.tint, 'value' ).name( 'tint' );
		gui.add( effectController.zoom, 'value', 1, 10 ).step( 1 ).name( 'zoom' );
		gui.add( effectController.tiling, 'value', 1, 32 ).step( 1 ).name( 'tiling' );
		gui.add( effectController, 'wrappingMode', Object.keys( textureWrappings ) ).onChange( () => {

			const wrappingMode = textureWrappings[ effectController.wrappingMode ];

			gridMap.wrapS = gridMap.wrapT = wrappingMode;
			gridMap.needsUpdate = true;

		} );

		// The mip chain is built up front (generateMipmaps defaults to true), so
		// swapping either filter only needs a fresh sampler. Bumping the texture
		// version via needsUpdate is what tells the renderer to rebuild it.
		gui.add( effectController, 'magFilter', Object.keys( magFilters ) ).onChange( () => {

			gridMap.magFilter = magFilters[ effectController.magFilter ];
			gridMap.needsUpdate = true;

		} );

		gui.add( effectController, 'minFilter', Object.keys( minFilters ) ).onChange( () => {

			gridMap.minFilter = minFilters[ effectController.minFilter ];
			gridMap.needsUpdate = true;

		} );

	}

}


const APP_ = new Filtering();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Texture Filtering',
		debug: false,
		withInspector: true,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );



