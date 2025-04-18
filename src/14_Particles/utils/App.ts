/* eslint-disable compat/compat */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { WebGPURenderer } from 'three/webgpu';
class App {

	// Private references to values shared across all single scene Threejs applications
	#renderer_: WebGPURenderer; //| THREE.WebGLRenderer
	#camera_: THREE.PerspectiveCamera;
	#scene_ : THREE.Scene;
	#clock_: THREE.Clock;
	#debugUI_: GUI;
	#controls_: OrbitControls;


	// Override these methods
	async onSetupProject( projectFolder?: GUI ) {
	}

	onRender() {
	}

	onStep( dt: number, totalTimeElapsed: number ) {
	}

	onResize() {
	}

	async #setupRenderer_() {

		this.#renderer_ = new THREE.WebGPURenderer( { antialias: true } );
		this.#renderer_.shadowMap.enabled = true;
		this.#renderer_.shadowMap.type = THREE.PCFSoftShadowMap;
		this.#renderer_.toneMapping = THREE.ACESFilmicToneMapping;
		this.#renderer_.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.#renderer_.domElement );

		this.#debugUI_ = new GUI();

		const fov = 60;
		const aspect = window.innerWidth / window.innerHeight;
		const near = 0.1;
		const far = 1000;
		this.#camera_ = new THREE.PerspectiveCamera( fov, aspect, near, far );
		this.#camera_.position.set( 80, 20, 80 );
		this.#camera_.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		this.#controls_ = new OrbitControls( this.#camera_, this.#renderer_.domElement );
		this.#controls_.minDistance = 1;
		this.#controls_.maxDistance = 1000;
		this.#controls_.enableDamping = true;
		this.#controls_.target.set( 0, 0, 0 );
		this.#controls_.update();

		this.#scene_ = new THREE.Scene();
		this.#scene_.background = new THREE.Color( 0x000000 );

		// Scene tweaks
		this.#scene_.backgroundBlurriness = 0.0;
		this.#scene_.backgroundIntensity = 0.2;

		this.#scene_.environmentIntensity = 1.0;
		// Apply general parameters to the scene
		const sceneFolder = this.#debugUI_.addFolder( 'Scene' );
		sceneFolder.add( this.#scene_, 'backgroundBlurriness', 0.0, 1.0 );
		sceneFolder.add( this.#scene_, 'backgroundIntensity', 0.0, 1.0 );
		sceneFolder.add( this.#scene_, 'environmentIntensity', 0.0, 1.0 );

	}


	async #setupProject_() {

		await this.#setupRenderer_();

		// Initialize project
		const projectFolder = this.#debugUI_.addFolder( 'Project' );

		// Apply project specific parameters to the scene
		await this.onSetupProject( projectFolder );

	}


	#onWindowResize_() {

		// Intentionally ignoring DPR for now
		// const dpr = window.devicePixelRatio;
		const dpr = 1;

		const canvas = this.#renderer_.domElement;
		canvas.style.width = window.innerWidth + 'px';
		canvas.style.height = window.innerHeight + 'px';
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;

		const aspect = w / h;

		this.#renderer_.setSize( w, h, false );
		this.#camera_.aspect = aspect;
		this.#camera_.updateProjectionMatrix();

	}

	#raf_() {

		requestAnimationFrame( ( t: number ) => {

			const timeElapsed = Math.min( this.#clock_.getDelta(), 0.1 );

			// Calculate and compute
			this.#step_( timeElapsed );
			// Render
			this.#render_();
			// Call next animation frame
			this.#raf_();

		} );

	}

	#render_() {

		this.onRender();
		this.#renderer_.renderAsync( this.#scene_, this.#camera_ );

	}

	#step_( dt: number ) {

		this.onStep( dt, this.#clock_.getElapsedTime() );

	}

	loadRGBE( path ) {

		const rgbeLoader = new RGBELoader();
		rgbeLoader.load( path, ( hdrTexture ) => {

			hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

			this.#scene_.background = hdrTexture;
			this.#scene_.environment = hdrTexture;

		} );

	}

	async initialize() {

		this.#clock_ = new THREE.Clock( true );

		// Setup event listeners before render loop
		window.addEventListener( 'resize', () => {

			this.#onWindowResize_();

		}, false );

		// Setup Project and call App specific onSetupProject
		await this.#setupProject_();

		// Resize window to meet current canvas dimensions
		this.#onWindowResize_();
		// Start render loop
		this.#raf_();

	}

	// Getters
	get Scene() {

		return this.#scene_;

	}

	get Camera() {

		return this.#camera_;

	}

	get CameraControls() {

		return this.#controls_;

	}

}


export { App };
