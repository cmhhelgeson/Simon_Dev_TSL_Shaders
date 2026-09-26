import { App } from '../../../utils/App';
import * as THREE from 'three/webgpu';
import { normalWorld, time, uv, vec3, positionLocal, uniform, remap, materialColor, positionWorld, Fn, hash, rand, mx_noise_float, rotate, mx_noise_vec3, positionView, texture, fract, rotateUV, vec2, floor, select, abs, triplanarTexture, float, normalLocal, mix, color, blendBurn, blendDodge, blendColor, vec4, saturation, sin, grayscale, vibrance, hue } from 'three/tsl';
import { NodeMaterialNodeProperties } from 'three/src/materials/nodes/NodeMaterial.js';

const MAX_DEPTH = 10;


interface HTMLDepthArrray {
	name: string
	depth: number
}

const depthArray: HTMLDepthArrray[] = [];

interface BVHNode {
	box3: THREE.Box3
	triangles: THREE.Triangle[];
	childOne: BVHNode | null;
	childTwo: BVHNode | null
}

const bvhSplit = ( parent: BVHNode, depth = 0, parentName = 'D0 -> ' ) => {

	if ( depth === MAX_DEPTH ) {

		return;

	}

	if ( parent.triangles.length === 0 ) {

		return;

	}

	const _parentSize = new THREE.Vector3();
	const _parentCenter = new THREE.Vector3();
	parent.box3.getSize( _parentSize );
	parent.box3.getCenter( _parentCenter );

	const axis: 'x' | 'y' | 'z' = _parentSize.x > Math.max( _parentSize.y, _parentSize.z ) ? 'x' : _parentSize.y > _parentSize.z ? 'y' : 'z';
	const centerValue = _parentCenter[ axis ];

	const _midpoint = new THREE.Vector3();

	parent.childOne = {
		box3: new THREE.Box3(),
		triangles: [],
		childOne: null,
		childTwo: null
	};

	parent.childTwo = {
		box3: new THREE.Box3(),
		triangles: [],
		childOne: null,
		childTwo: null
	};

	for ( const triangle of parent.triangles ) {

		const triangleMidpoint = triangle.getMidpoint( _midpoint )[ axis ];

		const child = triangleMidpoint < centerValue ? parent.childOne : parent.childTwo;
		child.triangles.push( triangle );
		child.box3.expandByPoint( triangle.a );
		child.box3.expandByPoint( triangle.b );
		child.box3.expandByPoint( triangle.c );

	}

	depthArray.push( {
		name: `${parentName} D${depth + 1}C1 -> `,
		depth: depth + 1
	} );

	depthArray.push( {
		name: `${parentName} D${depth + 1}C2 -> `,
		depth: depth + 1
	} );

	bvhSplit( parent.childOne, depth + 1 );
	bvhSplit( parent.childTwo, depth + 1 );

};

// Indices may be Uint16Array or Uint32Array depending on vertex count
const bvh = ( vertices: Float32Array, indices: Uint16Array | Uint32Array ) => {

	const bvh: BVHNode = {
		box3: new THREE.Box3(),
		triangles: [],
		childOne: null,
		childTwo: null
	};

	// Three indices for each triangle
	const triangleCount = indices.length / 3;

	for ( let i = 0; i < indices.length; i += 3 ) {

		const vertOne = new THREE.Vector3().fromArray( vertices, indices[ i ] * 3 );
		const vertTwo = new THREE.Vector3().fromArray( vertices, indices[ i + 1 ] * 3 );
		const vertThree = new THREE.Vector3().fromArray( vertices, indices[ i + 2 ] * 3 );

		bvh.box3.expandByPoint( vertOne );
		bvh.box3.expandByPoint( vertTwo );
		bvh.box3.expandByPoint( vertThree );

		bvh.triangles.push( new THREE.Triangle(
			vertOne,
			vertTwo,
			vertThree
		) );

	}

	depthArray.push( {
		name: 'D0 ->',
		depth: 0
	} );

	bvhSplit( bvh );

	return bvh;

};

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

		const bvhViews: THREE.Box3Helper[][] = [];

		const effectController = {
			// Snake parameters
			// Basic oscillation parameters
			oscilationRange: uniform( 1 ),
			oscilationSpeed: uniform( 1 ),
			oscilationStrength: uniform( 1.5 ),
			textureRepeat: uniform( 10 ),
			colorOneAlpha: uniform( 0.7 ),
			colorTwoAlpha: uniform( 0.5 ),
			bvhView: 0,
			lastBVHView: 0,
		};

		const planeGeometry = this.registerGeometry( 'plane', new THREE.PlaneGeometry( 10, 10, 10, 10 ) );
		const torusKnotGeometry = this.registerGeometry( 'torus', new THREE.TorusKnotGeometry( 0.5, 0.24, 128, 32 ) );

		console.log( torusKnotGeometry );

		// Index buffer lives on geometry.index, not in geometry.attributes
		const positionAttribute = torusKnotGeometry.getAttribute( 'position' );
		const indexAttribute = torusKnotGeometry.getIndex() as THREE.BufferAttribute;

		const torusBVH = bvh( positionAttribute.array as Float32Array, indexAttribute.array as Uint16Array | Uint32Array );
		console.log( torusBVH );

		const rootBVHHelper = new THREE.Box3Helper( torusBVH.box3 );

		this.Scene.add( rootBVHHelper );
		if ( bvhViews[ 0 ] === undefined ) {

			bvhViews[ 0 ] = [];

		}

		bvhViews[ 0 ].push( rootBVHHelper );


		const addBox3Helpers = ( node: BVHNode, depth = 1 ) => {

			if ( node.childOne === null ) {

				return;

			}

			if ( node.childTwo === null ) {

				return;

			}

			const childOneBVHHelper = new THREE.Box3Helper( node.childOne.box3 );
			childOneBVHHelper.visible = false;
			const childTwoBVHHelper = new THREE.Box3Helper( node.childTwo.box3 );
			childTwoBVHHelper.visible = false;

			if ( bvhViews[ depth ] === undefined ) {

				bvhViews[ depth ] = [];

			}

			bvhViews[ depth ].push( childOneBVHHelper );
			bvhViews[ depth ].push( childTwoBVHHelper );

			this.Scene.add( childOneBVHHelper );
			this.Scene.add( childTwoBVHHelper );

			addBox3Helpers( node.childOne, depth + 1 );
			addBox3Helpers( node.childTwo, depth + 1 );

		};

		addBox3Helpers( torusBVH );


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

				return saturation( texture( uvChecker ).rgb, offsetSin.mul( 2 ) );

			} )(),

			'Grayscale to Saturation 0': Fn( () => {

				const tap = texture( uvChecker ).rgb.toVar();

				const gray = grayscale( tap );
				const sat0 = saturation( tap, 0 );

				return mix( gray, sat0, sin( time ).mul( 0.5 ).add( 0.5 ) );

			} )(),

			'Vibrance': Fn( () => {

				return vibrance( texture( uvChecker ).rgb, offsetSin );

			} )(),

			'Hue': Fn( () => {

				return hue( texture( uvChecker ).rgb, time );

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

		const bvhFolder = params.addFolder( 'BVH' );
		bvhFolder.add( effectController, 'bvhView', [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ] ).onChange( () =>{

			for ( const view of bvhViews[ effectController.lastBVHView ] ) {

				view.visible = false;

			}

			effectController.lastBVHView = effectController.bvhView;

			for ( const view of bvhViews[ effectController.bvhView ] ) {

				view.visible = true;

			}

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
	projectName: 'BVH',
	debug: false
} );
