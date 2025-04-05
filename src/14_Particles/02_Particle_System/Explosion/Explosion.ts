
import * as THREE from 'three';
import { float, texture, vec3, sin, instanceIndex, time, instance, instancedBufferAttribute, instancedDynamicBufferAttribute, vec2, Fn } from 'three/tsl';

import { App } from '../../utils/App';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import MATH from '../../utils/math';

import { ParticleRenderer, ParticleSystem, EmitterParameters, Emitter, Particle, PointEmitterShape } from '../../utils/particle-system';
import { PointsNodeMaterial } from 'three/webgpu';

class ParticleProject extends App {

	// From 1 hr onwards, pass particle renderer as emitter params
	// Each emitter will now be responsible for its own rendering
	#particleMaterial: PointsNodeMaterial;
	#particleSystem: ParticleSystem;

	constructor() {

		super();

	}

	#createPointsParticleSystem() {

		this.#particleSystem = new ParticleSystem();

		const numParticles = 1000;

		const positions = new Float32Array( numParticles * 3 );
		const lifes = new Float32Array( numParticles );

		const particles: Particle[] = [];

		for ( let i = 0; i < numParticles; i ++ ) {

			const x = positions[ i * 3 ] = ( MATH.random() * 2 - 1 ) * 100;
			const y = positions[ i * 3 + 1 ] = ( MATH.random() * 2 - 1 ) * 100;
			const z = positions[ i * 3 + 2 ] = ( MATH.random() * 2 - 1 ) * 100;
			lifes[ i ] = 0.0;

			// Direction of velocity explosion will always emanate from the origin
			const dir = new THREE.Vector3( x, y, z ).normalize();

			particles.push( {
				life: 0,
				maxLife: 18,
				position: new THREE.Vector3( x, y, z ),
				velocity: dir.multiplyScalar( 50 ),
			} );

		}

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load( './resources/star.png' );

		// All particles use one life value (p.life / p.maxLife) so each interpolant has to cover
		// the same length of time, irrespective of whether it is doing anything during
		// large stretches of time.
		const sizesOverLife = new MATH.FloatInterpolant( [
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

		const sizeOverLifeTexture: THREE.DataTexture = sizesOverLife.toTexture();
		const alphasOverLifeTexture: THREE.DataTexture = alphasOverLife.toTexture();
		const colorsOverLifeTexture: THREE.DataTexture = colorsOverLife.toTexture();

		const positionAttribute = new THREE.InstancedBufferAttribute( positions, 3 );
		const lifeAttribute = new THREE.InstancedBufferAttribute( lifes, 1 );

		const lifeNode = instancedDynamicBufferAttribute( lifeAttribute );
		const newPosition = instancedDynamicBufferAttribute( positionAttribute );

		this.#particleMaterial = new PointsNodeMaterial( {
			color: 0xffffff,
			positionNode: newPosition,
			sizeNode: texture( sizeOverLifeTexture, vec2( lifeNode, 0.5 ) ).x,
			opacityNode: texture( alphasOverLifeTexture, vec2( lifeNode, 0.5 ) ).x,
			colorNode: Fn( () => {

				const starMap = texture( starTexture );
				const color = texture( colorsOverLifeTexture, vec2( lifeNode, 0.5 ) ).rgb;
				return vec3( starMap.mul( color ) );

			} )(),
			sizeAttenuation: true,
			depthWrite: false,
			depthTest: true,
			transparent: true,
			blending: THREE.AdditiveBlending,
			rotationNode: time,
		} );

		const particleRenderer = new ParticleRenderer( this.#particleMaterial, {
			scene: this.Scene,
			positions: positions,
			lifes: lifes,
			numParticles: numParticles,
			group: new THREE.Group(),
			positionAttribute: positionAttribute,
			lifeAttribute: lifeAttribute
		} );

		// Emitter parameters for having particles available on application start
		const emitterParams: EmitterParameters = {
			// Emission parameters
			maxDisplayParticles: 100,
			maxEmission: 100,
			startNumParticles: 0,
			particleEmissionRate: 100.0,
			// Render parametersd
			particleRenderer: particleRenderer,
			shape: new PointEmitterShape( new THREE.Vector3( 0, 0, 0 ) ),
			// Particle shared constants
			maxLife: 2,
			rotationAngularVariance: Math.PI * 2,
			velocityMagnitude: 100,
			rotation: new THREE.Quaternion(),
			gravity: false,
		};
		// NOTE: Velocity animation and color animation are not on the same lifecycle
		const emitter = new Emitter( emitterParams );
		this.#particleSystem.addEmitter( emitter );

	}

	onStep( dt: number, totalTimeElapsed: number ) {

		if ( ! this.#particleMaterial ) {

			return;

		}

		this.#particleSystem.step( dt, totalTimeElapsed );

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		this.loadRGBE( './resources/moonless_golf_2k.hdr' );

		this.#createPointsParticleSystem();

		projectFolder?.add( { 'Reset Sim': () => this.#particleSystem.resetEmitter( 0 ) }, 'Reset Sim' ).name( 'Reset Sim' );

	}

}

const APP_ = new ParticleProject();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize();

} );
