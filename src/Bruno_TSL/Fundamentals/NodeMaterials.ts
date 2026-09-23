import { App } from '../../utils/App';
import * as THREE from 'three/webgpu';
import { checker, mix, sin, positionWorld, positionView, smoothstep, time, uv, vec2, vec3, positionLocal, positionGeometry, uniform, Fn, normalWorld, normalView } from 'three/tsl';
import { NodeMaterialNodeProperties } from 'three/src/materials/nodes/NodeMaterial.js';


type ShaderType = 'Oscilation' | 'Oscilation (positionGeometry)' | 'Snake';

class NodeMaterials extends App {

	torusMaterial: THREE.MeshStandardNodeMaterial = new THREE.MeshStandardNodeMaterial();
	currentShader: ShaderType = 'Oscilation';
	positionShader: string = 'Oscilation';

	async onSetupProject(): Promise<void> {

		this.PerspectiveCamera.fov = 35;
		this.PerspectiveCamera.position.x = 5;
		this.PerspectiveCamera.position.y = 4.5;
		this.PerspectiveCamera.position.z = 2.5;

		this.setClearColor( 0x111111 );
		const textureColor = await this.loadTexture( './resources/images/floor-color.jpg' );

		const effectController = {
			// Snake parameters
			constrictionStart: uniform( 10 ),
			constrictionRange: uniform( 0 ),
			constrictionSpeed: uniform( 0.1 ),
			scaleOffset: uniform( 0.1 ),
			testUniform: uniform( 1.6 ),
			// Basic oscillation parameters
			oscilationRange: uniform( 1 ),
			oscilationSpeed: uniform( 1 ),
			oscilationStrength: uniform( 1 )
		};

		this.currentShader = 'Oscilation';

		const { constrictionStart, testUniform, constrictionRange, constrictionSpeed, scaleOffset } = effectController;

		// Torus Knot
		const torusGeometry = new THREE.TorusKnotGeometry( 0.5, 0.24, 128, 32 );
		//const torusMaterial = new THREE.MeshStandardMaterial();

		// Snake-like texture
		const constrictionPulse = sin( time.mul( constrictionSpeed ) );

		const checkerUv = uv().mul( constrictionStart ).add( constrictionPulse.mul( constrictionRange ) );
		const cellUv = checkerUv.mul( 2.0 );

		// Get the row value of every cell
		const scaleRow = cellUv.y.floor();
		// Every other cell, stagger x (more like staggering y due to uv positions on torus)
		const staggered = vec2( cellUv.x.add( scaleRow.mod( 2.0 ).mul( scaleOffset ) ), cellUv.y );

		// Dive into cells and put into range of -0.5 to 0.5
		const cell = staggered.fract().sub( 0.5 );
		const scaleDist = vec2( cell.x, cell.y.mul( testUniform ) ).length();
		const scaleMask = smoothstep( 0.32, 0.5, scaleDist ).oneMinus();

		// Alternate scale colours across the staggered lattice. The 0.5 undoes
		// checker's internal doubling so one checker cell lines up with one scale.
		const band = checker( staggered.mul( 0.5 ) );

		const rimColor = vec3( 0.01, 0.04, 0.02 );
		const scaleColor = mix( vec3( 0.05, 0.20, 0.08 ), vec3( 0.55, 0.65, 0.25 ), band );

		// torusMaterial.colorNode = mix( rimColor, scaleColor, scaleMask );

		// Basic offset checker uvs

		const slowedTime = time.mul( 0.2 );
		const { torusMaterial } = this;
		torusMaterial.colorNode = checker( uv().add( slowedTime ).mul( ( vec2( 40, 5 ) ) ) );

		// BASIC OSCILATION
		const adjustedTime = time.mul( effectController.oscilationSpeed );
		// NOTE: Mesh will still only oscilate within range of -1 to 1, vertices will just be less organized together the higher the strength of the oscilation is.
		const yOffsetFromStartPosition = positionLocal.y.mul( effectController.oscilationStrength );
		const zOffset = sin( adjustedTime.add( yOffsetFromStartPosition ) ).mul( effectController.oscilationRange );
		torusMaterial.positionNode = positionLocal.add( vec3( 0, 0, zOffset ) );

		const torusMesh = new THREE.InstancedMesh( torusGeometry, torusMaterial, 4 );

		const dummy = new THREE.Object3D();
		for ( let i = 0; i < 4; i ++ ) {

			dummy.position.set( - 4 + i * 2, 0, 0 );
			dummy.updateMatrix();
			torusMesh.setMatrixAt( i, dummy.matrix );

		}

		torusMesh.castShadow = true;
		torusMesh.receiveShadow = true;
		torusMesh.position.y = 1;
		this.Scene.add( torusMesh );

		// Plane
		const planeGeo = new THREE.PlaneGeometry( 10, 10, 10, 10 );
		const planeMaterial = new THREE.MeshStandardNodeMaterial( {
			map: textureColor,
			transparent: true
		} );
		const fade = uv().sub( 0.5 ).length().smoothstep( 0.5, 0.2 );
		planeMaterial.opacityNode = fade;//  = vec4( vec3( fade ), 1 );
		const planeMesh = new THREE.Mesh( planeGeo, planeMaterial );
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

		const ambientLight = new THREE.AmbientLight( 0x859dff, 3 );
		this.Scene.add( ambientLight );


		const colorShaders: Record<string, NodeMaterialNodeProperties[ 'colorNode' ]> = {

			'positionWorld': Fn( () => {

				return positionWorld;

			} )(),

			'positionView': Fn( () => {

				return positionView;

			} )(),

			'normalWorld': Fn( () => {

				return normalWorld;

			} )(),


			'normalView': Fn( () => {

				return normalView;

			} )(),

			'Oscilation': Fn( () => {

				return checker( uv().add( slowedTime ).mul( ( vec2( 40, 5 ) ) ) );

			} )(),

			'Oscilation (positionGeometry)': Fn( () => {

				return checker( uv().add( slowedTime ).mul( ( vec2( 40, 5 ) ) ) );

			} )(),

			'Snake': Fn( () => {

				return mix( rimColor, scaleColor, scaleMask );

			} )(),

		};

		const positionShaders: Record<string, NodeMaterialNodeProperties[ 'positionNode' ]> = {

			'Oscilation': Fn( () => {

				return positionLocal.add( vec3( 0, 0, zOffset ) );

			} )(),

			'Oscilation (positionGeometry)': Fn( () => {

				return positionGeometry.add( vec3( 0, 0, zOffset ) );

			} )(),

			'Snake': Fn( () => {

				return positionLocal;

			} )()

		};

		this.registerMaterial( this.torusMaterial, {
			positionNode: positionShaders[ 'Oscilation' ],
			colorNode: colorShaders[ 'Oscilation' ]
		} );

		const gui = this.Inspector.createParameters( 'Chapter 3. Node Materials' );
		const snakeFolder = gui.addFolder( 'Snake' );
		snakeFolder.add( effectController.constrictionStart, 'value', 10, 100 ).step( 1 ).name( 'Constriction Start' );
		snakeFolder.add( effectController.constrictionRange, 'value', 0, 50 ).step( 1 ).name( 'Constriction Range' );
		snakeFolder.add( effectController.scaleOffset, 'value', 0.1, 0.7 ).step( 0.01 ).name( 'Scale Offset' );
		snakeFolder.add( effectController.testUniform, 'value', 0.1, 5 ).step( 0.1 ).name( 'testUniform' );

		this.addFolderWithRanges(
			gui,
			'Oscilation',
			effectController,
			[
				{ key: 'oscilationRange', min: 0.1, max: 2, step: 0.1, title: 'Oscilation Range' },
				{ key: 'oscilationSpeed', min: 0.1, max: 5, step: 0.1, title: 'Oscilation Speed' },
				{ key: 'oscilationStrength', min: 0.1, max: 5, step: 0.1, title: 'Oscilation Strength' },

			]
		);
		gui.add( this, 'currentShader', Object.keys( colorShaders ) ).onChange( ( value ) => {

			this.registerMaterial( this.torusMaterial,
				{
					...this.torusMaterial,
					colorNode: colorShaders[ this.currentShader ]
				}
			);

		} );

		gui.add( this, 'positionShader', Object.keys( positionShaders ) ).onChange( () => {

			this.registerMaterial( this.torusMaterial,
				{
					...this.torusMaterial,
					positionNode: positionShaders[ this.currentShader ]
				}
			);

		} );

	}

}

const app = new NodeMaterials();
app.initialize( {
	projectName: 'Node Materials',
	debug: true
} );
