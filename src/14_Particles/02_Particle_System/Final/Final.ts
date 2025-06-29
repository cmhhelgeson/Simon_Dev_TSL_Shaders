/* eslint-disable compat/compat */

import * as THREE from 'three';
import { attribute, Fn, mix, sin, texture, time, uniform, vec2, vec3 } from 'three/tsl';

import { App } from '../../../utils/App';

import { ParticleSystem, EmitterParameters, Emitter, PointEmitterShape, Particle } from '../../utils/particle-system';
import { PointsNodeMaterial } from 'three/webgpu';
import { ParticleRenderer, ParticleUniformsType } from '../../utils/particle-renderer';
import { explosionData, leadData, punchData, smokeData } from './data';


class ParticleProject extends App {

	// From 1 hr onwards, pass particle renderer as emitter params
	// Each emitter will now be responsible for its own rendering
	#trailMaterial: THREE.Material;
	#popMaterial: THREE.Material;
	#leadParticleMaterial: THREE.Material;
	// Responsible for the smoke that comes off the lead particle	#smokeMaterial: PointsNodeMaterial;
	#particleSystem: ParticleSystem | null = null;
	#uniformTypes = {};
	#currentUniformType = 'Explosion';
	#webGLShaders = {};

	constructor() {

		super();

	}

	createWebGPUMaterial( uniforms: ParticleUniformsType, blending?: THREE.Blending ) {

		const idNodeOffset = attribute( 'instanceID' ).mul( 6.28 );

		const material = new PointsNodeMaterial( {
			//color: 0xffffff,
			positionNode: attribute( 'instancePosition' ),
			sizeNode: texture( uniforms.sizeOverLifeTexture, vec2( attribute( 'instanceLife' ), 0.5 ) ).x,
			colorNode: Fn( () => {

				const starMap = texture( uniforms.map );
				const color = texture( uniforms.colorOverLifeTexture, vec2( attribute( 'instanceLife' ), 0.5 ) ).rgb;
				return vec3( starMap.mul( color ) );

			} )(),
			opacityNode: Fn( () => {

				const twinkleSample = texture( uniforms.twinkleOverLifeTexture, vec2( attribute( 'instanceLife' ), 0.5 ) ).x;
				const twinkle = mix( 1.0, sin(
					time.mul( 20.0 ).add( idNodeOffset )
				).mul( 0.5 ).add( 0.5 ), twinkleSample
				);

				const alpha = texture( uniforms.colorOverLifeTexture, vec2( attribute( 'instanceLife' ), 0.5 ) ).a;
				return alpha.mul( twinkle );

			} )(),
			sizeAttenuation: true,
			depthWrite: false,
			depthTest: true,
			transparent: true,
			blending: blending ? blending : THREE.AdditiveBlending,
			rotationNode: time.mul( uniforms.spinSpeed ).add( idNodeOffset ),
		} );

		return material;

	}

	createWebGLMaterial( uniforms: ParticleUniformsType, blending?: THREE.Blending )	 {

		const spinSpeed = ( typeof uniforms.spinSpeed === 'number' ) ? uniforms.spinSpeed : uniforms.spinSpeed.value;

		const material = new THREE.ShaderMaterial( {
			uniforms: {
				time: { value: 0 },
				map: { value: uniforms.map },
				sizeOverLife: { value: uniforms.sizeOverLifeTexture },
				colourOverLife: { value: uniforms.colorOverLifeTexture },
				twinkleOverLife: { value: uniforms.twinkleOverLifeTexture },
				spinSpeed: { value: spinSpeed },
			},
			vertexShader: this.#webGLShaders[ 'pointsVertex' ],
			fragmentShader: this.#webGLShaders[ 'pointsFragment' ],
			depthWrite: false,
			depthTest: true,
			transparent: true,
			blending: blending ? blending : THREE.AdditiveBlending,
		} );

		return material;

	}

	createMaterial( uniforms: ParticleUniformsType, blending?: THREE.Blending ) {

		return this.rendererType === 'WebGPU' ? this.createWebGPUMaterial( uniforms, blending ) : this.createWebGLMaterial( uniforms, blending );

	}

	#createPointsParticleSystem( pos ) {

		//this.#particleSystem = new ParticleSystem();

		// Maximum number of particles in memory/displayed at once
		const maxDisplayParticles = 500;

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load( './resources/star.png' );

		this.#uniformTypes[ 'Explosion' ] = {
			sizeOverLifeTexture: explosionData.sizeOverLife.toTexture(),
			colorOverLifeTexture: explosionData.colorOverLife.toTexture( explosionData.alphaOverLife ),
			twinkleOverLifeTexture: explosionData.twinkleOverLife.toTexture(),
			map: starTexture,
			spinSpeed: uniform( Math.PI )
		};

		this.#uniformTypes[ 'Punch' ] = {
			sizeOverLifeTexture: punchData.sizeOverLife.toTexture(),
			colorOverLifeTexture: punchData.colorOverLife.toTexture( punchData.alphaOverLife ),
			twinkleOverLifeTexture: punchData.twinkleOverLife.toTexture(),
			map: starTexture,
			spinSpeed: uniform( Math.PI )
		};

		const emitterParams = new EmitterParameters();
		emitterParams.shape = new PointEmitterShape( new THREE.Vector3( 0, 0, 0 ) );
		emitterParams.shape.position.copy( pos );
		emitterParams.particleEmissionRate = 5000;
		emitterParams.maxDisplayParticles = 500;
		emitterParams.startNumParticles = 500;
		emitterParams.maxEmission = 500;
		emitterParams.maxLife = 5;
		emitterParams.gravity = true;
		emitterParams.dragCoefficient = 4;
		emitterParams.velocityMagnitude = 50;
		emitterParams.velocityMagnitudeVariance = 10;
		emitterParams.rotationAngularVariance = 2 * Math.PI;
		emitterParams.spinSpeed = Math.PI;

		emitterParams.particleRenderer = new ParticleRenderer( this.rendererType );
		this.#popMaterial = this.createMaterial( this.#uniformTypes[ this.#currentUniformType ] );
		emitterParams.particleRenderer.initialize( this.#popMaterial, {
			scene: this.Scene,
			maxDisplayParticles: maxDisplayParticles,
			group: new THREE.Group(),
		} );

		// NOTE: Velocity animation and color animation are not on the same lifecycle
		const emitter = new Emitter( emitterParams );
		this.#particleSystem?.addEmitter( emitter );

	}

	#createTrailParticleSystem() {

		// Just an array of emitters
		this.#particleSystem = new ParticleSystem();

		// Maximum number of particles in memory/displayed at once
		const maxDisplayParticles = 500;

		// Create an events system for the emitter.
		// Whenver a particle is created, destroyed, etc, we h

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load( './resources/star.png' );
		const smokeTexture = textureLoader.load( './resources/smoke.png' );

		const smokeUniforms: ParticleUniformsType = {
			sizeOverLifeTexture: smokeData.sizeOverLife.toTexture(),
			colorOverLifeTexture: smokeData.colorOverLife.toTexture( smokeData.alphaOverLife ),
			twinkleOverLifeTexture: smokeData.twinkleOverLife.toTexture(),
			map: smokeTexture,
			spinSpeed: this.rendererType ? 0 : uniform( 0 ),
		};

		const leadUniforms: ParticleUniformsType = {
			sizeOverLifeTexture: leadData.sizeOverLife.toTexture(),
			colorOverLifeTexture: leadData.colorOverLife.toTexture( leadData.alphaOverLife ),
			twinkleOverLifeTexture: leadData.twinkleOverLife.toTexture(),
			map: starTexture,
			spinSpeed: uniform( Math.PI ),
		};

		const emitterParams = new EmitterParameters();
		emitterParams.shape = new PointEmitterShape( new THREE.Vector3( 0, 0, 0 ) );
		emitterParams.particleEmissionRate = 1;
		emitterParams.maxDisplayParticles = 500;
		//emitterParams.startNumParticles = 500;
		emitterParams.maxEmission = 200;
		emitterParams.maxLife = 3;
		emitterParams.gravity = true;
		emitterParams.dragCoefficient = 2;
		emitterParams.velocityMagnitude = 100;
		emitterParams.rotation = new THREE.Quaternion();
		emitterParams.rotationAngularVariance = Math.PI / 4;
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
			smokeEmitterParams.maxDisplayParticles = 500;
			smokeEmitterParams.maxEmission = Number.MAX_SAFE_INTEGER;
			smokeEmitterParams.maxLife = 3;
			smokeEmitterParams.velocityMagnitude = 5;
			smokeEmitterParams.dragCoefficient = 4;
			//smokeEmitterParams.rotationAngularVariance = Math.PI / 8;
			//emitterParams.spinSpeed = Math.PI / 8;

			smokeEmitterParams.particleRenderer = new ParticleRenderer( this.rendererType );

			this.#trailMaterial = this.createMaterial( smokeUniforms, THREE.NormalBlending );

			// Providing application with reference to the particle renderer's internal material
			smokeEmitterParams.particleRenderer.initialize( this.#trailMaterial, {
				scene: this.Scene,
				maxDisplayParticles: 500,
				group: new THREE.Group(),
			} );

			// NOTE: Velocity animation and color animation are not on the same lifecycle
			const smokeEmitter = new Emitter( smokeEmitterParams );
			this.#particleSystem?.addEmitter( smokeEmitter );

			particle.attachedEmitter = smokeEmitter;
			particle.attachedShape = smokeEmitterParams.shape;

		};

		// When a particle is updated, we can update the position of the
		// shape on the emitterParameters, to emit particles along the
		//
		emitterParams.onStepParticle = ( particle ) => {


			// As the emitter updates each particle, we change
			// where the smokeEmitter will emit.
			// The smoke emitter then takes in this new information.

			// NOTE: This really only makes sense with a small number of particles
			// otherwise we would be making a bunch of useless updates to the smoke emitter
			// when only the final position of the final particle of the main emitter would
			// be relevant

			particle?.attachedShape?.position.copy( particle.position );


		};

		emitterParams.onDestroy = ( particle ) => {

			particle.attachedEmitter?.stop();

			this.#createPointsParticleSystem( particle.position );

		};

		emitterParams.particleRenderer = new ParticleRenderer();
		this.#leadParticleMaterial = this.createMaterial( leadUniforms );


		emitterParams.particleRenderer.initialize( this.#leadParticleMaterial, {
			scene: this.Scene,
			maxDisplayParticles: maxDisplayParticles,
			group: new THREE.Group(),
		} );


		// NOTE: Velocity animation and color animation are not on the same lifecycle
		const emitter = new Emitter( emitterParams );
		this.#particleSystem.addEmitter( emitter );

	}

	onStep( dt: number, totalTimeElapsed: number ) {

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

		if ( this.rendererType === 'WebGL' ) {

    	// Load shaders
			this.#webGLShaders[ 'pointsVertex' ] = await this.loadGLSLShader( './resources/shaders/points-vsh.glsl' );
			this.#webGLShaders[ 'pointsFragment' ] = await this.loadGLSLShader( './resources/shaders/points-fsh.glsl' );

		}

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
		rendererType: 'WebGL',
		initialCameraMode: 'perspective'
	} );

} );
