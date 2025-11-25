import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as THREE from 'three';
import { ComputeNode, MeshBasicNodeMaterial, PointsNodeMaterial, SpriteNodeMaterial, StorageBufferNode, StorageInstancedBufferAttribute } from 'three/webgpu';
import { attribute, float, Fn, storage, fract, instanceIndex, instancedArray, int, mix, sin, smoothstep, Switch, texture, time, vec3, deltaTime, vec4, distance, If, exp, negate, normalize, uniform, vec2 } from 'three/tsl';
import { App } from '../../utils/App';

export const groundHash = Fn( ( [ p ] ) => {

	const point = fract( p.mul( 0.3183099 ).add( vec2( 0.71, 0.113 ) ) ).mul( 50.0 );

	const quasiDot = fract( point.x.mul( point.y ).mul( point.x.add( point.y ) ) );

	return;

	    p = 50.0 * fract( p * 0.3183099 + vec2( 0.71, 0.113 ) );
	return - 1.0 + 2.0 * fract( p.x * p.y * ( p.x + p.y ) );


} ).setLayout( {
	name: 'groundHash',
	type: 'float',
	inputs: [
		{ name: 'p', type: 'float' }
	]
} );


class GrassSetup extends App {

	#storageBuffers: Record<string, StorageBufferNode> = {};
	#computeShaders: Record<string, ComputeNode> = {};

	#uniforms = {

		attractorIntensity: uniform( 1000.0 ),
		attractorDecay: uniform( 1.0 ),
		attractorRadius: uniform( 1.0 ),

	};

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		await this.loadHDRBackground( './resources/moonless_golf_2k.hdr' );
		this.Camera.position.z = 20;
		await this.#setupGrassInitialScene();

	}

	async #setupGrassInitialScene() {

		this.Scene.background = new THREE.Color( 0.7, 0.8, 1.0 );

		this.Camera.position.set( 10, 5, 5 );
		this.PerspectiveCamera.fov = 60;

		const light = new THREE.DirectionalLight( 0xFFFFFF, 1.0 );
		light.position.set( 1, 1, 1 );
		light.lookAt( 0, 0, 0 );
		this.Scene.add( light );

		this.CameraControls.target.set( 0, 0, 0 );

		this.materials_ = [];

		await this.setupProject_();


	}

	async setupProject_() {

		/*const sky = await fetch( './shaders/sky.glsl' );
		const vshSky = await fetch( './shaders/sky-vertex-shader.glsl' );
		const fshSky = await fetch( './shaders/sky-fragment-shader.glsl' );
		const vshGround = await fetch( './shaders/ground-vertex-shader.glsl' );
		const fshGround = await fetch( './shaders/ground-fragment-shader.glsl' );

		const skyText = await sky.text();
		const vshSkyText = await vshSky.text();
		const fshSkyText = await fshSky.text();
		const vshGroundText = await vshGround.text();
		const fshGroundText = await fshGround.text(); */

		const diffuseTexture = await this.loadTexture( './textures/grid.png' );
		diffuseTexture.wrapS = THREE.RepeatWrapping;
		diffuseTexture.wrapT = THREE.RepeatWrapping;

		// Make ground
		const groundMat = new THREE.ShaderMaterial( {
			uniforms: {
				time: { value: 0 },
				resolution: { value: new THREE.Vector2( 1, 1 ) },
				diffuseTexture: { value: diffuseTexture },
			},
			vertexShader: vshGroundText,
			fragmentShader: fshGroundText
		} );

		const geometry = new THREE.PlaneGeometry( 1, 1, 512, 512 );
		const plane = new THREE.Mesh( geometry, groundMat );
		plane.rotateX( - Math.PI / 2 );
		plane.scale.setScalar( 10 );
		this.scene_.add( plane );
		this.materials_.push( groundMat );

		// Make sky
		const skyGeo = new THREE.SphereGeometry( 5000, 32, 15 );
		const skyMat = new THREE.ShaderMaterial( {
			uniforms: {
				time: { value: 0 },
				resolution: { value: new THREE.Vector2( 1, 1 ) },
			},
			vertexShader: vshSkyText,
			fragmentShader: skyText + fshSkyText,
			side: THREE.BackSide
		} );


		this.sky_ = new THREE.Mesh( skyGeo, skyMat );
		this.sky_.castShadow = false;
		this.sky_.receiveShadow = false;
		this.scene_.add( this.sky_ );
		this.materials_.push( skyMat );


	}

	onStep( dt: number, totalTimeElapsed: number ) {

		this.compute( this.#computeShaders.computePosition );

	}

}

const APP_ = new GrassSetup();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: true,
		projectName: 'Grass Setup',
		rendererType: 'WebGPU',
		initialCameraMode: 'perspective',
		fixedFrameRate: 60,
	} );

} );
