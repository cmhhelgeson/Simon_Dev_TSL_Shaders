
import * as THREE from 'three/webgpu';
import { ComputeNode, UniformNode, WebGPURenderer, Scene, Camera, Object3DEventMap, PostProcessing } from 'three/webgpu';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

import Stats from 'three/addons/libs/stats.module.js';
import { Font, FontLoader } from 'three/addons/loaders/FontLoader.js';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { uniform } from 'three/tsl';
import { RenderCallback, ThreeRenderer } from './types';
import { PostProcessingMachine } from './PostProcessingMachine';
import { LightManager } from './LightManager';
import { Inspector } from 'three/examples/jsm/inspector/Inspector.js';
import { ParametersGroup } from 'three/examples/jsm/inspector/tabs/Parameters.js';
import { NodeMaterialNodeProperties } from 'three/src/materials/nodes/NodeMaterial.js';

type RendererEnum = 'WebGPU' | 'WebGLFallback';

interface AppInitializationOptions {
	/* The name of the application and the title of the page */
	projectName?: string,
	/* Flag indicating whether to provide the user debug functionality through the GUI */
	debug: boolean,
	withInspector?: boolean;
	/* The renderer to use in the project */
	rendererType?: RendererEnum,
	/* Whether the scene is first rendered using a perspective or an orthographic camera */
	initialCameraMode?: 'perspective' | 'orthographic',
	fixedFrameRate?: number
}

interface GUIRange<TKey extends string = string> {
	/** Property on the object being bound. */
	key: TKey;
	title: string;
	min: number;
	max: number;
	step: number;
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
	/** Wether to lerp between the previous and current aspect ratios */
	lerpAspectRatio: boolean;
	previousAspectWidth: number;
	previousAspectHeight: number;
	/** Previous aspect width */
	targetAspectWidth: number;
	/** Previous aspect height */
	targetAspectHeight: number;
	/** Width part of fixed aspect ratio */
	aspectWidth: number;
	/** Height part of fixed aspect ratio */
	aspectHeight: number;
	/** Manually specify the device pixel ratio of the scene */
	dprValue: number;
	/** Specify the output color space of the renderer */
	colorSpace: THREE.ColorSpace
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
	Camera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
	#scene!: THREE.Scene;
	#timer!: THREE.Timer;
	#controls!: OrbitControls;
	#stats!: Stats;
	/**
	 * The three.js Inspector, which owns the debug parameter panel. Created
	 * when `withInspector` or `debug` is set on initialization.
	 */
	#inspector!: Inspector;
	#LightManager!: LightManager;
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
		fixedAspectController: '16:9 (HD)',
		lerpAspectRatio: false,
		previousAspectWidth: 16,
		previousAspectHeight: 9,
		targetAspectWidth: 16,
		targetAspectHeight: 9,
		aspectWidth: 16,
		aspectHeight: 9,
		dprValue: window.devicePixelRatio,
		colorSpace: THREE.SRGBColorSpace,
	};

	#gltfLoader!: GLTFLoader;
	#fontLoader!: FontLoader;
	#ktx2Loader!: KTX2Loader;
	#textureLoader!: THREE.TextureLoader;

	#geometries: Record<string, THREE.BufferGeometry> = {};

	#postProcessingPipelines: Record<string, PostProcessing > = {};
	#postProcessingMachine: PostProcessingMachine | null = null;

	#computeShaders: ComputeNode[] = [];

	deltaTimeUniform: UniformNode<'float', number> = uniform( 0 );
	timeUniform: UniformNode<'float', number> = uniform( 0 );

	#handleRender: ( renderer: ThreeRenderer, scene: THREE.Scene<Object3DEventMap>, camera: THREE.Camera ) => void = () => {

		console.log( 'define render handleer' );

	};

	_handleBasicStep( deltaTime: number, totalTimeElapsed: number ) {

		this.onStep( deltaTime, totalTimeElapsed );

		// TODO: Determine some way to make scheduling of compute shaders more flexible
		// I.E before or after this.onStep

		for ( const computeShader of this.#computeShaders ) {

			this.compute( computeShader );

		}

		// Required every frame: enableDamping integrates toward the target over time,
		// so without this the camera only moves while OrbitControls' own events fire.
		if ( this.#controls ) {

			this.#controls.update( deltaTime );

		}

	}

	#handleStep: ( deltaTime: number, totalTimeElapsed: number ) => void = () => {

		console.error( 'define step handler' );

	};


	#timeSinceLastUpdate = 0;
	#timeSinceLastRender = 0;

	// Override these methods
	async onSetupProject() {
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
		this.#renderer.shadowMap.type = THREE.PCFShadowMap;

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

			this.Camera = new THREE.PerspectiveCamera( 50, aspect, 0.1, 2000 );

			this.#controls = new OrbitControls( this.Camera, this.#renderer.domElement );
			// Smooths camera movement
			this.#controls.enableDamping = true;
			// Explicitly set camera's target to the default of 0, 0, 0
			this.#controls.target.set( 0, 0, 0 );
			this.#controls.update();

		} else {

			this.Camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );

		}

		this.#scene = new THREE.Scene();

		this.#LightManager = new LightManager();

		if ( options.withInspector === undefined ) {

			options.withInspector = true;

		}

		// The debug parameters live in the Inspector, so `debug` implies it.
		if ( options.withInspector ) {

			this.#inspector = new Inspector();
			this.#renderer.inspector = this.#inspector;

		}

		if ( options.debug ) {

			this.#addRendererDebugGui();

		}

	}

	async #setupProject( options: AppInitializationOptions = {
		debug: false,
		withInspector: true,
	} ) {

		this.#handleStep = this._handleBasicStep;

		await this.#setupRenderer( options );

		this.#scene.backgroundBlurriness = 0.0;
		this.#scene.backgroundIntensity = 1.0;
		this.#scene.environmentIntensity = 1.0;

		// Initialize project
		//const projectFolder = this.#GUIManager.addFolder( options.projectName ?? 'Project' );

		// Apply project specific parameters to the scene
		await this.onSetupProject();

	}

	setClearColor( x: THREE.ColorRepresentation ) {

		this.#renderer.setClearColor( x );

	}

	/**
	 * Whether the animated aspect ratio has reached its target.
	 *
	 * Compared with an epsilon rather than equality: aspectWidth/aspectHeight are
	 * produced by a float lerp, so they approach the target asymptotically and an
	 * exact check would leave the lerping step handler installed forever.
	 */
	_isAtTargetAspectRatio() {

		const { aspectWidth, aspectHeight, targetAspectWidth, targetAspectHeight } = this.#rendererSettings;

		const EPSILON = 1e-4;

		return Math.abs( aspectWidth - targetAspectWidth ) < EPSILON &&
			Math.abs( aspectHeight - targetAspectHeight ) < EPSILON;

	}

	_changeAspectRatio() {

		let newAspectWidth = 0;
		let newAspectHeight = 0;

		// Lazy way, no parsing
		switch ( this.#rendererSettings.fixedAspectController ) {

			case '16:9 (HD)': {

				newAspectWidth = 16;
				newAspectHeight = 9;
				break;

			}

			case '4:3 (CRT)': {

				newAspectWidth = 4;
				newAspectHeight = 3;
				break;

			}

			case '1:85:1 (Standard)': {

				newAspectWidth = 1.85;
				newAspectHeight = 1;
				break;

			}

			case '2.39:1 (Anamorphic)': {

				newAspectWidth = 2.39;
				newAspectHeight = 1;
				break;

			}

			case '2.76:1 (Ultra Panavasion)': {

				newAspectWidth = 2.76;
				newAspectHeight = 1;
				break;

			}

			case '1.90:1 ("Imax")': {

				newAspectWidth = 1.90;
				newAspectHeight = 1;
				break;

			}

			case '1.43:1 (Imax Film)': {

				newAspectWidth = 1.43;
				newAspectHeight = 1;
				break;

			}

			case '4:1 (Gance)': {

				newAspectWidth = 4.0;
				newAspectHeight = 1;
				break;

			}

			case '1:1': {

				newAspectWidth = 1.0;
				newAspectHeight = 1.0;
				break;

			}

		}

		if ( this.#rendererSettings.lerpAspectRatio ) {

			// Set target aspect ratio
			this.#rendererSettings.targetAspectWidth = newAspectWidth;
			this.#rendererSettings.targetAspectHeight = newAspectHeight;

			// Set prev aspect ratio
			this.#rendererSettings.previousAspectWidth = this.#rendererSettings.aspectWidth;
			this.#rendererSettings.previousAspectHeight = this.#rendererSettings.aspectHeight;

			const startTimeElapsed = this.#timer.getElapsed();
			const duration = 1.5;

			this.#handleStep = ( deltaTime: number, totalTimeElapsed: number ) => {

				// Early return if we are no longer using an aspect ratio
				if ( ! this.#rendererSettings.useFixedAspectRatio ) {

					this._handleBasicStep( deltaTime, totalTimeElapsed );
					this.#handleStep = this._handleBasicStep;
					return;

				}

				const { previousAspectWidth, previousAspectHeight, targetAspectWidth, targetAspectHeight } = this.#rendererSettings;

				const normalizedElapsed = Math.min( ( totalTimeElapsed - startTimeElapsed ) / duration, 1 );

				this.#rendererSettings.aspectWidth = THREE.MathUtils.lerp( previousAspectWidth, targetAspectWidth, normalizedElapsed );
				this.#rendererSettings.aspectHeight = THREE.MathUtils.lerp( previousAspectHeight, targetAspectHeight, normalizedElapsed );

				this.#onWindowResize();
				this._handleBasicStep( deltaTime, totalTimeElapsed );

				if ( this._isAtTargetAspectRatio() ) {

					this.#rendererSettings.aspectWidth = targetAspectWidth;
					this.#rendererSettings.aspectHeight = targetAspectHeight;
					this.#handleStep = this._handleBasicStep;
					return;

				}

			};

			return;

		}

		this.#rendererSettings.aspectWidth = this.#rendererSettings.targetAspectWidth = newAspectWidth;
		this.#rendererSettings.aspectHeight = this.#rendererSettings.targetAspectHeight = newAspectHeight;

		this.#onWindowResize();

	}

	#addRendererDebugGui() {

		const root = this.#inspector.createParameters( 'Renderer' );

		const colorSpaceFolder = root.addFolder( 'Color Space' );
		colorSpaceFolder.add( this.#renderer, 'outputColorSpace', [
			THREE.SRGBColorSpace,
			THREE.NoColorSpace,
			THREE.LinearSRGBColorSpace,
		] );

		const timeSettings = root.addFolder( 'Time Settings' );
		timeSettings.add( this.#rendererSettings, 'useDeltaTime' );
		timeSettings.add( this.#rendererSettings, 'useFixedFrameRate' );

		const timeValues = root.addFolder( 'Time Values' );
		timeValues.add( this.#rendererSettings, 'fixedTimeStep', 0.01, 0.5 );
		const fixedCPU = timeValues.add( this.#rendererSettings, 'fixedCPUFPS', 1, 60 ).step( 1 );
		const fixedGPU = timeValues.add( this.#rendererSettings, 'fixedGPUFPS', 1, 60 ).step( 1 );
		// Set CPU and GPU to run at same rate when useFixedFrameRate === true
		timeValues.add( this.#rendererSettings, 'fixedUnifiedFPS', 1, 60 ).step( 1 ).onChange( () => {

			this.#rendererSettings.fixedCPUFPS = this.#rendererSettings.fixedUnifiedFPS;
			fixedCPU.setValue( this.#rendererSettings.fixedUnifiedFPS );
			this.#rendererSettings.fixedGPUFPS = this.#rendererSettings.fixedUnifiedFPS;
			fixedGPU.setValue( this.#rendererSettings.fixedUnifiedFPS );

		} );
		timeValues.add( this.#rendererSettings, 'clampMin', 0.01, 1.0 );
		timeValues.add( this.#rendererSettings, 'clampMax', 0.01, 1.0 );

		const resizeSettings = root.addFolder( 'Resize Settings' );

		resizeSettings.add( this.#rendererSettings, 'resizeCanvas' ).onChange( () => {

			this.#onWindowResize();

		} );
		resizeSettings.add( this.#rendererSettings, 'cameraResizeUpdate' ).onChange( () => {

			this.#onWindowResize();

		} );
		resizeSettings.add( this.#rendererSettings, 'useFixedAspectRatio' ).onChange( () => {

			this.#onWindowResize();

		} );
		resizeSettings.add( this.#rendererSettings, 'useDPR' ).onChange( () => {

			this.#onWindowResize();

		} );

		const resizeValues = root.addFolder( 'Resize Values' );
		resizeValues.add( this.#rendererSettings, 'lerpAspectRatio' );
		resizeValues.add( this.#rendererSettings, 'fixedAspectController', [
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

			this._changeAspectRatio();

		} ).name( 'Fixed Aspect Ratio' );

		resizeValues.add( this.#rendererSettings, 'dprValue', [ 0.1, 0.5, 1.0, 2.0, 3.0, window.devicePixelRatio ] ).onChange( () => {

			this.#onWindowResize();

		} );

		// Start collapsed so the renderer settings do not bury the example's own
		// parameters.
		colorSpaceFolder.close();
		timeSettings.close();
		timeValues.close();
		resizeSettings.close();
		resizeValues.close();
		root.close();

	}

	set toneMapping( toneMapping: THREE.ToneMapping ) {

		this.#renderer.toneMapping = toneMapping;

	}


	#raf() {

		requestAnimationFrame( () => {

			const { useDeltaTime, clampMin, clampMax, fixedTimeStep, useFixedFrameRate, fixedCPUFPS, fixedGPUFPS } = this.#rendererSettings;

			// THREE.Timer only advances its counters inside update(); without this call
			// getDelta() and getElapsed() both return 0 for the lifetime of the app.
			this.#timer.update();

			const timeElapsed = this.#timer.getDelta();
			const totalTimeElapsed = this.#timer.getElapsed();
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

		this.#handleStep( deltaTime, totalTimeElapsed );

	}

	scheduleComputeShaders( computeShaders: ComputeNode[] ) {

		this.#computeShaders.push( ...computeShaders );

	}

	compute( fn: ComputeNode | ComputeNode[] ) {

		return this.#renderer.computeAsync( fn );

	}

	#render( deltaTime: number ) {

		// App specific code executed per render
		this.onRender( deltaTime );
		this.#handleRender( this.#renderer, this.#scene, this.Camera );

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

			if ( this.Camera.type === 'PerspectiveCamera' ) {

				( this.Camera as THREE.PerspectiveCamera ).aspect = useFixedAspectRatio ?
					aspectWidth / aspectHeight :
					window.innerWidth / window.innerHeight;

			}

			this.Camera.updateProjectionMatrix();

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

		this.#timer = new THREE.Timer();

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

	async loadKTX2( path: string, colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace ): Promise<THREE.CompressedTexture> {

		if ( this.#ktx2Loader === undefined ) {

			this.#setupKTX2Loader();

		}

		return new Promise( ( resolve, reject ) => {

			this.#ktx2Loader.load( path, ( texture ) => {

				// encoding/sRGBEncoding were removed in three r152; colorSpace replaced them.
				texture.colorSpace = colorSpace;
				resolve( texture );

			}, undefined, reject );

		} );

	}

	async loadDataTexture( path: string ): Promise<THREE.Texture> {

		return this.loadTexture( path, THREE.NoColorSpace );

	}

	/* A basic texture loader. Loads in srgb by default */
	async loadTexture( path: string, colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace ): Promise<THREE.Texture> {

		if ( path.endsWith( '.ktx2' ) ) {

			return this.loadKTX2( path, colorSpace );

		} else {

			if ( this.#textureLoader === undefined ) {

				this.#textureLoader = new THREE.TextureLoader();

			}

			return new Promise( ( resolve, reject ) => {

				this.#textureLoader.load( path, ( texture ) => {

					texture.colorSpace = THREE.SRGBColorSpace;
					resolve( texture );

				}, undefined, reject );

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

			}, undefined, reject );


		} );

	}

	async loadGLTF( path: string ): Promise<GLTF> {

		if ( this.#gltfLoader === undefined ) {

			this.#gltfLoader = new GLTFLoader();

		}

		return new Promise( ( resolve, reject ) => {

			this.#gltfLoader.load( path, ( gltf: GLTF ) => {

				resolve( gltf );

			}, undefined, reject );

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

	async getDebugShader( object: THREE.Object3D ) {

		const debugShader = await this.#renderer.debug.getShaderAsync( this.Scene, this.Camera, object );
		console.log( debugShader.fragmentShader );

	}

	get EnvironmentMap() {

		return this.Scene.environment;

	}

	setDPR( dprValue: number ) {

		this.#rendererSettings.dprValue = dprValue;

	}

	set ColorSpace( colorSpace: THREE.ColorSpace ) {

		this.#renderer.outputColorSpace = colorSpace;

	}

	get PerspectiveCamera() {

		return ( this.Camera as THREE.PerspectiveCamera );

	}

	get CameraControls() {

		return this.#controls;

	}

	get Stats() {

		return this.#stats;

	}

	get LightManager() {

		return this.#LightManager;

	}

	get Inspector() {

		return this.#inspector as Inspector;

	}

	/**
	 * Adds a named folder under `parent` and fills it with one slider per range.
	 *
	 * Binding `ranges` to the keys of `baseObject` means a mistyped key is a
	 * compile error rather than a silently missing control.
	 *
	 * @returns the folder, so callers can add further controls to it.
	 */
	addFolderWithRanges<T extends Record<string, UniformNode<'float', number>>>(
		parent: ParametersGroup,
		name: string,
		baseObject: T,
		ranges: GUIRange<Extract<keyof T, string>>[]
	) {

		const folder = parent.addFolder( name );

		for ( const range of ranges ) {

			// Resolve the indexed access to a concrete node before calling add(),
			// or the overload cannot prove 'value' is one of its numeric keys.
			const node: UniformNode<'float', number> = baseObject[ range.key ];

			folder.add( node, 'value', range.min, range.max ).step( range.step ).name( range.title );

		}

		return folder;

	}

	get PostProcessing() {

		return this.#postProcessingPipelines;

	}


	changeRenderHandler( renderCallback: RenderCallback ) {

		this.#handleRender = renderCallback;

	}

	registerGeometry( geoName: string, geo: THREE.BufferGeometry ) {

		this.#geometries[ geoName ] = geo;
		return this.#geometries[ geoName ];

	}

	registerMaterial(
		material: THREE.NodeMaterial,
		properties: Partial<NodeMaterialNodeProperties>
	) {

		material.dispose();
		material.positionNode = null;
		material.colorNode = null;
		material.opacityNode = null;

		Object.assign( material, properties );
		material.needsUpdate = true;

	}

	dispose() {

		for ( const geo of Object.values( this.#geometries ) ) {

			geo.dispose();

		}

		this.#geometries = {};

		this.#scene.dispose();
		this.#renderer.dispose();

	}

}

export { App };
