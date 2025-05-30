
import * as THREE from 'three';
import { uniform } from 'three/tsl';

import { App } from '../../utils/App';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import MATH from '../../utils/math';

import { ParticleRenderer, ParticleSystem, EmitterParameters, Emitter, PointEmitterShape, Particle } from '../../utils/particle-system';
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


		const smokeSizeOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 5 },
			{ time: 5, value: 15 },
		] );

		const smokeAlphaOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 1, value: 1 },
			{ time: 4, value: 1 },
			{ time: 5, value: 0 },
		] );

		const smokeColorOverLife = new MATH.ColorInterpolant( [
			// { time: 0, value: new THREE.Color(0x808080) },
			// { time: 1, value: new THREE.Color(0x404040) },
			{ time: 0, value: new THREE.Color().setHSL( 0, 1, 0.5 ) },
			{ time: 1, value: new THREE.Color().setHSL( 0.25, 1, 0.5 ) },
			{ time: 2, value: new THREE.Color().setHSL( 0.5, 1, 0.5 ) },
			{ time: 3, value: new THREE.Color().setHSL( 0.75, 1, 0.5 ) },
			{ time: 4, value: new THREE.Color().setHSL( 1, 1, 0.5 ) },
		] );

		const smokeTwinkleOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 1, value: 0 },
		] );

		const smokeUniforms: Uniforms = {
			sizeOverLifeTexture: smokeSizeOverLife.toTexture(),
			alphaOverLifeTexture: smokeAlphaOverLife.toTexture(),
			colorOverLifeTexture: smokeColorOverLife.toTexture(),
			twinkleOverLifeTexture: smokeTwinkleOverLife.toTexture(),
			map: starTexture,
			spinSpeed: uniform( 0 ),
		};



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

		const leadUniforms = {
			sizeOverLifeTexture: sizeOverLifeTexture,
			colorOverLifeTexture: colorOverLifeTexture,
			twinkleOverLifeTexture: twinkleOverLifeTexture,
			alphaOverLifeTexture: alphaOverLife.toTexture(),
			map: starTexture,
			spinSpeed: uniform( Math.PI ),
		};


		const emitterParams = new EmitterParameters();
		emitterParams.shape = new PointEmitterShape( new THREE.Vector3( 0, 0, 0 ) );
		emitterParams.particleEmissionRate = 1;
		emitterParams.maxDisplayParticles = 500;
		//emitterParams.startNumParticles = 500;
		emitterParams.maxEmission = 1;
		emitterParams.maxLife = 3;
		emitterParams.gravity = true;
		emitterParams.dragCoefficient = 4;
		emitterParams.velocityMagnitude = 50;
		emitterParams.rotation = new THREE.Quaternion();
		emitterParams.rotationAngularVariance = Math.PI / 8;
		emitterParams.spinSpeed = Math.PI;

		// When a particle on the trail emitter is created,
		// we create a new emitter that creates particles in
		// the wake of that trail.
		// NOTE: This is a single emitter that gets created from the initial emitter
		// and the emitter itself creates multiple particles
		emitterParams.onCreated = ( particle: Particle ) => {

			const smokeEmitterParams = new EmitterParameters();
			smokeEmitterParams.shape = new PointEmitterShape( new THREE.Vector3( 0, 0, 0 ) );
			smokeEmitterParams.particleEmissionRate = 100;
			smokeEmitterParams.maxDisplayParticles = 100;
			smokeEmitterParams.maxEmission = 100;
			smokeEmitterParams.maxLife = 2;
			smokeEmitterParams.velocityMagnitude = 1;
			smokeEmitterParams.dragCoefficient = 4;
			//emitterParams.spinSpeed = Math.PI / 8;

			smokeEmitterParams.particleRenderer = new ParticleRenderer();
			smokeEmitterParams.particleRenderer.initialize( smokeUniforms, {
				scene: this.Scene,
				maxDisplayParticles: 500,
				group: new THREE.Group(),
			} );

			// NOTE: Velocity animation and color animation are not on the same lifecycle
			const smokeEmitter = new Emitter( smokeEmitterParams );
			this.#particleSystem?.addEmitter( smokeEmitter );

			particle.attachedEmitter = smokeEmitter;
			particle.attachedShape = smokeEmitterParams.shape;


			console.log( 'test particle created' );

		};

		// When a particle is updated, we can update the position of the
		// shape on the emitterParameters, to emit particles along the
		//
		emitterParams.onStepParticle = ( particle ) => {

			console.log( particle.position );

			// As the emitter updates each particle, we change
			// where the smokeEmitter will emit.
			// The smoke emitter then takes in this new information.

			// NOTE: This really only makes sense with a small number of particles
			// otherwise we would be making a bunch of useless updates to the smoke emitter
			// when only the final position of the final particle of the main emitter would
			// be relevant

			particle?.attachedShape?.position.copy( particle.position );

			console.log( 'test particle step' );

		};

		emitterParams.onDestroy = ( particle ) => {

			console.log( 'particle destroyed' );

		};

		emitterParams.particleRenderer = new ParticleRenderer();


		this.#particleMaterial = emitterParams.particleRenderer.initialize( leadUniforms, {
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

	async onSetupProject( ): Promise<void> {

		this.loadRGBE( './resources/moonless_golf_2k.hdr' );
		this.Camera.position.set( 40, 1, 40 );
		this.Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );

		this.#createTrailParticleSystem();

		// Currently it seems like the particles can only be reset when they are still active
		// Even if the dispose method is commented out
		this.DebugGui.add( { 'Reset Sim': () => this.#particleSystem?.killAllEmitters() }, 'Reset Sim' ).name( 'Reset Sim' );

	}

}

const APP_ = new ParticleProject();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Final Particles',
		debug: false,
	} );

} );
