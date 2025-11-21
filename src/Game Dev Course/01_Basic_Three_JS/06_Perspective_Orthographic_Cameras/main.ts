/* eslint-disable compat/compat */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Pane } from 'tweakpane';


class App {

	#threejs_: WebGPURenderer;
	#camera_ : THREE.Camera;

	#scene_: THREE.Scene;
	#clock_: THREE.Clock;
	#controls_: OrbitControls;

	#perspectiveCamera_ : THREE.PerspectiveCamera;
	#orthographicCamera_: THREE.OrthographicCamera;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	#debugParams_: any = {};

	constructor() {
	}

	async initialize() {

		this.#clock_ = new THREE.Clock( true );

		window.addEventListener( 'resize', () => {

			this.#onWindowResize_();

		}, false );

		await this.#setupProject_();

		this.#onWindowResize_();
		this.#raf_();

	}

	async #setupProject_() {

		this.#threejs_ = new WebGPURenderer();
		this.#threejs_.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.#threejs_.domElement );

		const fov = 70;
		const aspect = window.innerWidth / window.innerHeight;
		const near = 0.1;
		const far = 1000;
		this.#perspectiveCamera_ = new THREE.PerspectiveCamera( fov, aspect, near, far );

		const w = 2;
		this.#orthographicCamera_ = new THREE.OrthographicCamera( - w * aspect, w * aspect, w, - w, near, far );

		this.#camera_ = this.#perspectiveCamera_;
		this.#camera_.position.set( 2, 1, 2 );
		this.#camera_.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		this.#controls_ = new OrbitControls( this.#camera_, this.#threejs_.domElement );
		this.#controls_.enableDamping = true;
		this.#controls_.target.set( 0, 0, 0 );

		this.#scene_ = new THREE.Scene();
		this.#scene_.background = new THREE.Color( 0x000000 );

		// Setup simple scene
		const light = new THREE.DirectionalLight();
		light.position.set( 1, 2, 1 );
		light.lookAt( new THREE.Vector3( 0, 0, 0 ) );
		this.#scene_.add( light );

		const ambientLight = new THREE.AmbientLight();
		this.#scene_.add( ambientLight );

		const geometry = new THREE.BoxGeometry( 1, 1, 1 );
		const material = new THREE.MeshStandardMaterial( { color: 0xFF0000 } );
		// const mesh = new THREE.Mesh(geometry, material);
		// this.#scene_.add(mesh);

		for ( let x = - 2; x <= 2; x ++ ) {

			for ( let z = - 2; z <= 2; z ++ ) {

				const mesh = new THREE.Mesh( geometry, material );
				mesh.position.set( x * 2, 0, z * 2 );
				this.#scene_.add( mesh );

			}

		}

		// Create debug pane
		const pane = new Pane();
		const debugUI = pane.addFolder( {
			title: 'Debug',
		} );

		this.#debugParams_ = {
			camera: {
				type: 'perspective',
				perspective: 'perspective',
				orthographic: 'orthographic',
			}
		};

		debugUI.addBinding( this.#debugParams_.camera, 'type', {
			options: {
				perspective: this.#debugParams_.camera.perspective,
				orthographic: this.#debugParams_.camera.orthographic,
			}
		} ).on( 'change', ( evt ) => {

			if ( evt.value === 'perspective' ) {

				this.#camera_ = this.#perspectiveCamera_;

			} else {

				this.#camera_ = this.#orthographicCamera_;

			}

		} );

	}

	#onWindowResize_() {

		//const { cameraResizeUpdate, aspectWidth, aspectHeight, dprValue } = this.#rendererSettings;

		const canvasWidth = window.innerWidth;
		const canvasHeight = window.innerHeight;


		this.#perspectiveCamera_.aspect = window.innerWidth / window.innerHeight;
		this.#perspectiveCamera_.updateProjectionMatrix();

		// Arguments: Width, height, and whether to resize the canvas
		this.#threejs_.setSize( canvasWidth, canvasHeight, true );

		this.#threejs_.setPixelRatio( 1 );

		const dpr = window.devicePixelRatio;
		const canvas = this.#threejs_.domElement;
		canvas.style.width = window.innerWidth + 'px';
		canvas.style.height = window.innerHeight + 'px';
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;

		const aspect = w / h;

		this.#threejs_.setSize( w * dpr, h * dpr, false );
		// this.#camera_.aspect = aspect;

		this.#perspectiveCamera_.aspect = aspect;
		this.#perspectiveCamera_.updateProjectionMatrix();

		this.#orthographicCamera_.left = - 3 * aspect;
		this.#orthographicCamera_.right = 3 * aspect;
		this.#orthographicCamera_.updateProjectionMatrix();

	}

	#raf_() {

		requestAnimationFrame( ( t ) => {

			this.#step_( this.#clock_.getDelta() );
			this.#render_();
			this.#raf_();

		} );

	}

	#render_() {

		this.#threejs_.render( this.#scene_, this.#camera_ );

	}

	#step_( timeElapsed ) {

		this.#controls_.update( timeElapsed );
		this.#orthographicCamera_.position.copy( this.#perspectiveCamera_.position );
		this.#orthographicCamera_.quaternion.copy( this.#perspectiveCamera_.quaternion );

	}

}


let APP_: null | App = null;

window.addEventListener( 'DOMContentLoaded', async () => {

	APP_ = new App();
	await APP_.initialize();

} );
