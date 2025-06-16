
import * as THREE from 'three';
import { uniform } from 'three/tsl';

import { App } from '../../utils/App';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import MATH from '../../utils/math';

import { ParticleRenderer, ParticleSystem, EmitterParameters, Emitter, PointEmitterShape } from '../../utils/particle-system';
import { PointsNodeMaterial, SpriteNodeMaterial } from 'three/webgpu';

class ParticleProject extends App {

	// From 1 hr onwards, pass particle renderer as emitter params
	// Each emitter will now be responsible for its own rendering
	#particleMaterial: SpriteNodeMaterial;
	#particleSystem: ParticleSystem | null = null;
	#currentUniformType = 'Explosion';
	#uniformTypes = {};

	constructor() {

		super();

	}

	#createPointsParticleSystem() {

		this.#particleSystem = new ParticleSystem();

		// Maximum number of particles in memory/displayed at once
		const maxDisplayParticles = 500;

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load( './resources/star.png' );

		// All particles use one life value (p.life / p.maxLife) so each interpolant has to cover
		// the same length of time, irrespective of whether it is doing anything during
		// large stretches of time.

		// Pucnh parameters
		const punchSizeOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 100.0 },
			{ time: 1, value: 0.0 },
			{ time: 2, value: 100.0 },
			{ time: 3, value: 0.0 },
			{ time: 4, value: 200.0 },
			{ time: 5, value: 0.0 },
			{ time: 6, value: 100.0 },
			{ time: 18, value: 100.0 },
			{ time: 20, value: 200.0 }
		] );

		const punchAlphaOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 1 },
			{ time: 8, value: 1 },
			{ time: 10, value: 0 },
			{ time: 12, value: 1 },
			{ time: 17, value: 1 },
			{ time: 18, value: 0 }
		] );

		const punchColorOverLife = new MATH.ColorInterpolant( [
			{ time: 0, value: new THREE.Color( 0xFFFFFF ) },
			{ time: 14, value: new THREE.Color( 0xFFFFFF ) },
			{ time: 15, value: new THREE.Color( 0xFF0000 ) },
			{ time: 16, value: new THREE.Color( 0x00FF00 ) },
			{ time: 17, value: new THREE.Color( 0x0000FF ) },
			{ time: 18, value: new THREE.Color( 0xFFFFFF ) },
		] );

		const punchTwinkleOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 3, value: 1 },
			{ time: 4, value: 1 },
		] );

		// Generic Firework Explosion Parameters
		const explosionSizeOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 30 },
			{ time: 5, value: 40 },
		] );

		const explosionAlphaOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 0.25, value: 1 },
			{ time: 4.5, value: 1 },
			{ time: 5, value: 0 },
		] );

		const explosionColorOverLife = new MATH.ColorInterpolant( [
			{ time: 0, value: new THREE.Color().setHSL( 0, 1, 0.75 ) },
			{ time: 2, value: new THREE.Color().setHSL( 0.5, 1, 0.5 ) },
			{ time: 5, value: new THREE.Color().setHSL( 1, 1, 0.5 ) },
		] );

		const explosionTwinkleOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 3, value: 1 },
			{ time: 4, value: 1 },
		] );

		this.#uniformTypes[ 'Explosion' ] = {
			sizeOverLifeTexture: explosionSizeOverLife.toTexture(),
			colorOverLifeTexture: explosionColorOverLife.toTexture(),
			twinkleOverLifeTexture: explosionTwinkleOverLife.toTexture(),
			alphaOverLifeTexture: explosionAlphaOverLife.toTexture(),
			map: starTexture,
			spinSpeed: uniform( Math.PI )
		};

		this.#uniformTypes[ 'Punch' ] = {
			sizeOverLifeTexture: punchSizeOverLife.toTexture(),
			colorOverLifeTexture: punchColorOverLife.toTexture(),
			twinkleOverLifeTexture: punchTwinkleOverLife.toTexture(),
			alphaOverLifeTexture: punchAlphaOverLife.toTexture(),
			map: starTexture,
			spinSpeed: uniform( Math.PI )
		};

		const emitterParams = new EmitterParameters();
		emitterParams.shape = new PointEmitterShape( new THREE.Vector3( 0, 0, 0 ) );
		emitterParams.particleEmissionRate = 5000;
		emitterParams.maxDisplayParticles = 500;
		emitterParams.startNumParticles = 500;
		emitterParams.maxEmission = 500;
		emitterParams.maxLife = 5;
		emitterParams.gravity = true;
		emitterParams.dragCoefficient = 4;
		emitterParams.velocityMagnitude = 150;
		emitterParams.velocityMagnitudeVariance = 10;
		emitterParams.rotationAngularVariance = 2 * Math.PI;
		emitterParams.spinSpeed = Math.PI;

		emitterParams.particleRenderer = new ParticleRenderer();
		this.#particleMaterial = emitterParams.particleRenderer.initialize( this.#uniformTypes[ this.#currentUniformType ], {
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
			this.#createPointsParticleSystem( this.#currentUniformType );

		}

	}

	async onSetupProject( ): Promise<void> {

		this.loadRGBE( './resources/moonless_golf_2k.hdr' );

		this.#createPointsParticleSystem();

		// Currently it seems like the particles can only be reset when they are still active
		// Even if the dispose method is commented out
		this.DebugGui.add( { 'Reset Current Sim': () => this.#particleSystem?.killAllEmitters() }, 'Reset Current Sim' ).name( 'Reset Current Sim' );

		const simOptions = Object.keys( this.#uniformTypes );
		const params = { selectedSim: this.#currentUniformType };

		this.DebugGui.add( params, 'selectedSim', simOptions )
			.name( 'Simulation Type' )
			.onChange( ( value: string ) => {

				this.#currentUniformType = value;
				this.#particleSystem?.killAllEmitters();

			} );

	}

}

const APP_ = new ParticleProject();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: true,
		projectName: 'Explosion Particles',
		rendererType: 'WebGPU',
	} );

} );
