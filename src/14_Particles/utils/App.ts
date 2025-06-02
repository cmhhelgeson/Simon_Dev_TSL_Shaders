/* eslint-disable compat/compat */
import * as THREE from 'three';
import { Renderer, WebGPURenderer } from 'three/webgpu';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';

type RendererEnum = 'WebGL' | 'WebGPU' | 'WebGLFallback'

interface AppInitializationOptions {
	projectName?: string,
	debug: boolean,
	rendererType?: RendererEnum,
}

class App {

	#renderer: Renderer | THREE.WebGLRenderer;
	rendererType: 'WebGL' | 'WebGPU';
	#camera: THREE.PerspectiveCamera;
	#scene: THREE.Scene;
	#clock: THREE.Clock;
	#controls: OrbitControls;
	#mesh: THREE.Mesh;
	#stats: Stats;
	#debugUI: GUI;
	#debugUIMap = {};
	#rendererSettings = {
		// Time Settings
		useDeltaTime: true,
		useFixedFrameRate: false,
		fixedTimeStep: 0.03,
		fixedUnifiedFPS: 30,
		fixedCPUFPS: 30,
		fixedGPUFPS: 30,
		// Time Values
		clampMin: 0.01,
		clampMax: 0.5,
		// Canvas Settings,
		resizeCanvas: true,
		cameraResizeUpdate: true,
		useFixedAspectRatio: false,
		useDPR: true,
		// Canvas Values
		fixedAspectController: '16:9',
		aspectWidth: 16,
		aspectHeight: 9,
		dprValue: 'Device',
	};

	#timeSinceLastUpdate = 0;
	#timeSinceLastRender = 0;

	// Override these methods
	async onSetupProject( projectFolder?: GUI ) {
	}

	onRender( deltaTime: number ) {
	}

	onStep( deltaTime: number, totalTimeElapsed: number ) {
	}

	onResize() {
	}

	constructor() {
	}

	#getRenderer( rendererType: RendererEnum ) {

		const documentCanvas = document.getElementById( 'c' ) as HTMLCanvasElement;

		if ( documentCanvas === null ) {

			throw new Error( 'Cannot get canvas' );

		}

		if ( rendererType === 'WebGL' ) {

			this.#renderer = new THREE.WebGLRenderer( {
				canvas: documentCanvas
			} );

			this.rendererType = 'WebGL';

			return;

		}

		this.#renderer = new WebGPURenderer( {
			canvas: documentCanvas,
			forceWebGL: rendererType === 'WebGLFallback' ? true : false
		} );

		this.rendererType = 'WebGPU';

	}

	#setupRenderer( options ) {

		this.#getRenderer( options.rendererType ? options.rendererType : 'WebGPU' );

		this.#renderer.setSize( window.innerWidth, window.innerHeight );
		this.#renderer.setClearColor( 0x000000 );
		document.body.appendChild( this.#renderer.domElement );

		this.#stats = new Stats();
		document.body.appendChild( this.#stats.dom );

		const aspect = window.innerWidth / window.innerHeight;
		this.#camera = new THREE.PerspectiveCamera( 50, aspect, 0.1, 2000 );
		this.#camera.position.z = 200;

		this.#controls = new OrbitControls( this.#camera, this.#renderer.domElement );
		// Smooths camera movement
		this.#controls.enableDamping = true;
		// Explicitly set camera's target to the default of 0, 0, 0
		this.#controls.target.set( 0, 0, 0 );
		this.#controls.update();

		this.#scene = new THREE.Scene();

		this.#debugUI = new GUI();
		if ( options.debug ) {

			this.#addRendererDebugGui();

		}


	}

	async #setupProject( options ) {

		await this.#setupRenderer( options );

		this.#scene.backgroundBlurriness = 0.0;
		this.#scene.backgroundIntensity = 0.01;
		this.#scene.environmentIntensity = 1.0;

		// Initialize project
		//const projectFolder = this.#debugUI.addFolder( options.projectName ?? 'Project' );

		// Apply project specific parameters to the scene
		await this.onSetupProject( );

	}

	#addRendererDebugGui() {

		this.#debugUIMap[ 'Time Settings' ] = this.#debugUI.addFolder( 'Time Settings' );
		this.#debugUIMap[ 'Time Settings' ].add( this.#rendererSettings, 'useDeltaTime' );
		this.#debugUIMap[ 'Time Settings' ].add( this.#rendererSettings, 'useFixedFrameRate' );
		this.#debugUIMap[ 'Time Values' ] = this.#debugUI.addFolder( 'Time Values' );
		this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'fixedTimeStep', 0.01, 0.5 );
		const fixedCPU = this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'fixedCPUFPS', 1, 60 ).step( 1 );
		const fixedGPU = this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'fixedGPUFPS', 1, 60 ).step( 1 );
		// Set CPU and GPU to run at same rate when useFixedFrameRate === true
		this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'fixedUnifiedFPS', 1, 60 ).step( 1 ).onChange( () => {

			this.#rendererSettings.fixedCPUFPS = this.#rendererSettings.fixedUnifiedFPS;
			fixedCPU.setValue( this.#rendererSettings.fixedUnifiedFPS );
			this.#rendererSettings.fixedGPUFPS = this.#rendererSettings.fixedUnifiedFPS;
			fixedGPU.setValue( this.#rendererSettings.fixedUnifiedFPS );

		} );
		this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'clampMin', 0.01, 1.0 );
		this.#debugUIMap[ 'Time Values' ].add( this.#rendererSettings, 'clampMax', 0.01, 1.0 );
		this.#debugUIMap[ 'Resize Settings' ] = this.#debugUI.addFolder( 'Resize Settings' );
		this.#debugUIMap[ 'Resize Settings' ].add( this.#rendererSettings, 'resizeCanvas' ).onChange( () => {

			this.#onWindowResize();

		} );
		this.#debugUIMap[ 'Resize Settings' ].add( this.#rendererSettings, 'cameraResizeUpdate' ).onChange( () => {

			this.#onWindowResize();

		} );
		this.#debugUIMap[ 'Resize Settings' ].add( this.#rendererSettings, 'useFixedAspectRatio' ).onChange( () => {

			this.#onWindowResize();

		} );
		this.#debugUIMap[ 'Resize Settings' ].add( this.#rendererSettings, 'useDPR' ).onChange( () => {

			this.#onWindowResize();

		} );
		this.#debugUIMap[ 'Resize Values' ] = this.#debugUI.addFolder( 'Resize Values' );
		this.#debugUIMap[ 'Resize Values' ].add( this.#rendererSettings, 'fixedAspectController', [
			'16:9 (HD)',
			'4:3 (CRT)',
			'1:85:1 (Standard)',
			'2.39:1 (Anamorphic)',
			'2.76:1 (Ultra Panavasion)',
			'1.90:1 ("Imax")',
			'1.43:1 (Imax Film)',
			'4:1 (Gance)',
			'1:1'
		] ).onChange( () => {

			// Lazy way, no parsing
			switch ( this.#rendererSettings.fixedAspectController ) {

				case '16:9 (HD)': {

					this.#rendererSettings.aspectWidth = 16;
					this.#rendererSettings.aspectHeight = 9;
					break;

				}

				case '4:3 (CRT)': {

					this.#rendererSettings.aspectWidth = 4;
					this.#rendererSettings.aspectHeight = 3;
					break;

				}

				case '1:85:1 (Standard)': {

					this.#rendererSettings.aspectWidth = 1.85;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '2.39:1 (Anamorphic)': {

					this.#rendererSettings.aspectWidth = 2.39;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '2.76:1 (Ultra Panavasion)': {

					this.#rendererSettings.aspectWidth = 2.76;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '1.90:1 ("Imax")': {

					this.#rendererSettings.aspectWidth = 1.90;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '1.43:1 (Imax Film)': {

					this.#rendererSettings.aspectWidth = 1.43;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '4:1 (Gance)': {

					this.#rendererSettings.aspectWidth = 4.0;
					this.#rendererSettings.aspectHeight = 1;
					break;

				}

				case '1:1': {

					this.#rendererSettings.aspectWidth = 1.0;
					this.#rendererSettings.aspectHeight = 1.0;
					break;

				}

			}

			this.#onWindowResize();

		} ).name( 'Fixed Aspect Ratio' );

		this.#debugUIMap[ 'Resize Values' ].add( this.#rendererSettings, 'dprValue', [ 'Device', '0.1', '0.5', '1.0', '2.0', '3.0' ] ).onChange( () => {

			this.#onWindowResize();

		} );

		for ( const folderName in this.#debugUIMap ) {

			this.#debugUIMap[ folderName ].close();

		}

	}


	#raf() {

		requestAnimationFrame( () => {

			const { useDeltaTime, clampMin, clampMax, fixedTimeStep, useFixedFrameRate, fixedCPUFPS, fixedGPUFPS } = this.#rendererSettings;

			const timeElapsed = this.#clock.getDelta();
			const totalTimeElapsed = this.#clock.getElapsedTime();
			const deltaTime = useDeltaTime ? Math.min( Math.max( timeElapsed, clampMin ), clampMax ) : fixedTimeStep;

			// We're still calculating literal time even when deltaTime is set arbitrarily
			this.#timeSinceLastRender += timeElapsed;
			this.#timeSinceLastUpdate += timeElapsed;

			if ( useFixedFrameRate ) {

				// # of times per second to update the state
				const cpuFrameInterval = 1 / fixedCPUFPS;
				// # of times per second to render a frame
				const gpuFrameInterval = 1 / fixedGPUFPS;

				if ( this.#timeSinceLastRender >= cpuFrameInterval ) {

					this.#step( useDeltaTime ? this.#timeSinceLastUpdate : fixedTimeStep, totalTimeElapsed );
					this.#timeSinceLastUpdate = 0;

				}

				if ( this.#timeSinceLastRender >= gpuFrameInterval ) {

					this.#render( deltaTime );
					this.#timeSinceLastRender = 0;

				}

			} else {

				this.#step( deltaTime, totalTimeElapsed );
				this.#render( deltaTime );

			}

			this.#raf();

		} );

	}

	// State update function
	#step( deltaTime: number, totalTimeElapsed: number ) {

		this.onStep( deltaTime, totalTimeElapsed );

		//this.#controls.update( deltaTime );

	}

	#render( deltaTime: number ) {

		// App specific code executed per render
		this.onRender( deltaTime );
		this.#renderer.render( this.#scene, this.#camera );

	}

	#onWindowResize() {

		const { cameraResizeUpdate, useFixedAspectRatio, aspectWidth, aspectHeight, dprValue } = this.#rendererSettings;

		let canvasWidth = window.innerWidth;
		let canvasHeight = window.innerHeight;

		const dpr = dprValue === 'Device' ? window.devicePixelRatio : parseFloat( dprValue );

		if ( useFixedAspectRatio ) {

			// Aspect ratio of your browser window
			const windowAspect = window.innerWidth / window.innerHeight;
			// Target aspect ratio of your image
			const targetAspect = aspectWidth / aspectHeight;

			// When window size is wider than target, limit the width to a factor of the height
			if ( windowAspect > targetAspect ) {

				// Window is too wide, limit width
				canvasHeight = window.innerHeight;
				canvasWidth = canvasHeight * targetAspect;

				// Otherwise limit the height

			} else {

				// Window is too tall, limit height
				canvasWidth = window.innerWidth;
				canvasHeight = canvasWidth / targetAspect;

			}

		}

		if ( cameraResizeUpdate ) {

			this.#camera.aspect = useFixedAspectRatio ?
				aspectWidth / aspectHeight :
				window.innerWidth / window.innerHeight;
			this.#camera.updateProjectionMatrix();

		}


		// Arguments: Width, height, and whether to resize the canvas
		this.#renderer.setSize( canvasWidth, canvasHeight, this.#rendererSettings.resizeCanvas );
		if ( this.#rendererSettings.useDPR ) {

			this.#renderer.setPixelRatio( dpr );

		} else {

			this.#renderer.setPixelRatio( 1 );

		}

	}

	async initialize( options: AppInitializationOptions ) {

		this.#clock = new THREE.Clock( true );

		// Setup event listeners before render loop
		window.addEventListener( 'resize', () => {

			this.#onWindowResize();

		}, false );

		// Setup Project and call App specific onSetupProject
		await this.#setupProject( options );

		// Resize window to meet current canvas dimensions
		this.#onWindowResize();
		// Start render loop
		this.#raf();

	}

	loadRGBE( path ) {

		const rgbeLoader = new RGBELoader();
		rgbeLoader.load( path, ( hdrTexture ) => {

			hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

			this.#scene.background = hdrTexture;
			this.#scene.environment = hdrTexture;

		} );

	}

	get Scene() {

		return this.#scene;

	}

	get Camera() {

		return this.#camera;

	}

	get CameraControls() {

		return this.#controls;

	}

	get Stats() {

		return this.#stats;

	}

	get DebugGui() {

		return this.#debugUI;


	}

}

export { App };
