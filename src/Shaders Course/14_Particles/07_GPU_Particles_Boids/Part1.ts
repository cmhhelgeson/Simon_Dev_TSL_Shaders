import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { App } from '../../../utils/App';
import * as THREE from 'three';
import { ComputeNode, MeshBasicNodeMaterial, Node, PointsNodeMaterial, SpriteNodeMaterial, StorageBufferNode, StorageInstancedBufferAttribute } from 'three/webgpu';
import { attribute, float, Fn, storage, fract, instanceIndex, instancedArray, int, mix, sin, Switch, texture, time, vec3, deltaTime, vec4, positionLocal, smoothstep, clamp, uint, ivec2 } from 'three/tsl';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import Geometries from 'three/src/renderers/common/Geometries.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createTextMesh } from '../utils/text-utils';
import { noise34 } from '../utils/noise';

const GRID_CENTER = new THREE.Vector3( 0, 0, 0 );
const GRID_SIZE = new THREE.Vector2( 10, 10 );

const GRID_RESOLUTION_PER_AXIS = 2;
const GRID_RESOLUTION = new THREE.Vector2(
	GRID_RESOLUTION_PER_AXIS, GRID_RESOLUTION_PER_AXIS
);

const GRID_BOUNDS_MAX = GRID_CENTER.clone().add(
	GRID_SIZE.clone().multiplyScalar( 0.5 )
);
const GRID_BOUNDS_MIN = GRID_CENTER.clone().sub(
	GRID_SIZE.clone().multiplyScalar( 0.5 ) );


class GPGPUProject extends App {

	#storageBuffers: Record<string, StorageBufferNode> = {};
	#computeShaders: Record<string, ComputeNode> = {};
	#debugScene: THREE.Scene;
	#debugShaders: Record<string, Node>;

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		await this.loadHDRBackground( './resources/moonless_golf_2k.hdr' );
		this.Camera.position.z = 4;
		this.#debugScene = new THREE.Scene();
		await this.#setupGPUParticlesStatelessSphere();

	}

	#createDebugView( name: string, position: THREE.Vector2, passName: string ) {

		const geo = new THREE.PlaneGeometry( 2, 2 );
		const quad = new THREE.Mesh(
			geo,
			new MeshBasicNodeMaterial( {
				colorNode: this.#debugShaders[ passName ]
			} )
		);
		quad.position.set( position.x, position.y, 0 );
		quad.scale.setScalar( 0.2 );

		this.#debugScene.add( quad );
		//this.#debugViews[ name ] = quad;

	}


	async #setupGPUParticlesStatelessSphere() {

		const numParticles = 256 * 256;

		const font = await this.loadFont( './resources/fonts/optimer_bold.typeface.json' );

		const textMesh = createTextMesh( 'GPU Particles!!', font );

		const meshes = [ textMesh ];
		const attributeNames = [ 'currentPosition' ];

		const positionFn = Fn( () => {

			const textPosition = attribute( attributeNames[ 0 ] );

			return textPosition;

		} );

		const diffuseTexture = await this.loadTexture( './resources/textures/circle.png' );

		const RED = vec3( 1.0, 0.0, 0.0 );
		const BLUE = vec3( 0.0, 0.0, 1.0 );

		const pointMaterial = new PointsNodeMaterial( {
			positionNode: positionFn(),
			sizeNode: float( 5.0 ),
			sizeAttenuation: true,
			colorNode: Fn( () => {

				const color = vec4( mix( RED, BLUE, smoothstep( - 5.0, 5.0, positionLocal.x ) ) ).toVar();

				color.mulAssign( texture( diffuseTexture ) );

				return color;

			} )(),
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthWrite: false,
			depthTest: false,
		} );

		const particlesSprite = new THREE.Sprite( pointMaterial );
		particlesSprite.count = numParticles;

		const pt = new THREE.Vector3();

		const mesh = meshes[ 0 ];
		const attributeName = attributeNames[ 0 ];

		const sampler = new MeshSurfaceSampler( mesh ).build();

		const currentPositions = new Float32Array( numParticles * 3 );

		for ( let i = 0; i < numParticles; i ++ ) {

			currentPositions[ i * 3 ] = pt.x;

			// Get sampled sphere into vec3
			currentPositions[ i * 3 ] = ( Math.random() * 2 - 1 ) * 5;
			currentPositions[ i * 3 + 1 ] = 0;
			currentPositions[ i * 3 + 2 ] = ( Math.random() * 2 - 1 ) * 5;

		}

		const particleBucketsBuffer = instancedArray( numParticles, 'float' );
		const bucketOffsetBuffer = instancedArray( numParticles, 'int' );

		const hashPositionToBucketID2D = Fn( ( [ position ] ) => {

			const pos = position.xz;

			const gridBoundsMin = uint( 0 );
			const gridBoundsMax = uint( 0 );
			const gridSize = uint( 0 );
			const gridResolution = uint( 0 );

			// Clamp that to the bounds of the grid
			const posNormalized = clamp(
				( pos.sub( gridBoundsMin ) ).div( gridSize ),
				0.0,
				1.0
			);

			const bucketIndex = ivec2( posNormalized.mul( gridResolution ) );



		} );

		const prevPositions = currentPositions.slice();

		const currentPosAttribute = new StorageInstancedBufferAttribute( currentPositions, 3 );
		const prevPosAttribute = new StorageInstancedBufferAttribute( prevPositions, 3 );
		this.#storageBuffers.currentPositionBuffer = storage( currentPosAttribute, 'vec3', numParticles );
		this.#storageBuffers.prevPositionBuffer = storage( prevPosAttribute, 'vec3', numParticles );
		particlesSprite.geometry.setAttribute( 'currentPosition', currentPosAttribute );
		//particlesSprite.geometry.setAttribute( 'prevPosition', prevPosAttribute );

		const computePositionFn = Fn( () => {

			const { currentPositionBuffer, prevPositionBuffer } = this.#storageBuffers;

			const currentPosition = currentPositionBuffer.element( instanceIndex ).toVar();
			const prevPosition = prevPositionBuffer.element( instanceIndex ).toVar();

			const deltaPosition = currentPosition.sub( prevPosition );
			const drag = float( 1.0 );

			const forces = vec3( 0.0, 0.0, 0.0 );

			forces.mulAssign( deltaTime );
			forces.mulAssign( deltaTime );

			const newPosition = currentPosition.add( deltaPosition.mul( drag ) ).add( forces );

			// Assign currentPosition to prevPosition
			prevPositionBuffer.element( instanceIndex ).assign( currentPosition );

			currentPositionBuffer.element( instanceIndex ).assign( newPosition );

		} )().compute( numParticles );

		this.#computeShaders.computePosition = computePositionFn;

		//this.Camera.position.set( 0, 2.2, 9.4 );

		this.Scene.add( particlesSprite );


	}

	onStep( dt: number, totalTimeElapsed: number ) {

		this.compute( this.#computeShaders.computePosition );


	}

}

const APP_ = new GPGPUProject();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: true,
		projectName: 'Boids Part 1',
		rendererType: 'WebGPU',
		initialCameraMode: 'perspective',
	} );

} );
