/* eslint-disable compat/compat */

// Mesh: instance of object out in world
// Material: Defines appearance of a surface
//	- Parameters such as color, reflectivity, input textures
//	- implemented with shaders
// Why implement a pattern separating meshes from mesh data form materials?
//	// 1. Defining the vertex data once then reusing it in multipkle isntance is more performant
//	// 2. Better implementation with GPU when using data repeatedly
// Universal Pattern:
//	Mesh Data -> BufferGeometry
//	Material -> Material
// 	Instance -> Mesh

import { App } from '../../../utils/App';
import * as THREE from 'three';


class MeshMaterialExample extends App {

	#redMaterial!: THREE.MeshBasicMaterial;

	constructor() {

		super();

	}


	async onSetupProject() {

		this.Camera.position.set( 0, 3, 5 );
		this.PerspectiveCamera.fov = 60;
		this.Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		this.CameraControls.target.set( 0, 0, 0 );

		this.Scene.background = new THREE.Color( 0x000000 );

		// Create two cubes, each with their own unique material
		const cubeGeo = new THREE.BoxGeometry( 1, 1, 1 );
		this.#redMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } );
		const cubeMesh = new THREE.Mesh( cubeGeo, this.#redMaterial );
		cubeMesh.position.x = - 2;
		this.Scene.add( cubeMesh );

		// Need to clone the material for second cube to create a new reference
		const cubeMesh2 = new THREE.Mesh( cubeGeo, this.#redMaterial.clone() );
		cubeMesh2.position.x = 2;
		this.Scene.add( cubeMesh2 );

	}

	// State update function
	onStep( deltaTime: number, totalTimeElapsed: number ) {

		this.CameraControls.update( deltaTime );
		this.Stats.update();

		const WHITE = new THREE.Color( 0xfffff );
		const RED = new THREE.Color( 0xff0000 );

		this.#redMaterial.color.lerpColors(
			WHITE, RED, Math.sin( totalTimeElapsed ) * 0.5 + 0.5
		);

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new MeshMaterialExample();
app.initialize( {
	projectName: 'Mesh Material Example',
	debug: false
} );
