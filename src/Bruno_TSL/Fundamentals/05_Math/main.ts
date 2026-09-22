import { App } from '../../../utils/App';
import * as THREE from 'three/webgpu';
import { sin, time, uv, vec3, positionLocal, uniform, materialColor, positionWorld, Fn, hash, rand, mx_noise_float, rotate, mx_noise_vec3, positionView } from 'three/tsl';
import { NodeMaterialNodeProperties } from 'three/src/materials/nodes/NodeMaterial.js';

class MathApp extends App {

	torusMaterial: THREE.MeshStandardNodeMaterial = new THREE.MeshStandardNodeMaterial();
	colorShader: string = 'Ground Material';
	opacityShader: string = 'Ground Fade';
	torusColorShader: string = '7. MX Noise x Position World';
	torusPositionShader: string = 'Simple Rotation';

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
			oscilationRange: uniform( 1 ),
			oscilationSpeed: uniform( 1 ),
			oscilationStrength: uniform( 1.5 ),
			uvCellSize: uniform( 100 )
		};

		const planeGeometry = this.registerGeometry( 'plane', new THREE.PlaneGeometry( 10, 10, 10, 10 ) );
		const torusKnotGeometry = this.registerGeometry( 'torus', new THREE.TorusKnotGeometry( 0.5, 0.24, 128, 32 ) );

		// Torus Knot
		const { torusMaterial } = this;

		const torusMesh = new THREE.Mesh( torusKnotGeometry, torusMaterial );
		torusMesh.castShadow = true;
		torusMesh.receiveShadow = true;
		torusMesh.position.y = 1;
		this.Scene.add( torusMesh );

		const cellUV = uv().mul( effectController.uvCellSize ).toVar();

		const positionShaders: Record<string, NodeMaterialNodeProperties[ 'positionNode' ]> = {

			'Oscilation': Fn( () => {

				const adjustedTime = time.mul( effectController.oscilationSpeed );
				// NOTE: Mesh will still only oscilate within range of -1 to 1, vertices will just be less organized together the higher the strength of the oscilation is.
				const yOffsetFromStartPosition = positionLocal.y.mul( effectController.oscilationStrength );
				const zOffset = sin( adjustedTime.add( yOffsetFromStartPosition ) ).mul( effectController.oscilationRange );
				return positionLocal.add( vec3( 0, 0, zOffset ) );

			} )(),

			'Simple Rotation': Fn( () => {

				const angle = time.add( positionLocal.y ).sin().mul( effectController.oscilationStrength );

				const newXZ = rotate( positionLocal.xz, angle );

				return vec3(
					newXZ.x,
					positionLocal.y,
					newXZ.y
				);

			} )(),

		};

		const colorShaders: Record<string, NodeMaterialNodeProperties[ 'colorNode' ]> = {

			'Ground Material': Fn( () => {

				return materialColor;

			} )(),

			'Position World': Fn( () => {

				return positionWorld;

			} )(),

			'1. Sin Time': Fn( () => {

				return sin( time );

			} )(),

			// Move sin of time from range [-1 to 1] -> [0, 1]
			// Also possible with the remap node

			'2. Offset Sin Time': Fn( () => {

				return time.sin().mul( 0.5 ).add( 0.5 );

			} )(),

			'3. Hashed': Fn( () => {

				return hash( cellUV );

			} )(),

			'4. Rand': Fn( () => {

				return vec3( rand( uv() ) );

			} )(),

			'5. Floored Rand': Fn( () => {

				const pattern = rand( cellUV.floor() );
				return pattern;

			} )(),

			'6. MaterialX Noise': Fn( () => {

				const noise = mx_noise_vec3( uv().mul( 50, 10 ) );
				return noise;

			} )(),

			'7. MX Noise x Position World': Fn( () => {

				const noise = mx_noise_vec3( positionWorld.mul( 10 ) );
				return noise;

			} )(),

			'8. MX Noise x Position View': Fn( () => {

				const noise = mx_noise_vec3( positionView.mul( 10 ) );
				return noise;

			} )(),

		};

		const opacityShaders: Record<string, NodeMaterialNodeProperties[ 'opacityNode' ]> = {

			'Ground Fade': Fn( () => {

				const fade = uv().sub( 0.5 ).length().smoothstep( 0.5, 0.2 );
				return fade;

			} )(),

		};

		// Plane
		const planeMaterial = new THREE.MeshStandardNodeMaterial( {
			map: textureColor,
			transparent: true
		} );

		this.registerMaterial( planeMaterial, {
			opacityNode: opacityShaders[ 'Ground Fade' ],
			colorNode: colorShaders[ 'Ground Material' ]
		} );

		this.registerMaterial( torusMaterial, {
			colorNode: colorShaders[ this.torusColorShader ],
			positionNode: positionShaders[ this.torusPositionShader ]
		} );

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
		const shadersFolder = params.addFolder( 'Shaders' );
		const planeMaterialFolder = shadersFolder.addFolder( 'Plane' );
		const torusMaterialFolder = shadersFolder.addFolder( 'Torus' );
		planeMaterialFolder.add( this, 'colorShader', Object.keys( colorShaders ).sort() ).onChange( () => {

			this.registerMaterial( planeMaterial, {
				...planeMaterial,
				colorNode: colorShaders[ this.colorShader ]
			} );

		} ).name( 'Color Node' );

		planeMaterialFolder.add( this, 'opacityShader', Object.keys( opacityShaders ) ).onChange( () => {

			this.registerMaterial( planeMaterial, {
				...planeMaterial,
				opacityNode: opacityShaders[ this.opacityShader ]
			} );

		} ).name( 'Opacity Node' );

		const hashFolder = params.addFolder( 'Shader Params' );
		hashFolder.add( effectController.uvCellSize, 'value', 5, 100 ).step( 5 ).name( 'UV Cell Size' );

		torusMaterialFolder.add( this, 'torusColorShader', Object.keys( colorShaders ) ).onChange( () => {

			this.registerMaterial( torusMaterial, {
				...torusMaterial,
				colorNode: colorShaders[ this.torusColorShader ]
			} );

		} ).name( 'Color Node' );
		torusMaterialFolder.add( this, 'torusPositionShader', Object.keys( positionShaders ) ).onChange( () => {

			this.registerMaterial( torusMaterial, {
				...torusMaterial,
				positionNode: positionShaders[ this.torusPositionShader ]
			} );

		} ).name( 'Position Node' );

	}

}

const app = new MathApp();
app.initialize( {
	projectName: 'WebGPU & TSL Fundamentals: 05. Math',
	debug: true
} );
