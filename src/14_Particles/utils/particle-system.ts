

import * as THREE from 'three';
import MATH from './math';

import { ParticleRenderer } from './particle-renderer';

const GRAVITY = new THREE.Vector3( 0.0, - 9.8, 0.0 );

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

	// The starting position of the particle
	position: THREE.Vector3;
	positionRadiusVariance: number;

	constructor( position?: THREE.Vector3 ) {

		super();
		this.position = new THREE.Vector3();
		this.positionRadiusVariance = 1;
		if ( position !== undefined ) {

			this.position.copy( position );

		}

	}

	emit() {

		const p = new Particle();
		p.position.copy( this.position );

		/*const phi = MATH.random() * Math.PI * 2;
		const theta = MATH.random() * Math.PI;
		const radius = MATH.random() * this.positionRadiusVariance;

		const dir = new THREE.Vector3(
			Math.sin( theta ) * Math.cos( phi ),
			Math.cos( theta ),
			Math.sin( theta ) * Math.sin( phi )
		);
		dir.multiplyScalar( radius );
		p.position.add( dir ); */

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

	// Emit the particle somewhere within the range of the volume
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
	attachedEmitter?: Emitter;
	attachedShape?: PointEmitterShape;

	static GRAVITY = new THREE.Vector3( 0.0, - 9.8, 0.0 );

	constructor() {

		this.position = new THREE.Vector3();
		this.velocity = new THREE.Vector3();
		this.life = 0;
		this.maxLife = 5;
		this.id = MATH.random();

	}

}
type ParticleFunction = ( ( p: Particle ) => void );
export class EmitterParameters {

	// Max number of particles being displayed at once
	// Or the maximum amount of particle data we can hold.
	// For instance, though we may "emit" 1000 particles over the lifetime of the application
	// We'll only store data for 100 particles. When the lives of particles 0 - 99 ends,
	// their memory will be reset and used for the emitted particles 100 - 199
	maxDisplayParticles = 100;
	startNumParticles = 0;
	// Number of particles emitted per second
	particleEmissionRate = 1;
	// Max number of particles emitted during the lifetime of the application
	maxEmission = 100;
	particleRenderer: ParticleRenderer;
	// Volume or point determining where particles are generated
	shape = new PointEmitterShape();
	// SHARED PARTICLE CONSTANTS
	// The maximum life of each particle
	maxLife = 5;
	velocityMagnitude = 0;
	velocityMagnitudeVariance = 0;
	rotation = new THREE.Quaternion();
	rotationAngularVariance = 0;
	gravity = false;
	gravityStrength = 1;
	dragCoefficient = 0.5;
	spinSpeed: number | string = 0;

	// Callback for when a particle is created
	onCreated: ParticleFunction | null = null;
	// Callback for when a partcile is steped
	onStepParticle: ParticleFunction | null = null;
	// Callback for when a partcile is destroyed
	onDestroy: ParticleFunction | null = null;

	constructor() {

	}

}

// Emitter will create particles.
// Rather than creating particles randomly,
export class Emitter {

	// Particles the emitter is responsible for
	#particles: Particle[] = [];
	// Time since a particle was last emitted
	#timeSinceLastEmit: number = 0;
	// Number of particles the emitter has emitted over its lifespan
	#numParticlesEmitted: number = 0;
	#params: EmitterParameters;
	// Dead does not necessarily mean that the emitter is not working
	// Just means it's no longer emitting particles.
	// Difference between dead and onDestroy is like the difference
	// between a decomposing corpse and a completely dissolved corpse.
	#dead: boolean = false;

	constructor( params: EmitterParameters ) {

		this.#params = params;

		// Push initial particles and emit them
		if ( this.#params.startNumParticles ) {

			for ( let i = 0; i < this.#params.startNumParticles; i ++ ) {

				this.#particles.push( this.#emitParticle() );

			}

			this.#numParticlesEmitted = this.#params.startNumParticles;

		}

	}

	dispose() {

		// If there is an on destroy function
		if ( this.#params.onDestroy ) {

			// Destroy each of the emitter's particles
			for ( let i = 0; i < this.#particles.length; ++ i ) {

				this.#params.onDestroy( this.#particles[ i ] );


			}

		}

		// New empty array
		this.#particles = [];

		// If there is a renderer, dispose of the renderer
		if ( this.#params.particleRenderer ) {

			this.#params.particleRenderer.dispose();

		}

	}

	get StillActive() {

		if ( this.#dead ) {

			return false;

		}

		return (
			this.#numParticlesEmitted < this.#params.maxEmission ||
			this.#particles.length > 0
		);

	}

	stop() {

		this.#params.maxEmission = 0;

	}

	kill() {

		this.#dead = true;

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

		if ( this.#params.particleRenderer ) {

			this.#params.particleRenderer.updateFromParticles( this.#particles, totalTime );

		}

	}

	#canEmitParticle(): boolean {

		if ( this.#dead ) {

			return false;

		}

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


	// Creates a particle pushed to the emitter's particle array
	#emitParticle() {

		// Create a Particle with a position determined by the Emitter's EmitterShape
		const p = this.#params.shape.emit();

		// Assign the global max life for all particles to the particle
		p.maxLife = this.#params.maxLife;

		// Define velocity using spherical coordinates
		// phi essentially defines the angle up or down from the origin
		// (think of an elephant stifening its trunk then pitching it up and down)
		// theta defines the direction along the circumference
		// (think of that same elephant maintaining the direction of its trunk while rotating its body in place)
		const phi = MATH.random() * Math.PI * 2;
		const theta = MATH.random() * this.#params.rotationAngularVariance;

		// Not really a velocity assignation here, but an assignation of the direction of the particle (direction)
		p.velocity = new THREE.Vector3(
			Math.sin( theta ) * Math.cos( phi ),
			Math.cos( theta ),
			Math.sin( theta ) * Math.sin( phi )
		);

		// Vary the velocity within a range determined by velocityMagnitudeVariance (magnitude)
		const velocity = (
			this.#params.velocityMagnitude +
        ( MATH.random() * 2 - 1 ) * this.#params.velocityMagnitudeVariance );

		// Multiply direction by magnitude (oh yeah!)
		p.velocity.multiplyScalar( velocity );
		// Apply rotation
		p.velocity.applyQuaternion( this.#params.rotation );

		if ( this.#params.onCreated ) {

			this.#params.onCreated( p );

		}

		return p;

	}

	// Emitter needs to emit particle in a steady stream.
	// Accordingly, it needs to know how long it's been since it last emitted a particle.
	// Presumably, once a particle has reached a certain lifetime, it can then be emitted
	// again, which replicates the effect of a steady stream of particles with a finite number
	// of them.
	#updateEmission( dt: number, totalTime: number ) {

		// If Emitter is killed do nothing
		if ( this.#dead ) {

			return;

		}

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
		forces.multiplyScalar( this.#params.gravityStrength ?? 100 );
		forces.add( p.velocity.clone().multiplyScalar( - ( this.#params.dragCoefficient ?? 0.1 ) ) );

		p.velocity.add( forces.multiplyScalar( dt ) );

		const displacement = p.velocity.clone().multiplyScalar( dt );
		p.position.add( displacement );

		if ( this.#params.onStepParticle ) {

			this.#params.onStepParticle( p );

		}

		if ( p.life >= p.maxLife ) {

			if ( this.#params.onDestroy ) {

				this.#params.onDestroy( p );

			}

		}

	}


	#updateParticles( dt: number, totalTime: number ) {

		for ( let i = 0; i < this.#particles.length; i ++ ) {

			const p = this.#particles[ i ];
			this.#updateParticle( p, dt, totalTime );

		}

		this.#particles = this.#particles.filter( p => p.life < p.maxLife );

	}


}

// Entry point for creating particles that contains emitters.
export class ParticleSystem {

	#emitters: Emitter[] = [];

	constructor() {

	}

	dispose() {

		for ( let i = 0; i < this.#emitters.length; ++ i ) {

			this.#emitters[ i ].dispose();

		}


	}

	// Sim is still active if any of its emitters are not dead
	get StillActive() {

		for ( let i = 0; i < this.#emitters.length; i ++ ) {

			if ( this.#emitters[ i ].StillActive ) {

				return true;

			}

		}

		return false;

	}

	addEmitter( emitter: Emitter ) {

		this.#emitters.push( emitter );

	}

	resetEmitter( index: number ) {

		this.#emitters[ index ].reset();

	}

	// Arbitrarily kills all emitters, which will invoke the callback on onStep that disposes of the particle's state
	killAllEmitters() {

		for ( let i = 0; i < this.#emitters.length; i ++ ) {

			this.#emitters[ i ].kill();

		}

	}

	step( dt: number, totalTime: number ) {

		for ( let i = 0; i < this.#emitters.length; ++ i ) {

			const e = this.#emitters[ i ];

			e.step( dt, totalTime );

			if ( ! e.StillActive ) {

				e.dispose();

			}

		}

		this.#emitters = this.#emitters.filter( e => e.StillActive );

	}

}




