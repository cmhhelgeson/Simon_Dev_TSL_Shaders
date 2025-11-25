import { App } from '../../../utils/App';
import * as THREE from 'three';


interface ParamsType {
	wireframe: boolean,
	transparent: boolean,
	opacity: number,
	cubeColor: THREE.Color,
	offset2D: {x: number, y: number},
	offset3D: {x: number, y: number, z: number}
}

class DebugGuiExample extends App {

	#redMaterial: THREE.MeshBasicMaterial;
	#params: ParamsType;

	constructor() {

		super();

	}


	async onSetupProject() {

		this.Camera.position.set( 2, 1, 2 );
		this.Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		// Create a cube
		const geo = new THREE.BoxGeometry( 1, 1, 1 );
		const mat = new THREE.MeshBasicMaterial( { color: 0xffffff } );
		const cube = new THREE.Mesh( geo, mat );
		this.Scene.add( cube );

		this.#params = {
			wireframe: false,
			transparent: false,
			opacity: 1,
			cubeColor: cube.material.color,
			offset2D: { x: 0, y: 0 },
			offset3D: { x: 0, y: 0, z: 0 },
		};

		const cubeFolder = this.DebugGui.addFolder( 'Cube' );
		cubeFolder.add( this.#params, 'wireframe' ).onChange( () => {

			cube.material.wireframe = this.#params.wireframe;

		} );
		cubeFolder.add( this.#params, 'transparent' ).onChange( () => {

			cube.material.transparent = this.#params.transparent;
			cube.material.needsUpdate = true;

		} );
		cubeFolder.add( this.#params, 'opacity', 0, 1 ).step( 0.1 ).onChange( () => {

			cube.material.opacity = this.#params.opacity;

		} );


		/*cubeFolder.addBinding( this.#params, 'cubeColor', { view: 'color', color: { type: 'float' } } ).on( 'change', ( evt ) => {

			cube.material.color.set( evt.value );

		} ); */
		cubeFolder.add( this.#params.offset3D, 'x', - 2, 2 ).onChange( () => {

			cube.position.x = this.#params.offset3D.x;

		} );

		cubeFolder.add( this.#params.offset3D, 'y', - 2, 2 ).onChange( () => {

			cube.position.y = this.#params.offset3D.y;

		} );

		cubeFolder.add( this.#params.offset3D, 'z', - 2, 2 ).onChange( () => {

			cube.position.z = this.#params.offset3D.z;

		} );

	}

	// State update function
	onStep( deltaTime: number, totalTimeElapsed: number ) {

		this.CameraControls.update( deltaTime );
		this.Stats.update();

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new DebugGuiExample();
app.initialize( {
	projectName: 'Debug Gui Example',
	debug: false
} );
