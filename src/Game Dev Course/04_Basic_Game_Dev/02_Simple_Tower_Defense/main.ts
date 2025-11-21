import * as THREE from 'three';
import { App } from '../../../utils/App';
import { GLTF } from 'three/examples/jsm/Addons.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';


// GLTF Scene can contain an array of animations
// AnimationClip class: can take keyframes of the animation


class SimpleTowerDefense extends App {

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ) {

		/* const options = new CachedAssetStreamerOptions();
		options.renderer = this.Renderer;
		options.scene = this.Scene;
		options.camera = this.Camera; */

		//this.#streamer_ = new CachedAssetStreamer( options );

		this.Camera.position.set( - 3, 10, 3 );
		this.Camera.lookAt( 0, 0, 0 );

		await this.#setupBasicScene();


	}

	#setupBasicScene() {

		// Light
		const SHADOW_WIDTH = 16;

		const light = new THREE.DirectionalLight( 0xFFFFFF, 2.0 );
		light.position.set( 1, 4, 1 );
		light.target.position.set( 0, 0, 0 );
		light.castShadow = true;
		light.shadow.mapSize.setScalar( 2048 );
		light.shadow.camera.left = - SHADOW_WIDTH;
		light.shadow.camera.right = SHADOW_WIDTH;
		light.shadow.camera.top = SHADOW_WIDTH;
		light.shadow.camera.bottom = - SHADOW_WIDTH;
		light.shadow.normalBias = 0.05;
		this.Scene.add( light );
		this.Scene.add( light.target );

		// Ground
		const gridTexture = new THREE.TextureLoader().load( './resources/textures/whitesquare.png' );
		gridTexture.repeat.set( 100, 100 );
		gridTexture.wrapS = THREE.RepeatWrapping;
		gridTexture.wrapT = THREE.RepeatWrapping;
		gridTexture.colorSpace = THREE.SRGBColorSpace;

		const groundGeometry = new THREE.PlaneGeometry( 100, 100 );
		const groundMaterial = new THREE.MeshStandardMaterial( {
			color: 0x808080,
			map: gridTexture,
			metalness: 0.2,
			roughness: 0.6,
		} );
		const groundMesh = new THREE.Mesh( groundGeometry, groundMaterial );
		groundMesh.rotation.x = - Math.PI / 2;
		groundMesh.receiveShadow = true;
		this.Scene.add( groundMesh );

		this.Scene.backgroundBlurriness = 0.4;
		this.Scene.backgroundIntensity = 0.5;
		this.Scene.environmentIntensity = 0.5;

		this.loadHDRBackground( './resources/skybox/rosendal_park_sunset_1k.hdr' );


	}

	onStep( deltaTime: number, totalTimeElapsed: number ) {


	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new SimpleTowerDefense();
app.initialize( {
	debug: true,
	projectName: 'Simple Tower Defense',
	rendererType: 'WebGPU',
	initialCameraMode: 'perspective',
} );



