import * as THREE from 'three';
import {
	texture,
	uv,
	Fn,
	remap,
	uniform,
	pass,
	vec3,
	color,
	dot,
	mix,
	saturate,
} from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { App } from '../../utils/App';
import { ThreeRenderer } from '../../utils/types';

const effectController = {
	remapUVXBegin: uniform( 0.25 ),
	remapUVXEnd: uniform( 0.75 ),
	bleachOpacity: uniform( 0.8 ),
	testVal: uniform( 0.5 ),
	tintColor: color( 1.0, 0.5, 0.5 ),
	saturation: uniform( 1.312 ),
	brightness: uniform( - 0.2 ),
	contrast: uniform( 1.2 ),
	midpoint: uniform( - 0.01 )
};

const postProcessFunction = Fn( ( [ color ] ) => {

	const { midpoint, brightness, saturation, contrast } = effectController;

	const c = vec3( color ).toVar( 'inputColor' );

	//Tinting
	//c.mulAssign( effectController.tintColor );

	//Brightness
	c.addAssign( brightness );

	//Saturation (accounting for relative brightness of each color)
	const luminance = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
	c.assign( mix( vec3( luminance ), c, saturation ) );

	// Alt Contrast
	//const sg = sign( c.y.sub( midpoint ) ).toVar( 'sg' );
	//const b = abs( c.sub( midpoint ) ).mul( 2 ).toVar( 'b' );
	//const k = float( 1.0 ).div( contrast );
	//c.assign(
	//  sg.mul( pow(
	//    b, vec3( k )
	//  ) ).mul( 0.5 ).add( 0.5 )
	//);
	c.assign( saturate( c.sub( midpoint ) ).mul( contrast ).add( midpoint ) );

	return c;


}, {
	name: 'postProcessFunction',
	type: 'vec3',
	inputs: [
		{ name: 'colorInput', type: 'vec3' }
	]
} );

class ColorManipulation extends App {

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		this.changeRenderHandler( ( renderer: ThreeRenderer, scene: THREE.Scene, camera: THREE.Camera ) => {

			const { postScene, postColor } = this.PostProcessing;

			// Altering the code a bit to work within a more typical postProcessing context
			const halfWidth = window.innerWidth / 2;

			renderer.setViewport( 0, 0, halfWidth, window.innerHeight );

			postScene.render();

			renderer.autoClear = false;

			renderer.setViewport( halfWidth, 0, halfWidth, window.innerHeight );
			postColor.render();

			renderer.autoClear = true;


		} );

		const material = new MeshBasicNodeMaterial();

		const tomatoTexture = await this.loadTexture( './resources/tomato.jpg' );

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
		this.createPostProcessingPipeline( 'postColor' ).outputNode = postProcessFunction( scenePass );

		this.DebugGui.add( effectController.remapUVXBegin, 'value', 0.01, 0.9 ).name( 'remapXBegin' );
		this.DebugGui.add( effectController.remapUVXEnd, 'value', 0.01, 0.9 ).name( 'remapXEnd' );
		const postProcessingFolder = this.DebugGui.addFolder( 'Post Processing' );
		postProcessingFolder.add( effectController.saturation, 'value', 0.0, 2.0 ).name( 'saturation' );
		postProcessingFolder.add( effectController.brightness, 'value', - 1.0, 1.0 ).step( 0.1 ).name( 'brightness' );
		postProcessingFolder.add( effectController.contrast, 'value', 0.0, 2.0 ).step( 0.1 ).name( 'contrast' );
		postProcessingFolder.add( effectController.midpoint, 'value', - 1.0, 1.0 ).step( 0.01 ).name( 'midpoint' );

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new ColorManipulation();
app.initialize( {
	debug: true,
	projectName: 'Post FX Intro',
	rendererType: 'WebGPU',
	initialCameraMode: 'orthographic',
} );
