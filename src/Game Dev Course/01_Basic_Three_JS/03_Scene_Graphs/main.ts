/* eslint-disable compat/compat */
import * as THREE from 'three/webgpu';

import { App } from '../App';

// Scene Graph: Basic data strucutre to manage complexity of scene
// Graph represents everything in scene and everythign that scene
// depends on for renderers.
// Scene Graph exists in a tree structure:
//	Nodes with children
//	       	[]
// 	        /\
// 	      []  []
//        /\  /\
//			 [][][][]
// Includes meshes, particle systems, lights, cameras, etc
// Tree forms a transform hierarchy
// Each parent's transform applies to the child's transform as well
// So if the top most node rotates 21 degrees, all it's children will rotate
// 21 degrees as well, then the children's indivudal transforms will be applied.

interface Planet {
	distance: number,
	color: THREE.Color,
	size: number,
	name: string,
	moons: Planet[],
	speed: number,
}

interface OrbitInfo {
	target: THREE.Group,
	speed: number
}

class BasicSolarSystem extends App {

	#orbits: OrbitInfo[] = [];

	#settings = {
		rotateEarth: true,
		rotateMoon: true,
		earthOrbitalPlane: 0.0,
	};


	constructor() {

		super();

	}


	async onSetupProject() {

		const planets: Planet[] = [
			{
				name: 'earth',
				size: 5,
				distance: 60,
				color: new THREE.Color( 0x0000ff ),
				speed: 1,
				moons: [
					{
						name: 'moon',
						distance: 8,
						size: 1,
						speed: 3,
						color: new THREE.Color( 0x888888 ),
						moons: [],
					}
				]
			}, {
				name: 'mars',
				size: 4,
				color: new THREE.Color( 0xff0000 ),
				distance: 100,
				speed: 0.5,
				moons: [
					{
						name: 'phobos',
						size: 1,
						color: new THREE.Color( 0x888888 ),
						distance: 7,
						speed: 1,
						moons: [],
					}, {
						name: 'delmos',
						size: 1,
						color: new THREE.Color( 0x888888 ),
						distance: 11,
						speed: 4,
						moons: [],
					}
				]
			}
		];

		this.#createSolarSystem3( planets );

	}

	/*#createSolarSystem() {

		const sunGeo = new THREE.SphereGeometry( 40, 32, 32 );
		const sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
		this.#sun = new THREE.Mesh( sunGeo, sunMaterial );

		const earthGeo = new THREE.SphereGeometry( 5, 32, 32 );
		const earthMaterial = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
		this.#earth = new THREE.Mesh( earthGeo, earthMaterial );
		this.#earth.position.set( 60, 0, 0 );

		const moonGeo = new THREE.SphereGeometry( 1, 32, 32 );
		const moonMaterial = new THREE.MeshBasicMaterial( { color: 0x888888 } );
		const moon = new THREE.Mesh( moonGeo, moonMaterial );
		moon.position.set( 8, 0, 0 );
		this.#earth.add( moon );

		this.#sun.add( this.#earth );
		this.#scene.add( this.#sun );

	}

	#createSolarSystem2() {

		// Create new mesh.
		const moonGeo = new THREE.SphereGeometry( 1, 32, 32 );
		const moonMaterial = new THREE.MeshBasicMaterial( { color: 0x888888 } );
		const moon = new THREE.Mesh( moonGeo, moonMaterial );
		moon.position.set( 8, 0, 0 );

		// Create a group that is inserted in lieu of the object itself.
		this.#moonOrbit = new THREE.Group();
		this.#moonOrbit.add( moon );

		// Create new mesh.
		const earthGeo = new THREE.SphereGeometry( 5, 32, 32 );
		const earthMaterial = new THREE.MeshBasicMaterial( { color: 0x0000ff } );
		this.#earth = new THREE.Mesh( earthGeo, earthMaterial );
		this.#earth.position.set( 60, 0, 0 );

		// Create group
		this.#earthOrbit = new THREE.Group();
		this.#earthOrbit.add( this.#earth );

		// Add orbit from one layer down.
		this.#earth.add( this.#moonOrbit );

		// Create new mesh
		const sunGeo = new THREE.SphereGeometry( 40, 32, 32 );
		const sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
		this.#sun = new THREE.Mesh( sunGeo, sunMaterial );

		// Create group
		//na

		// Add orbit from one layer down
		this.#sun.add( this.#earthOrbit );
		this.#scene.add( this.#sun );

		// From here, in the step function, we rotate the orbits themselves rather than the object

	} */

	#createCelestialBody( parent: THREE.Mesh, planet: Planet ) {

		const geo = new THREE.SphereGeometry( planet.size, 32, 32 );
		const material = new THREE.MeshBasicMaterial( { color: planet.color } );
		const planetMesh = new THREE.Mesh( geo, material );
		planetMesh.position.set( planet.distance, 0, 0 );

		const planetOrbit = new THREE.Group();
		planetOrbit.add( planetMesh );

		this.#orbits.push( { target: planetOrbit, speed: planet.speed } );
		parent.add( planetOrbit );

		for ( const moon of planet.moons ) {

			this.#createCelestialBody( planetMesh, moon );

		}

	}

	#createSolarSystem3( planetData: Planet[] ) {

		const sunGeo = new THREE.SphereGeometry( 40, 32, 32 );
		const sunMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
		const sun = new THREE.Mesh( sunGeo, sunMaterial );

		this.Scene.add( sun );

		for ( const planet of planetData ) {

			this.#createCelestialBody( sun, planet );

		}

	}


	// State update function
	onStep( deltaTime: number ) {

		for ( const orbit of this.#orbits ) {

			orbit.target.rotateY( deltaTime * orbit.speed );

		}


		this.CameraControls.update( deltaTime );

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new BasicSolarSystem();
app.initialize( {
	projectName: 'Solar System',
	debug: false
} );
