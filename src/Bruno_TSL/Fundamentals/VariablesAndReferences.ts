import { App } from '../../utils/App';
import * as THREE from 'three/webgpu';
import { checker, sin, time, uv, vec3, positionLocal, uniform, materialColor, positionWorld } from 'three/tsl';


class VariablesAndReferences extends App {

	torusMaterial: THREE.MeshStandardNodeMaterial = new THREE.MeshStandardNodeMaterial();

	async onSetupProject(): Promise<void> {

		this.PerspectiveCamera.fov = 35;
		this.PerspectiveCamera.position.x = 5;
		this.PerspectiveCamera.position.y = 4.5;
		this.PerspectiveCamera.position.z = 2.5;

		this.setClearColor( 0x111111 );
		const textureColor = await this.loadTexture( './resources/images/floor-color.jpg' );

		const effectController = {
			// Snake parameters
			// Basic oscillation parameters
			oscilationRange: uniform( 2 ),
			oscilationSpeed: uniform( 3.9 ),
			oscilationStrength: uniform( 4 )
		};

		const planeGeometry = this.registerGeometry( 'plane', new THREE.PlaneGeometry( 10, 10, 10, 10 ) );
		const torusKnotGeometry = this.registerGeometry( 'torus', new THREE.TorusKnotGeometry( 0.5, 0.24, 128, 32 ) );

		// Torus Knot
		const { torusMaterial } = this;
		torusMaterial.colorNode = positionWorld;

		// BASIC OSCILATION
		const adjustedTime = time.mul( effectController.oscilationSpeed );
		// NOTE: Mesh will still only oscilate within range of -1 to 1, vertices will just be less organized together the higher the strength of the oscilation is.
		const yOffsetFromStartPosition = positionLocal.y.mul( effectController.oscilationStrength );
		const zOffset = sin( adjustedTime.add( yOffsetFromStartPosition ) ).mul( effectController.oscilationRange );
		torusMaterial.positionNode = positionLocal.add( vec3( 0, 0, zOffset ) );

		const torusMesh = new THREE.Mesh( torusKnotGeometry, torusMaterial );
		torusMesh.castShadow = true;
		torusMesh.receiveShadow = true;
		torusMesh.position.y = 1;
		this.Scene.add( torusMesh );

		// Plane
		const planeMaterial = new THREE.MeshStandardNodeMaterial( {
			map: textureColor,
			transparent: true
		} );
		const fade = uv().sub( 0.5 ).length().smoothstep( 0.5, 0.2 );
		planeMaterial.opacityNode = fade;//  = vec4( vec3( fade ), 1 );
		const pattern = vec3( checker( uv().mul( 4 ) ) );
		planeMaterial.colorNode = materialColor.mul( pattern );
		const planeMesh = new THREE.Mesh( planeGeometry, planeMaterial );
		planeMesh.rotation.x = - Math.PI * 0.5;
		planeMesh.receiveShadow = true;
		this.Scene.add( planeMesh );

		// Lights
		const directionalLight = new THREE.DirectionalLight( 0xffffff, 4.5 );
		directionalLight.castShadow = true;
		directionalLight.position.set( 2, 0.75, - 1 ).normalize().multiplyScalar( 10 );
		this.LightManager.setDirectionalLightShadowFrustrum( directionalLight, 10 );
		directionalLight.shadow.camera.near = 0.01;
		directionalLight.shadow.camera.far = 20;
		directionalLight.shadow.radius = 3;
		directionalLight.shadow.normalBias = 0.1;
		this.Scene.add( directionalLight );

		const ambientLight = new THREE.AmbientLight( 0x859dff, 1 );
		this.Scene.add( ambientLight );

		const params = this.Inspector.createParameters( 'Chapter 4. Variables and References' );

		const oscilationFolder = params.addFolder( 'Oscilation' );
		oscilationFolder.add( effectController.oscilationRange, 'value', 0.1, 2 ).step( 0.1 ).name( 'Oscilation Range' );
		oscilationFolder.add( effectController.oscilationSpeed, 'value', 0.1, 5 ).step( 0.1 ).name( 'Oscilation Speed' );
		oscilationFolder.add( effectController.oscilationStrength, 'value', 0.1, 5 ).step( 0.1 ).name( 'Oscilation Strength' );

	}

}

const app = new VariablesAndReferences();
app.initialize( {
	projectName: 'Variables and References',
	debug: true
} );
