import { App } from '../../../utils/App';
import * as THREE from 'three/webgpu';
import { normalWorld, time, uv, vec3, positionLocal, uniform, remap, materialColor, positionWorld, Fn, hash, rand, mx_noise_float, rotate, mx_noise_vec3, positionView, texture, fract, rotateUV, vec2, floor, select, abs, triplanarTexture, float, normalLocal, mix, color, blendBurn, blendDodge, blendColor, vec4, saturation, sin, grayscale } from 'three/tsl';
import { NodeMaterialNodeProperties } from 'three/src/materials/nodes/NodeMaterial.js';

class TexturesApp extends App {

	torusMaterial: THREE.MeshStandardNodeMaterial = new THREE.MeshStandardNodeMaterial();
	colorShader: string = 'UV Checker (Emulated Wrap)';
	opacityShader: string = 'Ground Fade';
	torusColorShader: string = '7. MX Noise x Position World';
	torusPositionShader: string = 'Simple Rotation';

	async onSetupProject(): Promise<void> {

		this.PerspectiveCamera.fov = 35;
		this.PerspectiveCamera.position.x = 5;
		this.PerspectiveCamera.position.y = 4.5;
		this.PerspectiveCamera.position.z = 2.5;

		this.setClearColor( 0x111111 );
		const uvChecker = await this.loadTexture( './resources/images/uvChecker.png' );

		const effectController = {
			// Snake parameters
			// Basic oscillation parameters
			oscilationRange: uniform( 1 ),
			oscilationSpeed: uniform( 1 ),
			oscilationStrength: uniform( 1.5 ),
			textureRepeat: uniform( 10 ),
			colorOneAlpha: uniform( 0.7 ),
			colorTwoAlpha: uniform( 0.5 )
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

		const colorShaders: Record<string, NodeMaterialNodeProperties[ 'colorNode' ]> = {

			'UV Checker (No Wrap)': Fn( () => {

				//const rotatedCells = rotateUV( cellUV, sin( time ), vec2( 0 ) );
				const cellDisplay = fract( cellUV );

				return texture( uvChecker, cellDisplay );

			} )(),

			'UV Checker (With Wrap)': Fn( () => {

				const cellUV = uv().mul( effectController.textureRepeat );
				return texture( uvChecker, cellUV );

			} )(),

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

			'Triplanar Texture': Fn( () => {

				// Triplanar Texture will mix together three separate views
				// of a texture using the (scaled) positionNode as the uvs.
				// It then accumulates the weighted results of the textureSample
				// based on the mesh normal (i.e if the surface normal faces in the y)
				// direction, the texture will sample more from the y facing sample

				return triplanarTexture(
					texture( uvChecker ),
					null,
					null,
					float( 1 ),
					positionWorld,
					normalWorld
				);

			} )(),

			'Blend Burn': Fn( () => {

				return blendBurn( texture( uvChecker ).rgb, color( 0xff0000 ) );

			} )(),

			'Blend Dodge': Fn( () => {

				return blendDodge( texture( uvChecker ).rgb, color( 0xff0000 ) );

			} )(),

			'Blend Color': Fn( () => {

				const { colorOneAlpha, colorTwoAlpha } = effectController;

				return blendColor(
					vec4( texture( uvChecker ).rgb, colorOneAlpha ),
					vec4( color( 0xff000000 ), colorTwoAlpha )
				);

			} )(),

			'Saturation': Fn( () => {

				return saturation( texture( uvChecker ).rgb, ( sin( time ).mul( 0.5 ).add( 0.5 ) ).mul( 2 ) );

			} )(),

			'Grayscale to Saturation 0': Fn( () => {

				const tap = texture( uvChecker ).rgb.toVar();

				const gray = grayscale( tap );
				const sat0 = saturation( tap, 0 );

				return mix( gray, sat0, sin( time ).mul( 0.5 ).add( 0.5 ) );

			} )()

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
		hashFolder.add( effectController.colorOneAlpha, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'Blend Color 1 Alpha' );
		hashFolder.add( effectController.colorTwoAlpha, 'value', 0.0, 1.0 ).step( 0.01 ).name( 'Blend Color 2 Alpha' );

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
