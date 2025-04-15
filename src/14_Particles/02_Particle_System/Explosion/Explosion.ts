
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

	#createPointsParticleSystem() {

		this.#particleSystem = new ParticleSystem();

		// Maximum number of particles in memory/displayed at once
		const maxDisplayParticles = 500;

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load( './resources/star.png' );

		// All particles use one life value (p.life / p.maxLife) so each interpolant has to cover
		// the same length of time, irrespective of whether it is doing anything during
		// large stretches of time.

		// Alt parameters
		/*const sizesOverLife = new MATH.FloatInterpolant( [
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

		const alphasOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 1 },
			{ time: 8, value: 1 },
			{ time: 10, value: 0 },
			{ time: 12, value: 1 },
			{ time: 17, value: 1 },
			{ time: 18, value: 0 }
		] );

		const colorsOverLife = new MATH.ColorInterpolant( [
			{ time: 0, value: new THREE.Color( 0xFFFFFF ) },
			{ time: 14, value: new THREE.Color( 0xFFFFFF ) },
			{ time: 15, value: new THREE.Color( 0xFF0000 ) },
			{ time: 16, value: new THREE.Color( 0x00FF00 ) },
			{ time: 17, value: new THREE.Color( 0x0000FF ) },
			{ time: 18, value: new THREE.Color( 0xFFFFFF ) },
		] );

		const twinkleOverLife = new MATH.FloatInterpolant( [
			{ time: 0, value: 0 },
			{ time: 3, value: 1 },
			{ time: 4, value: 1 },
		] ); */

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
			map: starTexture,
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
			this.#createPointsParticleSystem();

		}

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		this.loadRGBE( './resources/moonless_golf_2k.hdr' );

		this.Camera.position.set( 100, 0, 100 );

		this.#createPointsParticleSystem();

		// Currently it seems like the particles can only be reset when they are still active
		// Even if the dispose method is commented out
		projectFolder?.add( { 'Reset Sim': () => this.#particleSystem?.resetEmitter( 0 ) }, 'Reset Sim' ).name( 'Reset Sim' );

	}

}

const APP_ = new ParticleProject();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize();

} );
