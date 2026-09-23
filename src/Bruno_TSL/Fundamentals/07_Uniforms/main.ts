import { App } from '../../../utils/App';
import * as THREE from 'three/webgpu';
import { time, uv, vec3, positionLocal, uniform, remap, materialColor, positionWorld, Fn, hash, rand, mx_noise_float, rotate, texture, fract, vec2, floor, select, abs, triplanarTexture, float, normalLocal, mix, color, blendBurn, blendDodge, blendColor, vec4, saturation, sin, grayscale, vibrance, hue, uniformArray, attribute, bufferAttribute } from 'three/tsl';
import { NodeMaterialNodeProperties } from 'three/src/materials/nodes/NodeMaterial.js';

interface EffectControllerInterface {
	oscilationRange: THREE.UniformNode<'float', number>
	oscilationSpeed: THREE.UniformNode<'float', number>
	oscilationStrength: THREE.UniformNode<'float', number>
	textureRepeat: THREE.UniformNode<'float', number>
	pulseFrequency: THREE.UniformNode<'vec2', THREE.Vector2>
	_colors: THREE.UniformArrayNode<'vec3'>
}

class TexturesApp extends App {

	torusMaterial: THREE.MeshStandardNodeMaterial = new THREE.MeshStandardNodeMaterial();
	colorShader: string = 'UV Checker (Emulated Wrap)';
	opacityShader: string = 'Ground Fade';
	torusColorShader: string = 'Position World Pulse';
	torusPositionShader: string = 'Simple Rotation';

	async onSetupProject(): Promise<void> {

		this.PerspectiveCamera.fov = 35;
		this.PerspectiveCamera.position.x = 5;
		this.PerspectiveCamera.position.y = 4.5;
		this.PerspectiveCamera.position.z = 2.5;

		this.setClearColor( 0x111111 );
		const uvChecker = await this.loadTexture( './resources/images/uvChecker.png' );

		const effectController: EffectControllerInterface = {
			// Snake parameters
			// Basic oscillation parameters
			oscilationRange: uniform( 1 ),
			oscilationSpeed: uniform( 1 ),
			oscilationStrength: uniform( 1.5 ),
			textureRepeat: uniform( 10 ),
			pulseFrequency: uniform( vec2( 2, 1 ) ),
			_colors: uniformArray( [
				new THREE.Color( 0x0b5d79 ),
				new THREE.Color( 0x5ed6c2 ),
				new THREE.Color( 0xfeedaa ),
				new THREE.Color( 0xfc8f74 ),
				new THREE.Color( 0xcf2c65 )
			] )
		};

		const planeGeometry = this.registerGeometry( 'plane', new THREE.PlaneGeometry( 10, 10, 10, 10 ) );
		const planeGeoCount = planeGeometry.attributes.position.count;

		const planeRandomArray = new Float32Array( planeGeoCount );
		for ( let i = 0; i < planeGeoCount; i ++ ) {

			planeRandomArray[ i ] = Math.random();

		}

		const planeRandomBuffer = new THREE.BufferAttribute( planeRandomArray, 1 );
		const planeRandomAttribute = bufferAttribute( planeRandomBuffer );

		const torusKnotGeometry = this.registerGeometry( 'torus', new THREE.TorusKnotGeometry( 0.5, 0.24, 128, 32 ) );



		//const torusRandomBuffer = new THREE.BufferAttribute( torusRandomArray, 1 );
		//torusKnotGeometry.setAttribute( 'random', torusRandomBuffer );

		// Torus Knot
		const { torusMaterial } = this;

		const torusMesh = new THREE.Mesh( torusKnotGeometry, torusMaterial );
		torusMesh.castShadow = true;
		torusMesh.receiveShadow = true;
		torusMesh.position.y = 1;
		this.Scene.add( torusMesh );

		const positionShaders: Record<string, NodeMaterialNodeProperties[ 'positionNode' ]> = {

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

		const cellUV = uv().mul( effectController.textureRepeat );
		const offsetSin = sin( time ).mul( 0.5 ).add( 0.5 );

		const colorShaders: Record<string, NodeMaterialNodeProperties[ 'colorNode' ]> = {

			'UV Checker (Emulated Wrap)': Fn( () => {

				// Emulates a mirror wrap

				const cellUV = uv().mul( effectController.textureRepeat );

				const horizontalIsEven = floor( cellUV.x ).mod( 2 );
				const verticalIsEven = floor( cellUV.y ).mod( 2 );

				const cellDisplay = fract( cellUV );

				const remappedCell = vec2(
					select( horizontalIsEven.equal( 1 ), abs( cellDisplay.x.sub( 1 ) ), cellDisplay.x ),
					select( verticalIsEven.equal( 1 ), abs( cellDisplay.y.sub( 1 ) ), cellDisplay.y )
				);

				return texture( uvChecker, remappedCell );

			} )(),

			'Position World Pulse': Fn( () => {

				const { pulseFrequency, _colors } = effectController;

				// Get a pattern with multiple 0 -> 1 ranges up the mesh
				const pattern = fract( positionWorld.y.mul( pulseFrequency.x ).sub( time.mul( pulseFrequency.y ) ) );

				// Colors will exist within the pulseFrequency, so five colors within one band
				const index = pattern.mul( _colors.array.length ).floor().toInt();

				const element = _colors.element( index );

				return element;

			} )(),

			'Pos World Pulse Alt': Fn( () => {

				// Banding is determined by pulse frequency x
				// Bands will match frequency, but not always guaranteed 5 colors
				const { pulseFrequency, _colors } = effectController;

				// Get a pattern with multiple 0 -> 1 ranges up the mesh
				const pattern = fract( positionWorld.y.mul( 1 ).sub( time.mul( pulseFrequency.y ) ) );

				// Colors will exist within the pulseFrequency, so five colors within one band
				const index = pattern.mul( pulseFrequency.x ).floor().toInt().mod( _colors.array.length );

				const element = _colors.element( index );

				return element;

			} )(),

			'Random': Fn( () => {

				return planeRandomAttribute;

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
			//map: textureColor,
			transparent: true,
		} );

		const updateUvCheckerWrap = () => {

			const withWrap = this.colorShader.includes( 'With Wrap' );

			uvChecker.wrapS = withWrap ? THREE.MirroredRepeatWrapping : THREE.ClampToEdgeWrapping;
			uvChecker.wrapT = withWrap ? THREE.MirroredRepeatWrapping : THREE.ClampToEdgeWrapping;
			uvChecker.needsUpdate = true;

		};

		updateUvCheckerWrap();

		this.registerMaterial( planeMaterial, {
			opacityNode: opacityShaders[ this.opacityShader ],
			colorNode: colorShaders[ this.colorShader ]
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

		const params = this.Inspector.createParameters( 'Textures' );
		const shadersFolder = params.addFolder( 'Shaders' );
		const planeMaterialFolder = shadersFolder.addFolder( 'Plane' );
		const torusMaterialFolder = shadersFolder.addFolder( 'Torus' );
		planeMaterialFolder.add( this, 'colorShader', Object.keys( colorShaders ) ).onChange( () => {

			updateUvCheckerWrap();

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
		hashFolder.add( effectController.textureRepeat, 'value', 1, 10 ).step( 1 ).name( 'Texture Repeat' );
		hashFolder.add( effectController.pulseFrequency.value, 'x', 1, 10 ).step( 1 ).name( 'Pulse Frequency' );
		hashFolder.add( effectController.pulseFrequency.value, 'y', 1, 10 ).step( 1 ).name( 'Pulse Speed' );
		const colorsFolder = hashFolder.addFolder( 'Pulse Colors' );
		effectController._colors.array.forEach( ( _color, index ) => {

			colorsFolder.addColor( effectController._colors.array, index ).name( `Color ${ index + 1 }` );

		} );

		torusMaterialFolder.add( this, 'torusColorShader', Object.keys( colorShaders ) ).onChange( () => {

			this.registerMaterial( torusMaterial, {
				...torusMaterial,
				colorNode: colorShaders[ this.torusColorShader ]
			} );

		} );

	}

}

const app = new TexturesApp();
app.initialize( {
	projectName: 'WebGPU & TSL Fundamentals: 06. Textures',
	debug: false
} );
