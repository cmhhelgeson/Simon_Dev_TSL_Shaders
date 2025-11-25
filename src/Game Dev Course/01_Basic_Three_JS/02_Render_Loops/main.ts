/* eslint-disable compat/compat */
import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Render Loop
// Continuous Cycle updating the game state and rendering the result on screen
// Takes in inputs from player and system, outputs a graphical result that is
// rendererd to the screen.
// Key Responsibilities:
//	1. Update State (Player Movements, Game Environment, AI Systems, Physics)
//		 All Game Systems
// 	2. Display the visual result of those systems interacting.
// 	3. Manage time between each iteration of the update -> draw process,
// 		 and pass that on to each iteration of the render loop.
// 	4. Maintain good game feel
//	Example:
//	void main() {
//		// Initialization step
//		initGame()
//		// Update state and render infinitely
//		while (true)
//			// Logic, Input, Physics, Loading Assets
//			updateState();
//			// Speak to graphics API
//			renderGroup();
//			if (isFinished()) {
//				break;
//			}

// In many game development environments, the loop is obfuscated for ease of use
// Unity: Using GameObject derives from MonoBehavior's Update() function
//	and tends to simply loop through all the extant entities and components
//	(NOTE: Not sure if Simon is talking about pre-ECS Unity or not).

// Frame Deltas
// Helps maintain cosnsitency of gameplay on disparate devices,
// even if each device takes different legnths of time
// to render and update the state of a scene.
// A game running at 60fps versus 30fps should generally look the same
// 1. frameDelta/deltaTime/dt: time elapsed between the current frame and the next frame.
// 		Example: Object moves at 1 meter per second
//			Machine #1 (Slow): Render Loop runs at 1fps -> Update called once per second
//						w/o dt: Moves 1 m per frame, 1 m per second
//						w/ 	dt: Moves 1/1 per frame, 1 m per second
// 			Machine #2 (Fast): Render Loop runs at 2fps -> Update called twice per second
//						w/o dt: Moves 1 m per frame, 2 m per second
//						w/ dt : Moves 1/2 (0.5) m per frame, 1 m per second
//			Machine #3 (30fps) -> Update called 30 times per second
//						w/ dt : Moves 1/30 = 0.03 m per frame, 1 m per second
// 			Machine #4 (60 fps) -> Update called 60 times per second
//						w/ dt : Moves 1/60 = 0.016 m per frame, 1 m per second
// 2. Problems with deltaTime
//		a. Variable Time Steps: In Complex Physics simulations, it's often preferable to have
//			 fixed time steps to prevent non-deterministic behavior. If your game has complex physics simulations,
//			 you may want to separate gameplay render loop behavior from physics render loop behavior.
//		b. Spikes: Large spikes in deltaTime cause jumps in gameplay behavior, which can be mitigated with smoothing.
//			 Can fix by capping frame rate, or ignoring spike.
//		c. Spiral of death: Frame rate drops significantly on frame 1, increasing deltaTime for frame 2.
//			 Frame 2 calculates gameplay with absurdly high deltaTime, and so on. Fix with clamp dt to max.

class App {

	#renderer!: WebGPURenderer;
	#camera!: THREE.PerspectiveCamera;
	#scene!: THREE.Scene;
	#clock: THREE.Clock = new THREE.Clock( true );
	#controls!: OrbitControls;
	#mesh!: THREE.Mesh;
	#debugUI!: GUI;
	#debugUIMap: Record<string, GUI> = {};
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
		useDPR: false,
		// Canvas Values
		fixedAspectController: '16:9',
		aspectWidth: 16,
		aspectHeight: 9,
		dprValue: 'Device',
	};
	#settings = {
		rotation: true,
	};


	#timeSinceLastUpdate = 0;
	#timeSinceLastRender = 0;

	constructor() {

		window.addEventListener( 'resize', () => {

			this.#onWindowResize();

		} );

	}


	initialize() {

		this.#renderer = new THREE.WebGPURenderer( { canvas: document.getElementById( 'c' ) as HTMLCanvasElement } );
		this.#renderer.setSize( window.innerWidth, window.innerHeight );
		this.#renderer.setClearColor( 0x000000 );
		document.body.appendChild( this.#renderer.domElement );

		const aspect = window.innerWidth / window.innerHeight;
		this.#camera = new THREE.PerspectiveCamera( 50, aspect, 0.1, 2000 );
		this.#camera.position.z = 5;

		this.#controls = new OrbitControls( this.#camera, this.#renderer.domElement );
		// Smooths camera movement
		this.#controls.enableDamping = true;
		// Explicitly set camera's target to the default of 0, 0, 0
		this.#controls.target.set( 0, 0, 0, );
		this.#controls.update();

		this.#scene = new THREE.Scene();

		this.#mesh = new THREE.Mesh(
			new THREE.BoxGeometry(),
			new THREE.MeshBasicMaterial( {
				color: 0xff0000,
				wireframe: true,
			} )
		);

		this.#scene.add( this.#mesh );

		this.#debugUI = new GUI();
		this.#debugUI.add( this.#settings, 'rotation' );
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

		this.#raf();

	}


	#raf() {

		requestAnimationFrame( () => {

			const { useDeltaTime, clampMin, clampMax, fixedTimeStep, useFixedFrameRate, fixedCPUFPS, fixedGPUFPS } = this.#rendererSettings;

			const timeElapsed = this.#clock.getDelta();
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

					this.#step( useDeltaTime ? this.#timeSinceLastUpdate : fixedTimeStep );
					this.#timeSinceLastUpdate = 0;

				}

				if ( this.#timeSinceLastRender >= gpuFrameInterval ) {

					this.#render();
					this.#timeSinceLastRender = 0;

				}

			} else {

				this.#step( deltaTime );
				this.#render( );

			}

			this.#raf();

		} );

	}

	// State update function
	#step( deltaTime: number ) {

		this.#controls.update( deltaTime );
		if ( this.#settings.rotation ) {

			this.#mesh.rotation.y += deltaTime;

		}

	}

	#render( ) {

		this.#renderer.render( this.#scene, this.#camera );

	}

	#onWindowResize() {

		const { cameraResizeUpdate, useFixedAspectRatio, aspectWidth, aspectHeight, dprValue } = this.#rendererSettings;

		// NOTE how the mesh distorts when either projection updates and canvas resizing are off.
		// Proper perspective is maintained when both are turned off, but parts of the image get cut off.
		// (technically the image changes as we resize [there is no letterboxing or aspect ratio maintenance])
		// maintaining an image with the same amount of pixel area, even if the perspective of the elements
		// in the image are the same. For that, we need to maintain a fixed aspect ratio
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
		console.log( this.#rendererSettings.useDPR );
		if ( this.#rendererSettings.useDPR ) {

			this.#renderer.setPixelRatio( dpr );

		} else {

			this.#renderer.setPixelRatio( 1 );

		}

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new App();
app.initialize();
