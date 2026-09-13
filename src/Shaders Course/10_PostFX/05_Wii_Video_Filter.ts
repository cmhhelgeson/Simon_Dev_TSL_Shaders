import * as THREE from 'three';
import { pass, texture, uv } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { App } from '../../utils/App';
import {
	VFilter,
	VFILTER_PROGRESSIVE,
	VFILTER_PROGRESSIVE_SOFT,
	wiiVideoFilter,
} from '../../utils/tsl/postfx/wii_video_filter';

/**
 * The swap No-AA-Patcher performs: stock games hand the VI a "soft" progressive
 * rmode whose vertical filter bleeds neighbouring scanlines together, and the
 * patch points them at the plain progressive rmode instead, whose taps all sit
 * on the current line.
 */
const vfilters: Record<string, VFilter> = {
	'Soft / AA (stock)': VFILTER_PROGRESSIVE_SOFT,
	'Normal (patched)': VFILTER_PROGRESSIVE,
};

class WiiVideoFilterDemo extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );
		const material = new MeshBasicNodeMaterial();

		// A grid with fine lines and small text is where the smear is most
		// obvious - it is exactly the detail the copy filter destroys.
		const gridMap = await this.loadTexture( './resources/uv_grid_opengl.jpg' );
		material.colorNode = texture( gridMap, uv() );

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

		const effectController = {
			copyFilter: 'Soft / AA (stock)',
			quantize: true,
			dither: true,
		};

		const scenePass = pass( this.Scene, this.Camera );
		const pipeline = this.createPostProcessingPipeline( 'wii' );

		// The options are baked into the node graph, so changing one rebuilds it.
		const rebuild = () => {

			pipeline.outputNode = wiiVideoFilter( scenePass.getTextureNode(), {
				vfilter: vfilters[ effectController.copyFilter ],
				quantize: effectController.quantize,
				dither: effectController.dither,
			} );
			pipeline.needsUpdate = true;

		};

		rebuild();

		const gui = this.Inspector.createParameters( 'Wii Video Filter' );
		gui.add( effectController, 'copyFilter', Object.keys( vfilters ) ).name( 'Copy filter' ).onChange( rebuild );
		gui.add( effectController, 'quantize' ).name( '640x480 grid' ).onChange( rebuild );
		gui.add( effectController, 'dither' ).name( '6-bit EFB dither' ).onChange( rebuild );

	}

}

const APP_ = new WiiVideoFilterDemo();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Wii Video Filter',
		debug: false,
		withInspector: true,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
