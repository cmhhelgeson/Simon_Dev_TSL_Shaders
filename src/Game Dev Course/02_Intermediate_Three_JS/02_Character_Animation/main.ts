import * as THREE from 'three';
import { App } from '../../App';
import { GLTF } from 'three/examples/jsm/Addons.js';


// GLTF Scene can contain an array of animations
// AnimationClip class: can take keyframes of the animation

interface SettingsInterface {
	currentClipName: string;
}

class CharacterAnimation extends App {

	#mixer: THREE.AnimationMixer;
	#settings: SettingsInterface;

	constructor() {

		super();

		this.#settings.currentClipName = 'idle';

	}

	async onSetupProject( projectFolder?: GUI ) {

		this.Camera.position.set( 3, 2, 3 );
		this.Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		this.CameraControls.target.set( 0, 1, 0 );

		this.Scene.background = new THREE.Color( 0x000000 );

		this.#setupBasicScene();

	}

	#setupBasicScene() {

		// Light
		const light = new THREE.DirectionalLight( 0xFFFFFF, 2.0 );
		light.position.set( 5, 20, 5 );
		light.lookAt( new THREE.Vector3() );
		light.castShadow = true;
		light.shadow.mapSize.setScalar( 1024 );
		light.shadow.camera.near = 1.0;
		light.shadow.camera.far = 100;
		light.shadow.camera.left = - 5;
		light.shadow.camera.right = 5;
		light.shadow.camera.top = 5;
		light.shadow.camera.bottom = - 5;
		light.shadow.bias = - 0.001;
		this.Scene.add( light );

		// Ground
		const groundGeometry = new THREE.PlaneGeometry( 4, 4 );
		const groundMaterial = new THREE.MeshStandardMaterial( {
			color: 0x202020,
			metalness: 0.1,
			roughness: 0.6,
		} );
		const groundMesh = new THREE.Mesh( groundGeometry, groundMaterial );
		groundMesh.rotation.x = - Math.PI / 2;
		groundMesh.receiveShadow = true;
		this.Scene.add( groundMesh );

		this.Scene.backgroundBlurriness = 0.4;
		this.Scene.backgroundIntensity = 0.5;
		this.Scene.environmentIntensity = 0.5;


		this.loadRGBE( './resources/skybox/rosendal_park_sunset_1k.hdr' );


		const isMesh = ( obj: THREE.Object3D ): obj is THREE.Mesh => {

			return ( obj as THREE.Mesh ).isMesh === true;

		};



		const modelCallback = ( gltf: GLTF ) => {

			gltf.scene.scale.setScalar( 2 );
			gltf.scene.traverse( ( c ) => {

				c.castShadow = true;
				c.receiveShadow = true;

				if ( isMesh( c ) && c.material instanceof THREE.MeshStandardMaterial ) {

					c.material.metalness = 0.25;
					c.material.metalness = 1;

				}

			} );

			const prevAnimation = null;
			const actions = [];

			for ( let animIndex = 0; animIndex < gltf.animations.length; animIndex ++ ) {

				const clip = gltf.animations[ animIndex ];
				const action = this.#mixer.clipAction( clip );

				actions[ clip.name ] = action;

				const animationFolder = this.DebugGui.addFolder( 'Animation' );
				animationFolder.add( this.#settings, 'currentClipName' ).onChange( () => {

				} );

			}

			this.Scene.add( gltf.scene );
			this.#mixer = new THREE.AnimationMixer( gltf.scene );
			// Returns gltf animation as animation action
			const action = this.#mixer.clipAction( gltf.animations[ 1 ] );
			action.play();

		};

		this.loadModel( 'character.glb', modelCallback );

	}

	onStep( deltaTime: number, totalTimeElapsed: number ) {

		if ( this.#mixer ) {


			this.#mixer.update( deltaTime );

		}


	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new CharacterAnimation();
app.initialize( {
	debug: true,
	projectName: 'Character Animation',
	rendererType: 'WebGL',
	initialCameraMode: 'perspective',
} );
