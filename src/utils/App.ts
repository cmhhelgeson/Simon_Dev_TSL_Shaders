/* eslint-disable compat/compat */
import * as THREE from 'three';
import { ComputeNode, UniformNode, WebGPURenderer, Scene, Camera, Object3DEventMap, PostProcessing } from 'three/webgpu';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import { Font, FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { uniform } from 'three/tsl';
import { RenderCallback, ThreeRenderer } from './types';
import { PostProcessingMachine } from './PostProcessingMachine';

type RendererEnum = 'WebGPU' | 'WebGLFallback'

interface AppInitializationOptions {
	/* The name of the application and the title of the page */
	projectName?: string,
	/* Flag indicating whether to provide the user debug functionality through the GUI */
	debug: boolean,
	/* The renderer to use in the project */
	rendererType?: RendererEnum,
	/* Whether the scene is first rendered using a perspective or an orthographic camera */
	initialCameraMode?: 'perspective' | 'orthographic',
	fixedFrameRate?: number
}

/**
 * Configuration options for rendering and canvas behavior.
 */
type RendererSettings = {
  /** Use delta time between frames for updates */
  useDeltaTime: boolean;
  /** Use a fixed frame rate instead of delta time */
  useFixedFrameRate: boolean;
  /** Fixed time step in seconds */
  fixedTimeStep: number;
  /** Unified FPS target across systems */
  fixedUnifiedFPS: number;
  /** Target CPU frame rate */
  fixedCPUFPS: number;
  /** Target GPU frame rate */
  fixedGPUFPS: number;
  /** Minimum clamp for delta time */
  clampMin: number;
  /** Maximum clamp for delta time */
  clampMax: number;
  /** Enable automatic canvas resize on window size change */
  resizeCanvas: boolean;
  /** Update the camera's aspect and projection matrix when the canvas resizes */
  cameraResizeUpdate: boolean;
  /** Maintain a fixed aspect ratio */
  useFixedAspectRatio: boolean;
  /** Use device pixel ratio (DPR) to set resolution of display */
  useDPR: boolean;
  /** Aspect ratio controller, e.g., '16:9' */
  fixedAspectController: string;
  /** Width part of fixed aspect ratio */
  aspectWidth: number;
  /** Height part of fixed aspect ratio */
  aspectHeight: number;
  /** Manually specify the device pixel ratio of the scene */
  dprValue: number;
};

type GLTFLoadCallback = ( gltf: GLTF ) => void;

class App {

	/**
	 * @type {THRE}
   * @private
   * The renderer instance, can either be the modern Three.js Renderer or the legacy WebGLRenderer
   */
	#renderer!: ThreeRenderer;
	/**
 	 * @type {RendererEnum}
   * Specifies which renderer type is currently being used.
   */
	rendererType!: RendererEnum;
	/**
 	 * @type {THREE.PerspectiveCamera | THREE.OrthographicCamera}
   * @private
   * The camera used in the application.
   */
	#camera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
	#scene!: THREE.Scene;
	#clock!: THREE.Clock;
	#controls!: OrbitControls;
	#stats!: Stats;
	#debugUI!: GUI;
	#debugUIMap: Record<string, GUI> = {};
	#rendererSettings: RendererSettings = {
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
		dprValue: window.devicePixelRatio,
	};

	#gltfLoader!: GLTFLoader;
	#fontLoader!: FontLoader;
	#ktx2Loader!: KTX2Loader;

	#postProcessingPipelines: Record<string, PostProcessing > = {};
	#postProcessingMachine: PostProcessingMachine | null = null;

	#computeShaders: ComputeNode[] = [];

	deltaTimeUniform: UniformNode<number> = uniform( 0 );
	timeUniform: UniformNode<number> = uniform( 0 );

	#handleRender: ( renderer: ThreeRenderer, scene: THREE.Scene<Object3DEventMap>, camera: THREE.Camera ) => void = () => {

		console.log( 'define render handleer' );

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

	async #getRenderer( rendererType: RendererEnum ) {

		const documentCanvas = document.getElementById( 'c' ) as HTMLCanvasElement;

		if ( documentCanvas === null ) {

			throw new Error( 'Cannot get canvas' );

		}

		console.log( 'test getRenderer' );

		this.#renderer = new WebGPURenderer( {
			canvas: documentCanvas,
			forceWebGL: rendererType === 'WebGLFallback' ? true : false
		} );

		await this.#renderer.init();

		this.rendererType = 'WebGPU';

		this.#handleRender = ( renderer: ThreeRenderer, scene: THREE.Scene<Object3DEventMap>, camera: THREE.Camera ) => {

			renderer.render( scene, camera );

		};

		this.#renderer.shadowMap.enabled = true;

	}

	async #setupRenderer( options: AppInitializationOptions ) {

		await this.#getRenderer( options.rendererType ? options.rendererType : 'WebGPU' );

		this.#renderer.setSize( window.innerWidth, window.innerHeight );
		this.#renderer.setClearColor( 0x000000 );
		document.body.appendChild( this.#renderer.domElement );

		this.#stats = new Stats();
		document.body.appendChild( this.#stats.dom );

		const aspect = window.innerWidth / window.innerHeight;
		const cameraType = options.initialCameraMode ? options.initialCameraMode : 'perspective';

		if ( options.fixedFrameRate !== undefined ) {

			this.#rendererSettings.fixedUnifiedFPS = options.fixedFrameRate;
			this.#rendererSettings.fixedCPUFPS = options.fixedFrameRate;
			this.#rendererSettings.fixedGPUFPS = options.fixedFrameRate;
			this.#rendererSettings.useFixedFrameRate = true;

		}

		if ( cameraType === 'perspective' ) {

			this.#camera = new THREE.PerspectiveCamera( 50, aspect, 0.1, 2000 );

			this.#controls = new OrbitControls( this.#camera, this.#renderer.domElement );
			// Smooths camera movement
			this.#controls.enableDamping = true;
			// Explicitly set camera's target to the default of 0, 0, 0
			this.#controls.target.set( 0, 0, 0 );
			this.#controls.update();

		} else {

			this.#camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );

		}

		this.#scene = new THREE.Scene();

		this.#debugUI = new GUI();
		if ( options.debug ) {

			this.#addRendererDebugGui();

		}


	}

	async #setupProject( options: AppInitializationOptions ) {

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

		this.#debugUIMap[ 'Resize Values' ].add( this.#rendererSettings, 'dprValue', [ 0.1, 0.5, 1.0, 2.0, 3.0, window.devicePixelRatio ] ).onChange( () => {

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

				// # of times per second to update the state (called cpuFrameInterval but also just for any state update)
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

		// TODO: Determine some way to make scheduling of compute shaders more flexible
		// I.E before or after this.onStep

		for ( const computeShader of this.#computeShaders ) {

			this.compute( computeShader );

		}

		//this.#controls.update( deltaTime );

	}

	scheduleComputeShaders( computeShaders: ComputeNode[] ) {

		this.#computeShaders.push( ...computeShaders );

	}

	compute( fn: ComputeNode | ComputeNode[] ) {

		this.#renderer.computeAsync( fn );

	}

	#render( deltaTime: number ) {

		// App specific code executed per render
		this.onRender( deltaTime );
		this.#handleRender( this.#renderer, this.#scene, this.#camera );

	}

	#onWindowResize() {

		const { cameraResizeUpdate, useFixedAspectRatio, aspectWidth, aspectHeight } = this.#rendererSettings;

		let canvasWidth = window.innerWidth;
		let canvasHeight = window.innerHeight;

		const dpr = this.#rendererSettings.dprValue ? this.#rendererSettings.dprValue : window.devicePixelRatio;

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

			if ( this.#camera.type === 'PerspectiveCamera' ) {

				( this.#camera as THREE.PerspectiveCamera ).aspect = useFixedAspectRatio ?
					aspectWidth / aspectHeight :
					window.innerWidth / window.innerHeight;

			}

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

		if ( options.projectName ) {

			document.title = options.projectName;

		}

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

	async loadGLSLShader( filePath: string ) {

		const shaderFile = await fetch( filePath );
		const shaderText = await shaderFile.text();
		return shaderText;

	}

	#setupKTX2Loader() {

		this.#ktx2Loader = new KTX2Loader();
		this.#ktx2Loader.setTranscoderPath( './libs/basis/' );
		this.#ktx2Loader.detectSupport( this.#renderer );

	}

	async loadKTX2( path: string, srgb = true ): Promise<THREE.CompressedTexture> {

		if ( this.#ktx2Loader === undefined ) {

			this.#setupKTX2Loader();

		}

		return new Promise( ( resolve, reject ) => {

			this.#ktx2Loader.load( path, ( texture ) => {

				if ( srgb ) {

					texture.encoding = THREE.sRGBEncoding;

				}

				resolve( texture );

			} );

		} );

	}

	async loadTexture( path: string, srgb = true ): Promise<THREE.Texture> {

		if ( path.endsWith( '.ktx2' ) ) {

			return this.loadKTX2( path, srgb );

		} else {

			return new Promise( ( resolve, reject ) => {

				const loader = new THREE.TextureLoader();
				loader.load( path, ( texture ) => {

					if ( srgb ) {

						texture.colorSpace = THREE.SRGBColorSpace;

					}

					resolve( texture );

				} );

			} );

		}

	}

	loadModel( path: string, loadCallback: GLTFLoadCallback ) {

		if ( this.#gltfLoader === undefined ) {

			this.#gltfLoader = new GLTFLoader();

		}

		this.#gltfLoader.setPath( './resources/models/' );
		this.#gltfLoader.load( path, loadCallback );

	}

	async loadFont( path: string ): Promise<Font> {

		if ( this.#fontLoader === undefined ) {

			this.#fontLoader = new FontLoader();

		}

		return new Promise( ( resolve, reject ) => {

			this.#fontLoader.load( path, ( font ) => {

				resolve( font );

			} );


		} );

	}

	async loadGLTF( path: string ) {

		if ( this.#gltfLoader === undefined ) {

			this.#gltfLoader = new GLTFLoader();

		}

		return new Promise( ( resolve, reject ) => {

			this.#gltfLoader.load( path, ( gltf: GLTF ) => {

				resolve( gltf );

			} );

		} );

	}

	disposeEnvironment( tex: THREE.Texture ) {

		if ( tex instanceof THREE.Texture ) {

			tex.dispose();

			if ( tex.source.data instanceof ImageBitmap ) {

				tex.source.data.close();

			}

		}


	}

	loadHDRBackground( path: string ) {

		const rgbeLoader = new HDRLoader();

		// Dispose of existing environment
		if ( this.#scene.environment !== null ) {

			this.disposeEnvironment( this.#scene.environment );

			console.log( this.#scene.environment );

		}

		if ( this.#scene.background && this.#scene.background instanceof THREE.Texture ) {

			this.disposeEnvironment( this.#scene.background );

		}

		rgbeLoader.load( path, ( hdrTexture ) => {

			hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

			this.#scene.background = hdrTexture;
			this.#scene.environment = hdrTexture;

		} );

	}

	async loadShaders( path: string ) {

		const vsh = await fetch( `${path}-vsh.glsl` ).then( ( res ) => res.text() );
		const fsh = await fetch( `${path}-fsh.glsl` ).then( ( res ) => res.text() );

		return { vertexShader: vsh, fragmentShader: fsh };

	}

	createPostProcessingPipeline( name: string ) {

		// lazily create post-processing
		if ( this.#postProcessingMachine === null ) {

			this.#postProcessingMachine = new PostProcessingMachine( this.#renderer );

		}

		return this.#postProcessingPipelines[ name ] = this.#postProcessingMachine.createPostProcessingPipeline();

	}

	get Scene() {

		return this.#scene;

	}

	get BackgroundMap() {

		return this.Scene.background;

	}

	get EnvironmentMap() {

		return this.Scene.environment;

	}

	setDPR( dprValue: number ) {

		this.#rendererSettings.dprValue = dprValue;

	}

	get Camera() {

		return this.#camera;

	}

	set ColorSpace( colorSpace: THREE.ColorSpace ) {

		this.#renderer.outputColorSpace = colorSpace;

	}

	get PerspectiveCamera() {

		return ( this.#camera as THREE.PerspectiveCamera );

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

	get PostProcessing() {

		return this.#postProcessingPipelines;

	}


	changeRenderHandler( renderCallback: RenderCallback ) {

		this.#handleRender = renderCallback;

	}

}

export { App };
