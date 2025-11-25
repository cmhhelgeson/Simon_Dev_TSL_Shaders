/* eslint-disable compat/compat */
import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Structure of an Application.
// Separation of concerns: Design principle for separating a computer program
// into separate sections.

class App {

	// Internal state hidden to other parts of the application
	// If you're managing multiple user's application state, this
	// becomes necessary. Each user may have a renderer, but each
	// user does not need access to another user's renderer.
	#renderer!: WebGPURenderer;
	#camera!: THREE.PerspectiveCamera;
	#scene!: THREE.Scene;

	constructor() {

	}

	//
	Initialize() {

		this.#renderer = new THREE.WebGPURenderer();
		this.#renderer.setSize( window.innerWidth, window.innerHeight );
		document.body.appendChild( this.#renderer.domElement );

		const aspect = window.innerWidth / window.innerHeight;
		this.#camera = new THREE.PerspectiveCamera( 50, aspect, 0.1, 2000 );
		this.#camera.position.z = 5;

		const controls = new OrbitControls( this.#camera, this.#renderer.domElement );
		// Smooths camera movement
		controls.enableDamping = true;
		// Explicitly set camera's target to the default of 0, 0, 0
		controls.target.set( 0, 0, 0, );
		controls.update();

		this.#scene = new THREE.Scene();

		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry(),
			new THREE.MeshBasicMaterial( {
				color: 0xff0000,
				wireframe: true,
			} )
		);

		this.#scene.add( mesh );

	}

	Run() {

		// The arrow function inherits from the surrounding context of the class
		const render = () => {

			this.#renderer.render( this.#scene, this.#camera );
			requestAnimationFrame( render );

		};

		render();

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new App();
app.Initialize();
app.Run();

// Global variable version
// The code below is more straightforward, and we don't have to think about
// accessibility, but all these variables are polluting the global namespace
// and will easily come into conflict with other pieces of code as your project grows
// in complexity (i.e what happens if you have multiple cameras, scenes, etc).

// As your project grows, managing global variables gets difficult.

/*const renderer = new THREE.WebGPURenderer();

// Manually set size of the renderer
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera( 50, aspect, 0.1, 2000 );
camera.position.z = 5;

const controls = new OrbitControls( camera, renderer.domElement );
// Smooths camera movement
controls.enableDamping = true;
// Explicitly set camera's target to the default of 0, 0, 0
controls.target.set( 0, 0, 0, );
controls.update();


const scene = new THREE.Scene();

const mesh = new THREE.Mesh(
	new THREE.BoxGeometry(),
	new THREE.MeshBasicMaterial( {
		color: 0xff0000,
		wireframe: true,
	} )
);

scene.add( mesh );


const onWindowResize = () => {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

};

const render = () => {

	renderer.render( scene, camera );
	requestAnimationFrame( render );

};

render();


*/
