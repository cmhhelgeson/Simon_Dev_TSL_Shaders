// Lighting is computationally expensive, which needs to be balanced against intended tone of scene
// Static Lighting: Bake lights into textures, which are then mapped onto a scene
// 	Pros: Very cheap.
//	Cons: No dynamism
// Dynamic Lighting:
// Usually we resort to approximations of lighting rather than using completely physcially
// accurate lighting
// Lambertian Lighting:
//	Need normal of surface: Relatively easy, baked into geometry or normal map
//	Need direction of light: Easy for a point light, difficult for more diffused
// 	light sources such as a campfire or the sun.
// Ambient Light:
//	Provides constant amount of light in the scene.
//	No direction.
//	Simulates a soft, indirect light
// Hemisphere Light:
//	Simulates cheap ambient light by blending between two colors
// Directional Light:
//	Infinitely far away source, like the sun which is effectively
//	infinitely far away. Since all light is parallel, the direction
// 	of the light is trivial, which means only the normal is needed.
// Spot Light:
//	Has position and direction
//	Focuses light into cone
// 	Used for simulating headlights, flashlights, etc
// Point Light:
//	Omnidirectional light that disperses in all directions.
//	Infinitely small
//	Direction must be computed from surface point to light
//	Used for light bulbs glowing objects
//
// Lights above are the most common ones that support shadows
// Shadows:
//	Absence of light
// 	Renderer can write depth of scene into a depth buffer
//	We can then use this information whether
//	a point is in shadow by testing that point's depth against the
//	depth of the depth buffer.
//	Ambient and Hemisphere Lights (No shadows since there's no direction)
//	Directional Light:
//		instead of using Perspective Camera, use an Orthographic Camera)
//	Point Lights:
//		Since they cast light in every direction, render scene six times, to capture
//		depth in every direction
//	VSMs (Virtual Shadow Maps)
//		Divide view frustrum into multiple sections, each with their own shadow map
//		Provide Resolution up close, while also catching far away details
//		at a lower resolution.
//		Cost is re-rendering the scene a few time
import { App } from '../../App';
import * as THREE from 'three';

interface SettingsType {
	directionalLightOn: boolean,
	dirLightShadowIntensity: number,
	hemiLightOn: boolean,
	hemiLightShadowIntensity: number,
}

class LightsExample extends App {

	#cube: THREE.Mesh;
	#torus: THREE.Mesh;
	#settings: SettingsType;

	constructor() {

		super();

	}


	async onSetupProject() {

		this.Camera.position.set( 0, 3, 15 );
		this.Camera.fov = 70;
		this.Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		this.#createScene();


	}

	#createScene() {


		// Create an ambient light
		// const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.1);
		// this.#scene_.add(ambientLight);

		// Create a hemisphere light
		const hemiLight = new THREE.HemisphereLight( 0xD3E2E9, 0x856B38, 0.5 );
		this.Scene.add( hemiLight );

		// Create a directional light
		const SIZE = 128;

		const dirLight = new THREE.DirectionalLight( 0xFFFFFF, 1 );
		dirLight.position.set( 5, 20, - 5 );
		dirLight.target.position.set( 0, 0, 0 );
		dirLight.castShadow = true;
		dirLight.shadow.camera.near = 0.1;
		dirLight.shadow.camera.far = 100;
		dirLight.shadow.camera.left = - SIZE;
		dirLight.shadow.camera.right = SIZE;
		dirLight.shadow.camera.top = SIZE;
		dirLight.shadow.camera.bottom = - SIZE;
		dirLight.shadow.mapSize.set( 4096, 4096 );
		this.Scene.add( dirLight );
		this.Scene.add( dirLight.target );

		// Create a spotlight
		// const spotLight = new THREE.SpotLight(0xFFFFFF, 200, 50, Math.PI / 6, 1);
		// spotLight.position.set(5, 5, 5);
		// spotLight.target.position.set(0, 0, 0);
		// spotLight.castShadow = true;
		// this.#scene_.add(spotLight);
		// this.#scene_.add(spotLight.target);

		// this.#light_ = spotLight;

		// const helper = new THREE.SpotLightHelper(spotLight);
		// this.#scene_.add(helper);

		// this.#lightHelper_ = helper;

		// Create point light
		// const pointLight = new THREE.PointLight(0xFFFFFF, 10, 1000, 2);
		// pointLight.position.set(0, 2, 0);
		// pointLight.castShadow = true;
		// this.#scene_.add(pointLight);

		// const helper = new THREE.PointLightHelper(pointLight, 0.1);
		// this.#scene_.add(helper);

		// Create a rect light
		// RectAreaLightUniformsLib.init();

		// const rectLight = new THREE.RectAreaLight(0xFFFFFF, 1, 4, 5);
		// rectLight.position.set(0, 1, 0);
		// rectLight.lookAt(new THREE.Vector3(0, 0, 1));
		// this.#scene_.add(rectLight);

		// const helper = new RectAreaLightHelper(rectLight);
		// this.#scene_.add(helper);

		// Create a floor
		const floorGeometry = new THREE.PlaneGeometry( 500, 500 );
		const floorMaterial = new THREE.MeshStandardMaterial( {
			color: 0xFFFFFF
		} );
		const floor = new THREE.Mesh( floorGeometry, floorMaterial );
		floor.rotation.x = - Math.PI / 2;
		floor.position.y = - 2;
		floor.receiveShadow = true;
		this.Scene.add( floor );

		// Some walls
		const wallGeo = new THREE.BoxGeometry( 1, 4, 10 );
		const wallMat = floorMaterial.clone();
		wallMat.color.setRGB( 0.5, 0.5, 1 );

		const wall1 = new THREE.Mesh( wallGeo, wallMat );
		wall1.position.set( - 8, 0, 0 );
		wall1.receiveShadow = true;
		wall1.castShadow = true;
		this.Scene.add( wall1 );

		const wall2 = new THREE.Mesh( wallGeo, wallMat );
		wall2.position.set( 8, 0, 0 );
		wall2.receiveShadow = true;
		wall2.castShadow = true;
		this.Scene.add( wall2 );

		// Create a floating cube
		const cubeGeo = new THREE.BoxGeometry( 1, 1, 1 );
		const cubeMat = floorMaterial.clone();
		cubeMat.color.setRGB( 1, 1, 0.5 );
		cubeMat.roughness = 0.1;

		this.#cube = new THREE.Mesh( cubeGeo, cubeMat );
		this.#cube.position.set( - 3, 0, 3 );
		this.#cube.castShadow = true;
		this.#cube.receiveShadow = true;
		this.Scene.add( this.#cube );

		// Create a torus knot
		const torusGeo = new THREE.TorusKnotGeometry( 1, 0.3, 100, 16 );
		const torusMat = floorMaterial.clone();
		torusMat.color.setRGB( 1, 0.5, 0.5 );
		this.#torus = new THREE.Mesh( torusGeo, torusMat );
		this.#torus.position.set( 3, 0, 3 );
		this.#torus.castShadow = true;
		this.#torus.receiveShadow = true;
		this.Scene.add( this.#torus );

		for ( let x = - 5; x <= 5; ++ x ) {

			const mat = floorMaterial.clone();
			mat.color.setRGB( 0.5, 1, 0.5 );
			const cube = new THREE.Mesh( cubeGeo, mat );
			cube.scale.set( 2, 10, 2 );
			cube.position.set( x * 20, 3, 0 );
			cube.castShadow = true;
			cube.receiveShadow = true;
			this.Scene.add( cube );

		}

		this.#settings = {
			dirLightShadowIntensity: 1,
			directionalLightOn: true,
			hemiLightShadowIntensity: 1,
			hemiLightOn: true,
		};

		const directionalLightFolder = this.DebugGui.addFolder( 'Directional Light' );
		directionalLightFolder.add( this.#settings, 'directionalLightOn' ).name( 'On' ).onChange( () => {

			dirLight.visible = ! dirLight.visible;

		} );
		directionalLightFolder.add( this.#settings, 'dirLightShadowIntensity', 0, 1 ).name( 'shadowIntensity' ).onChange( ( value ) => {

			dirLight.shadow.intensity = value;

		} );

		const hemiLightFolder = this.DebugGui.addFolder( 'Hemisphere Light' );
		hemiLightFolder.add( this.#settings, 'hemiLightOn' ).name( 'On' ).onChange( () => {

			hemiLight.visible = ! hemiLight.visible;

		} );

	}

	// State update function
	onStep( deltaTime: number, totalTimeElapsed: number ) {

		this.CameraControls.update( deltaTime );
		this.Stats.update();
		    // this.#light_.position.set(
		//     5 * Math.sin(this.#clock_.getElapsedTime() * 0.1),
		//     5,
		//     5 * Math.cos(this.#clock_.getElapsedTime() * 0.1));
		// this.#lightHelper_.update();

		this.#cube.rotation.z += 0.11 * deltaTime;
		this.#cube.rotation.x -= 0.2 * deltaTime;

		this.#torus.rotation.x += 0.2 * deltaTime;
		this.#torus.rotation.y -= 0.25 * deltaTime;

	}

}

// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new LightsExample();
app.initialize( {
	projectName: 'Lights Example',
	debug: false
} );
