

import * as THREE from 'three';
import MATH from './math';
import { instancedBufferAttribute, texture, vec2, Fn, vec3 } from 'three/tsl';

import { NodeMaterial, PointsNodeMaterial, SpriteNodeMaterial } from 'three/webgpu';

const GRAVITY = new THREE.Vector3( 0.0, - 9.8, 0.0 );

export interface EmitterParameters {
	// Max number of particles being displayed at once
	// Or the maximum amount of particle data we can hold.
	// For instance, though we may "emit" 1000 particles over the lifetime of the application
	// We'll only store data for 100 particles. When the lives of particles 0 - 99 ends,
	// their memory will be reset and used for the emitted particles 100 - 199
	maxDisplayParticles: number,
	startNumParticles?: number,
	// Number of particles emitted per second
	particleEmissionRate: number,
	// Max number of particles emitted during the lifetime of the application
	maxEmission: number,
	particleRenderer: ParticleRenderer,
  // Volume or point determining where particles are generated
	shape: EmitterShape,
  // SHARED PARTICLE CONSTANTS
  // The maximum life of each particle
  maxLife: number,
  velocityMagnitude: number,
  rotation: THREE.Quaternion,
  rotationAngularVariance: number,
	gravity: boolean,
	gravityStrength?: number,
	dragCoefficient?: number,
	spinSpeed?: number,
	onCreated?: ( p: Particle ) => void;
	onStep?: ( p: Particle ) => void;
	onDestroy?: ( p: Particle ) => void;
}

// Defines the shape of the volume where the particles are created.
export class EmitterShape {

	constructor() {

		if ( new.target == EmitterShape ) {

			throw new Error( 'Cannot instantiate abstract class EmitterShape.' );

		}

	}

	// A shape determines the location where a particle is emitted
	//
	// Implement abstract class by setting return type but throwign error
	emit(): Particle {

		throw new Error( `${this.constructor.name} must implement emit()` );

	}

}

export class PointEmitterShape extends EmitterShape {

	position: THREE.Vector3;

	constructor( position?: THREE.Vector3 ) {

		super();
		this.position = new THREE.Vector3();
		if ( position !== undefined ) {

			this.position.copy( position );

		}

	}

	emit() {

		const p = new Particle();
		p.position.copy( this.position );
		return p;

	}

}

interface VolumeEmiterShapeParams {
  minBounds: THREE.Vector3,
  maxBounds: THREE.Vector3,
}

export class VolumeEmitterShape extends EmitterShape {

	minBounds: THREE.Vector3;
	maxBounds: THREE.Vector3;

	constructor( params: VolumeEmiterShapeParams ) {

		super();

		this.minBounds = new THREE.Vector3();
		this.maxBounds = new THREE.Vector3();
		this.minBounds.copy( params.minBounds );
		this.maxBounds.copy( params.maxBounds );

	}

	emit() {

		const p = new Particle();
		const x = MATH.remap( Math.random(), 0, 1, this.minBounds.x, this.maxBounds.x );
		const y = MATH.remap( Math.random(), 0, 1, this.minBounds.y, this.maxBounds.y );
		const z = MATH.remap( Math.random(), 0, 1, this.minBounds.z, this.maxBounds.z );
		const newPosition = new THREE.Vector3(
			x,
			y,
			z
		);

		p.position.copy( newPosition );
		return p;

	}

}

export class Particle {

	position: THREE.Vector3;
	velocity: THREE.Vector3;
	life: number;
	maxLife: number;
	id: number;

	static GRAVITY = new THREE.Vector3( 0.0, - 9.8, 0.0 );

	constructor() {

		this.position = new THREE.Vector3();
		this.velocity = new THREE.Vector3();
		this.life = 0;
		this.maxLife = 5;
		this.id = MATH.random();

	}

}

// Emitter will create particles.
// Rather than creating particles randomly,
export class Emitter {

	#particles: Particle[] = [];
	#timeSinceLastEmit: number = 0;
	#numParticlesEmitted: number = 0;
	#params: EmitterParameters;

	constructor( params ) {

		this.#params = params;

		if ( this.#params.startNumParticles ) {

			for ( let i = 0; i < this.#params.startNumParticles; i ++ ) {

				this.#particles.push( this.#emitParticle() );

			}

		}

	}


	getParticles() {

		return this.#particles;

	}

	reset() {

		this.#timeSinceLastEmit = 0;
		this.#numParticlesEmitted = 0;
		this.#particles.length = 0;

		if ( this.#params.startNumParticles ) {

			for ( let i = 0; i < this.#params.startNumParticles; i ++ ) {

				this.#particles.push( this.#emitParticle() );

			}

		}

	}

	setPointEmitterShape( position ) {

		const shape = this.#params.shape as PointEmitterShape;
		shape.position.copy( position );

	}

	step( dt: number, totalTime: number ) {

		// Update current emitter instance.
		this.#updateEmission( dt, totalTime );
		// Update the particles this emitter has jurisdiction over
		this.#updateParticles( dt, totalTime );


		this.#params.particleRenderer.updateFromParticles( this.#particles );

	}

	#canEmitParticle(): boolean {

		// Time between each particle
		const secondsPerParticle = 1.0 / this.#params.particleEmissionRate;

		// Condtions for whether a new particle can be created
		return (
			// We are equal to are beyond the time per particle
			this.#timeSinceLastEmit >= secondsPerParticle &&
			// We are not tracking the maximum number of particles available at once.
			this.#particles.length < this.#params.maxDisplayParticles &&
			// We have created less than the total number of particles that can be created over an emitter's lifetime.
			this.#numParticlesEmitted < this.#params.maxEmission
		);

	}

	#assignVelocityCoordSimon( vel: THREE.Vector3, phi: number, theta: number ) {

		vel.set(
			Math.sin( theta ) * Math.cos( phi ),
			Math.cos( theta ),
			Math.sin( theta ) * Math.sin( phi )
		);

	}

	#assignVelocityCoord( vel: THREE.Vector3, phi: number, theta: number ) {

		// Variables assigned according to definitions of phi and theta here:
		// https://math.libretexts.org/Courses/Mount_Royal_University/MATH_2200%3A_Calculus_for_Scientists_II/7%3A_Vector_Spaces/5.7%3A_Cylindrical_and_Spherical_Coordinates#:~:text=To%20convert%20a%20point%20from,y2%2Bz2).
		vel.set(
			Math.sin( phi ) * Math.cos( theta ),
			Math.sin( phi ) * Math.sin( theta ),
			Math.cos( phi ),
		);

	}

	#emitParticle() {

		const p = this.#params.shape.emit();
		p.maxLife = this.#params.maxLife;

		// Define velocity using spherical coordinates
		// phi essentially defines the angle up or down from the origin
		// (think of an elephant stifening its trunk then pitching it up and down)
		// theta defines the direction along the circumference
		// (think of that same elephant maintaining the direction of its trunk while rotating its body in place)
		const phi = MATH.random() * Math.PI * 2;
		const theta = MATH.random() * this.#params.rotationAngularVariance;

		this.#assignVelocityCoord( p.velocity, phi, theta );

		// Variables assigned according to definitions of phi and theta here:
		// https://math.libretexts.org/Courses/Mount_Royal_University/MATH_2200%3A_Calculus_for_Scientists_II/7%3A_Vector_Spaces/5.7%3A_Cylindrical_and_Spherical_Coordinates#:~:text=To%20convert%20a%20point%20from,y2%2Bz2).
		p.velocity.x = Math.sin( phi ) * Math.cos( theta );
		p.velocity.y = Math.sin( phi ) * Math.sin( theta );
		p.velocity.z = Math.cos( phi );

		p.velocity.multiplyScalar( this.#params.velocityMagnitude );
		p.velocity.applyQuaternion( this.#params.rotation );

		return p;

	}

	// Emitter needs to emit particle in a steady stream.
	// Accordingly, it needs to know how long it's been since it last emitted a particle.
	// Presumably, once a particle has reached a certain lifetime, it can then be emitted
	// again, which replicates the effect of a steady stream of particles with a finite number
	// of them.
	#updateEmission( dt: number, totalTime: number ) {

		this.setPointEmitterShape( new THREE.Vector3( 0, Math.sin( totalTime / 2 ) * 100, 0 ) );
		// Update time since last particle emission
		this.#timeSinceLastEmit += dt;
		const secondsPerParticle = 1.0 / this.#params.particleEmissionRate;

		if ( this.#canEmitParticle() ) {

			// Reset time since last emission
			this.#timeSinceLastEmit -= secondsPerParticle;

			this.#numParticlesEmitted += 1;
			const particle = this.#emitParticle();

			this.#particles.push( particle );

		}

	}

	#updateParticle( p: Particle, dt: number, totalTime: number ) {

		p.life += dt;
		p.life = Math.min( p.life, p.maxLife );

		// Update position based on velocity and gravity
		const forces = this.#params.gravity ? GRAVITY.clone() : new THREE.Vector3();
		forces.multiplyScalar( this.#params.gravityStrength ? this.#params.gravityStrength : 1 );
		forces.add( p.velocity.clone().multiplyScalar( - 0.9 ) );

		p.velocity.add( forces.multiplyScalar( dt ) );

		const displacement = p.velocity.clone().multiplyScalar( dt );
		p.position.add( displacement );

		if ( this.#params.onStep ) {

			this.#params.onStep( p );

		}

		if ( p.life >= p.maxLife ) {

			if ( this.#params.onDestroy ) {

				this.#params.onDestroy( p );

			}

		}

	}


	#updateParticles( dt: number, totalTime: number ) {

		for ( let i = 0; i < this.#particles.length; i ++ ) {

			this.#updateParticle( this.#particles[ i ], dt, totalTime );

		}

		this.#particles = this.#particles.filter( p => p.life < p.maxLife );

	}


}

// Entry point for creating particles that contains emitters.
export class ParticleSystem {

	#emitters: Emitter[] = [];

	constructor() {

	}

	addEmitter( emitter: Emitter ) {

		this.#emitters.push( emitter );

	}

	resetEmitter( index: number ) {

		this.#emitters[ index ].reset();

	}

	step( dt: number, totalTime: number ) {

		for ( const emitter of this.#emitters ) {

			emitter.step( dt, totalTime );

		}

	}

}

// Renders the particles.

export interface ParticleRendererParams {
	positions: Float32Array<ArrayBuffer>,
	lifes: Float32Array<ArrayBuffer>,
	positionAttribute: THREE.InstancedBufferAttribute,
	lifeAttribute: THREE.InstancedBufferAttribute,
	idAttribute: THREE.InstancedBufferAttribute,
	maxDisplayParticles: number,
	scene: THREE.Scene,
	group: THREE.Group,
}

export interface ParticleGeometryAttributes {
	lifeAttribute: THREE.InstancedBufferAttribute,
	idAttribute: THREE.InstancedBufferAttribute,
	positionAttribute: THREE.InstancedBufferAttribute,
}

// Contains particle geometry data and "renders" particles.
// Not actually a draw call per se (that happens in the raf loop)
// but more like a class that separates our CPU logic from our GPU logic.
// We effectively "upload" CPU data to the GPU in this class, which is
// a nice bit of abstraction of "CPU" code from "GPU" code
export class ParticleRenderer {

	// For purposes of the WebGPU version, particlesSprite is effectively the particle geometry.
	// Though it's an inelegant analogue given that the "geometry" returned already has a material
	// attached to it.
	#particlesSprite: THREE.Sprite;
	#geometryAttributes: ParticleGeometryAttributes;
	#positions: Float32Array<ArrayBuffer>;
	#lifes: Float32Array<ArrayBuffer>;

	constructor( material: SpriteNodeMaterial, params: ParticleRendererParams ) {

		// These will be updated per frame
		this.#positions = params.positions;
		this.#lifes = params.lifes;

		// Both static and dynamic geometry attributes
		this.#geometryAttributes = {
			positionAttribute: params.positionAttribute,
			lifeAttribute: params.lifeAttribute,
			idAttribute: params.idAttribute,
		};

		this.#particlesSprite = new THREE.Sprite( material );
		this.#particlesSprite.count = params.maxDisplayParticles;

		params.group.add( this.#particlesSprite );
		params.scene.add( params.group );

	}

	updateFromParticles( particles ) {

		const positions = new Float32Array( particles.length * 3 );
		const lifes = new Float32Array( particles.length );

		for ( let i = 0; i < particles.length; ++ i ) {

			const p = particles[ i ];
			positions[ i * 3 + 0 ] = p.position.x;
			positions[ i * 3 + 1 ] = p.position.y;
			positions[ i * 3 + 2 ] = p.position.z;
			lifes[ i ] = p.life / p.maxLife;

		}

		this.#geometryAttributes.positionAttribute.copyArray( positions );
		this.#geometryAttributes.lifeAttribute.copyArray( lifes );

		console.log( positions );
		console.log( particles.length );
		console.log( particles );

		// Don't necessarily need this if positionAttribute and lifeAttribute
		// are already defined as instancedDynamicBufferAttributes() in TSL
		//this.#geometryAttributes.positionAttribute.needsUpdate = true;
		//this.#geometryAttributes.lifeAttribute.needsUpdate = true;

		this.#particlesSprite.count = particles.length;

	}

}
