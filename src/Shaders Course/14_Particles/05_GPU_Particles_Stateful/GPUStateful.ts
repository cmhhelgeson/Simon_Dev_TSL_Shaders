import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { App } from '../../../utils/App';
import * as THREE from 'three';
import { ComputeNode, MeshBasicNodeMaterial, PointsNodeMaterial, SpriteNodeMaterial, StorageBufferNode, StorageInstancedBufferAttribute, Node } from 'three/webgpu';
import { attribute, float, Fn, storage, fract, instanceIndex, instancedArray, int, mix, sin, smoothstep, Switch, texture, time, vec3, deltaTime, vec4, distance, If, exp, negate, normalize, uniform, clamp } from 'three/tsl';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { createTextMesh } from '../utils/text-utils';
import { curlNoiseWGSL, noise34 } from '../utils/noise';
import { CalculateAttractorForce, CalculateRepulsorForce } from '../utils/attractionShader';


class GPGPUProject extends App {

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
		await this.#setupGPUParticlesStatelessSphere();

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

		const pointMaterial = new PointsNodeMaterial( {
			positionNode: positionFn(),
			sizeNode: float( 5.0 ),
			sizeAttenuation: true,
			colorNode: texture( diffuseTexture ),
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

			// Get sampled sphere into vec3
			sampler.sample( pt );
			currentPositions[ i * 3 ] = pt.x;
			currentPositions[ i * 3 + 1 ] = pt.y;
			currentPositions[ i * 3 + 2 ] = pt.z;

		}

		const prevPositions = structuredClone( currentPositions );
		const originalPositions = structuredClone( currentPositions );

		const currentPosAttribute = new StorageInstancedBufferAttribute( currentPositions, 3 );
		const prevPosAttribute = new StorageInstancedBufferAttribute( prevPositions, 3 );
		const originalPosAttribute = new StorageInstancedBufferAttribute( originalPositions, 3 );
		this.#storageBuffers.currentPositionBuffer = storage( currentPosAttribute, 'vec3', numParticles );
		this.#storageBuffers.prevPositionBuffer = storage( prevPosAttribute, 'vec3', numParticles );
		this.#storageBuffers.originalPositionBuffer = storage( originalPosAttribute, 'vec3', numParticles );
		particlesSprite.geometry.setAttribute( 'currentPosition', currentPosAttribute );
		//particlesSprite.geometry.setAttribute( 'prevPosition', prevPosAttribute );

		const maxFrameTime = 1 / 60;

		const computePositionFn = Fn( () => {

			const { currentPositionBuffer, prevPositionBuffer, originalPositionBuffer } = this.#storageBuffers;
			const { attractorIntensity, attractorRadius } = this.#uniforms;

			const currentPosition = currentPositionBuffer.element( instanceIndex ).toVar();
			const prevPosition = prevPositionBuffer.element( instanceIndex ).toVar();

			const deltaPosition = currentPosition.sub( prevPosition );
			const drag = float( 1.0 );

			const forces = vec3( 0.0 );

			// Particles may move away from original text structure
			// but are compelled or "attracted" back
			const originalPosition = originalPositionBuffer.element( instanceIndex );

			forces.addAssign( CalculateAttractorForce(
				currentPosition,
				originalPosition,
				attractorRadius,
				float( 1.0 ),
				attractorIntensity
			) );

			forces.addAssign( noise34( { x: vec4( currentPosition, time ) } ) );

			const clampedDeltaTime = clamp( deltaTime, 0.001, maxFrameTime );

			forces.mulAssign( clampedDeltaTime );
			forces.mulAssign( clampedDeltaTime );

			const newPosition = currentPosition.add( deltaPosition.mul( drag ) ).add( forces );

			// Assign currentPosition to prevPosition
			prevPositionBuffer.element( instanceIndex ).assign( currentPosition );

			currentPositionBuffer.element( instanceIndex ).assign( newPosition );

		} )().compute( numParticles );

		this.#computeShaders.computePosition = computePositionFn;

		this.DebugGui.add( this.#uniforms.attractorIntensity, 'value', 10.0, 1000.0 ).step( 10.0 ).name( 'Attractor Intensity' );
		// Small radius means more strict pull
		this.DebugGui.add( this.#uniforms.attractorRadius, 'value', 0.1, 10.0 ).step( 0.1 ).name( 'Attractor Radius' );


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
		projectName: 'GPGPU Particles Stateful',
		rendererType: 'WebGPU',
		initialCameraMode: 'perspective',
		fixedFrameRate: 60,
	} );

} );
