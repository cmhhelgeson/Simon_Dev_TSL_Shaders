
import * as THREE from 'three';
import { texture, vec3, time, instancedBufferAttribute, instancedDynamicBufferAttribute, vec2, Fn, uniform } from 'three/tsl';

import { App } from '../../utils/App';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import MATH from '../../utils/math';

import { ParticleRenderer, ParticleSystem, EmitterParameters, Emitter, Particle, PointEmitterShape } from '../../utils/particle-system';
import { PointsNodeMaterial } from 'three/webgpu';

class ParticleProject extends App {

	// From 1 hr onwards, pass particle renderer as emitter params
	// Each emitter will now be responsible for its own rendering
	#particleMaterial: PointsNodeMaterial;
	#particleSystem: ParticleSystem | null = null;

	constructor() {

		super();

	}

	#createTrailParticleSystem() {

		this.#particleSystem = new ParticleSystem();

		// Maximum number of particles in memory/displayed at once
		const maxDisplayParticles = 500;
		const maxEmission = 500;

		// Create an events system for the emitter.
		// Whenver a particle is created, destroyed, etc, we h

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load( './resources/star.png' );

		const sizesOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 15 },
			{ time: 5, value: 30 },
		] );

		const alphaOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 0.25, value: 1 },
			{ time: 4.5, value: 1 },
			{ time: 5, value: 0 },
		] );

		const colorsOverLife = new MATH.ColorInterpolant( [
			{ time: 0, value: new THREE.Color().setHSL( 0, 1, 0.75 ) },
			{ time: 2, value: new THREE.Color().setHSL( 0.5, 1, 0.5 ) },
			{ time: 5, value: new THREE.Color().setHSL( 1, 1, 0.5 ) },
		] );

		const twinkleOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 3, value: 1 },
			{ time: 4, value: 1 },
		] );

		const sizeOverLifeTexture: THREE.DataTexture = sizesOverLife.toTexture();
		const colorOverLifeTexture: THREE.DataTexture = colorsOverLife.toTexture();
		const twinkleOverLifeTexture: THREE.DataTexture = twinkleOverLife.toTexture();

		const baseMaterial = {
			sizeAttenuation: true,
			depthWrite: false,
			depthTest: true,
			transparent: true,
			blending: THREE.AdditiveBlending,
		};

		const emitterParams = new EmitterParameters();
		emitterParams.shape = new PointEmitterShape();
		//emitterParams.shape.position.copy( pos );
		emitterParams.particleEmissionRate = 1;
		emitterParams.maxDisplayParticles = 500;
		//emitterParams.startNumParticles = 500;
		emitterParams.maxEmission = 1;
		emitterParams.maxLife = 3;
		emitterParams.gravity = true;
		emitterParams.dragCoefficient = 4;
		emitterParams.velocityMagnitude = 75;
		emitterParams.rotation = new THREE.Quaternion();
		emitterParams.rotationAngularVariance = Math.PI / 8;
		emitterParams.spinSpeed = Math.PI;

		// When a particle on the trail emitter is created,
		// we create a new emitter that creates particles in
		// the wake of that trail.
		emitterParams.onCreated = ( particle ) => {

			console.log( this.Camera );

			/*const smokeEmitterParams = new EmitterParameters();
			smokeEmitterParams.shape = new PointEmitterShape();
			smokeEmitterParams.shape = new PointEmitterShape();
			//emitterParams.shape.position.copy( pos );
			smokeEmitterParams.particleEmissionRate = 100;
			smokeEmitterParams.maxDisplayParticles = 500;
			//emitterParams.startNumParticles = 500;
			smokeEmitterParams.maxEmission = Number.MAX_SAFE_INTEGER;
			smokeEmitterParams.maxLife = 2;
			smokeEmitterParams.spinSpeed = Math.PI / 8;

			smokeEmitterParams.particleRenderer = new ParticleRenderer();
			smokeEmitterParams.particleRenderer.initialize( this.#particleMaterial, {
				scene: this.Scene,
				positions: positions,
				lifes: lifes,
				maxDisplayParticles: maxDisplayParticles,
				group: new THREE.Group(),
				positionAttribute: positionAttribute,
				lifeAttribute: lifeAttribute,
				idAttribute: idAttribute,
				uniforms: uniforms,
			} );

			// NOTE: Velocity animation and color animation are not on the same lifecycle
			const smokeEmitter = new Emitter( smokeEmitterParams );
			this.#particleSystem?.addEmitter( smokeEmitter );


			console.log( 'test particle created' ); */

		};

		// When a particle is updated, we can update the position of the
		// shape on the emitterParameters, to emit particles along the
		//
		emitterParams.onStep = ( particle ) => {

			//console.log( 'test particle' );

		};

		emitterParams.onDestroy = ( particle ) => {

		};

		emitterParams.particleRenderer = new ParticleRenderer();

		const uniforms = {
			sizeOverLifeTexture: sizeOverLifeTexture,
			colorOverLifeTexture: colorOverLifeTexture,
			twinkleOverLifeTexture: twinkleOverLifeTexture,
			map: starTexture
		};

		const particleMaterial = emitterParams.particleRenderer.initialize( uniforms, {
			scene: this.Scene,
			maxDisplayParticles: maxDisplayParticles,
			group: new THREE.Group(),
		} );

		this.#particleMaterial = particleMaterial;

		// NOTE: Velocity animation and color animation are not on the same lifecycle
		const emitter = new Emitter( emitterParams );
		this.#particleSystem.addEmitter( emitter );

	}

	#createPopParticleSystem() {

		this.#particleSystem = new ParticleSystem();

		// Maximum number of particles in memory/displayed at once
		const maxDisplayParticles = 500;

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load( './resources/star.png' );

		const sizesOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 20 },
			{ time: 5, value: 20 },
		] );

		const alphaOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 0.25, value: 1 },
			{ time: 4.5, value: 1 },
			{ time: 5, value: 0 },
		] );

		const colorsOverLife = new MATH.ColorInterpolant( [
			{ time: 0, value: new THREE.Color().setHSL( 0, 1, 0.75 ) },
			{ time: 2, value: new THREE.Color().setHSL( 0.5, 1, 0.5 ) },
			{ time: 5, value: new THREE.Color().setHSL( 1, 1, 0.5 ) },
		] );

		const twinkleOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 3, value: 1 },
			{ time: 4, value: 1 },
		] );

		const sizeOverLifeTexture: THREE.DataTexture = sizesOverLife.toTexture();
		const colorsOverLifeTexture: THREE.DataTexture = colorsOverLife.toTexture();
		const twinkleOverLifeTexture: THREE.DataTexture = twinkleOverLife.toTexture();

		const uniforms = {
			sizeOverLifeTexture: sizeOverLifeTexture,
			colorOverLifeTexture: colorsOverLifeTexture,
			twinkleOverLifeTexture: twinkleOverLifeTexture,
			spinSpeed: uniform( 0 )
		};


		const emitterParams = new EmitterParameters();
		emitterParams.shape = new PointEmitterShape();
		//emitterParams.shape.position.copy( pos );
		emitterParams.particleEmissionRate = 5000;
		emitterParams.maxDisplayParticles = 500;
		emitterParams.startNumParticles = 500;
		emitterParams.maxEmission = 500;
		emitterParams.maxLife = 3;
		emitterParams.gravity = true;
		emitterParams.dragCoefficient = 4;
		emitterParams.velocityMagnitude = 75;
		emitterParams.velocityMagnitudeVariance = 10;
		emitterParams.rotationAngularVariance = 2 * Math.PI;
		emitterParams.spinSpeed = Math.PI;

		emitterParams.particleRenderer = new ParticleRenderer();
		this.#particleMaterial = emitterParams.particleRenderer.initialize( uniforms, {
			scene: this.Scene,
			maxDisplayParticles: maxDisplayParticles,
			group: new THREE.Group(),
		} );

		// NOTE: Velocity animation and color animation are not on the same lifecycle
		const emitter = new Emitter( emitterParams );
		this.#particleSystem.addEmitter( emitter );

	}

	onStep( dt: number, totalTimeElapsed: number ) {

		if ( ! this.#particleMaterial ) {

			return;

		}

		this.#particleSystem?.step( dt, totalTimeElapsed );

		if ( ! this.#particleSystem?.StillActive ) {

			this.#particleSystem?.dispose();
			this.#particleSystem = null;
			this.#createTrailParticleSystem();

		}

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		this.loadRGBE( './resources/moonless_golf_2k.hdr' );

		this.#createTrailParticleSystem();
		this.Camera.position.set( 0, 0, 20 );
		this.Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		// Currently it seems like the particles can only be reset when they are still active
		// Even if the dispose method is commented out
		projectFolder?.add( { 'Reset Sim': () => this.#particleSystem?.resetEmitter( 0 ) }, 'Reset Sim' ).name( 'Reset Sim' );

	}

}

const APP_ = new ParticleProject();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize();

} );
