import * as THREE from 'three';
import {
	texture,
	uv,
	Fn,
	remap,
	uniform,
	pass,
} from 'three/tsl';

import { sobel } from 'three/addons/tsl/display/SobelOperatorNode.js';
import { bleach } from 'three/addons/tsl/display/BleachBypass.js';
import { dotScreen } from 'three/addons/tsl/display/DotScreenNode.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { PostProcessing, MeshBasicNodeMaterial } from 'three/webgpu';
import { App } from '../../utils/App';
import { ThreeRenderer } from '../../utils/types';

const effectController = {
	remapUVXBegin: uniform( 0.25 ),
	remapUVXEnd: uniform( 0.75 ),
	bleachOpacity: uniform( 0.8 ),
	pixelSize: uniform( 6 ),
	normalEdgeStrength: uniform( 0.3 ),
	depthEdgeStrength: uniform( 0.4 ),
};

class PostFXIntro extends App {

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		this.changeRenderHandler( ( renderer: ThreeRenderer, scene: THREE.Scene, camera: THREE.Camera ) => {

			const { postScene, postSobel, postBleach, postPixelation } = this.PostProcessing;

			const halfWidth = window.innerWidth / 2;
			const halfHeight = window.innerHeight / 2;

			renderer.setViewport( 0, 0, halfWidth, halfHeight );

			postScene.render();

			renderer.autoClear = false;

			renderer.setViewport( halfWidth, 0, halfWidth, halfHeight );
			postBleach.render();

			renderer.setViewport( 0, halfHeight, halfWidth, halfHeight );
			postSobel.render();

			renderer.setViewport( halfWidth, halfHeight, halfWidth, halfHeight );
			postPixelation.render();

			renderer.autoClear = true;

		} );


		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();

		const textureLoader = new THREE.TextureLoader();
		const tomatoTexture = textureLoader.load( './resources/tomato.jpg' );

		material.colorNode = Fn( () => {

			const { remapUVXBegin, remapUVXEnd } = effectController;

			const vUv = uv().toVar( 'vUv' );

			vUv.x.assign( remap( uv().x, 0.0, 1.0, remapUVXBegin, remapUVXEnd ) );
			return texture( tomatoTexture, vUv );

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		const scenePass = pass( this.Scene, this.Camera );

		this.createPostProcessingPipeline( 'postScene' ).outputNode = scenePass;
		this.createPostProcessingPipeline( 'postSobel' ).outputNode = sobel( scenePass );
		this.createPostProcessingPipeline( 'postBleach' ).outputNode = bleach( scenePass, effectController.bleachOpacity );
		this.createPostProcessingPipeline( 'postPixelation' ).outputNode = dotScreen( scenePass );

		this.DebugGui.add( effectController.remapUVXBegin, 'value', 0.01, 0.9 ).name( 'remapXBegin' );
		this.DebugGui.add( effectController.remapUVXEnd, 'value', 0.01, 0.9 ).name( 'remapXEnd' );
		const postProcessingFolder = this.DebugGui.addFolder( 'Post Processing' );
		postProcessingFolder.add( effectController.bleachOpacity, 'value', 0.01, 10.0 ).name( 'bleachOpacity' );

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new PostFXIntro();
app.initialize( {
	debug: true,
	projectName: 'Post FX Intro',
	rendererType: 'WebGPU',
	initialCameraMode: 'orthographic',
} );
