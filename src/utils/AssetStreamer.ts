import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { ThreeRenderer } from './types';

class AssetStreamer {

	#gltfLoader: GLTFLoader;

	constructor( renderer: ThreeRenderer ) {

		const dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath( './libs/draco/' );

		const ktx2Loader = new KTX2Loader();
		ktx2Loader.setTranscoderPath( './libs/basis/' );
		ktx2Loader.detectSupport( renderer );

		this.#gltfLoader = new GLTFLoader();
		this.#gltfLoader.setDRACOLoader( dracoLoader );
		this.#gltfLoader.setKTX2Loader( ktx2Loader );

	}

	async loadAsync( url: string, onProgress ) {

		const gltf = await this.#gltfLoader.loadAsync( url, onProgress );
		return gltf.scene;

	}

}

let STREAMER: AssetStreamer;

function initialize( renderer: ThreeRenderer ) {

	STREAMER = new AssetStreamer( renderer );

}

async function loadAsync( url: string, onProgress: any ) {

	return STREAMER.loadAsync( url, onProgress );

}

export { initialize, loadAsync };
