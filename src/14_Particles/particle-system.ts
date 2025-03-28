

import * as THREE from 'three';
import MATH from './math';
import { instancedBufferAttribute, texture, vec2, Fn, vec3 } from 'three/tsl';

import { NodeMaterial, PointsNodeMaterial } from 'three/webgpu';

interface EmitterParameters {
	// Max number of particles being displayed at once
	// Or the maximum amount of particle data we can hold.
	// For instance, though we may "emit" 1000 particles over the lifetime of the application
	// We'll only store data for 100 particles. When the lives of particles 0 - 99 ends,
	// their memory will be reset and used for the emitted particles 100 - 199
	maxDisplayParticles: number,
	// Number of particles emitted per second
	particleEmissionRate: number,
	// Max number of particles emitted during the lifetime of the application
	maxEmission: number,
}

// Defines the shape of the volume where the particles are created.
export class EmitterShape {


}

export class Particle {

	position: THREE.Vector3
	velocity: THREE.Vector3
	life: number
	maxLife: number

	static GRAVITY = new THREE.Vector3(0.0, -9.8, 0.0)
	
	constructor() {

		this.position = new THREE.Vector3();
		this.velocity = new THREE.Vector3();
		this.life = 0
		this.maxLife = 18;

	}

}

// Emitter will create particles.
// Rather than creating particles randomly, 
export class Emitter {

	#particles: Particle[] = [];
	#timeSinceLastEmit: number = 0;
	#numParticlesEmitted: number = 0;
	#params: EmitterParameters;

	constructor(params) {
		this.#params = params
	}


	step(dt) {

		// Update current emitter instance.
		this.#updateEmission(dt);
		// Update the particles this emitter has jurisdiction over
		this.#updateParticles(dt);

	}

	#canCreateParticle() {

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

	#emitParticle() {

		const p = new Particle();
		return p;

	}

	// Emitter needs to emit particle in a steady stream.
	// Accordingly, it needs to know how long it's been since it last emitted a particle.
	// Presumably, once a particle has reached a certain lifetime, it can then be emitted
	// again, which replicates the effect of a steady stream of particles with a finite number
	// of them.
	#updateEmission(dt) {

		// Update time since last particle emission
		this.#timeSinceLastEmit += dt;
		const secondsPerParticle = 1.0 / this.#params.particleEmissionRate;
		
		if (this.#canCreateParticle()) {

			// Reset time since last emission
			this.#timeSinceLastEmit -= secondsPerParticle

			this.#numParticlesEmitted += 1;

			this.#particles.push(this.#emitParticle())


		}

	}

	#updateParticle(p, dt) {

			p.life += dt;
			p.life = Math.min(p.life, p.maxLife)
			
			const rotationFactor = 100.0;
			const minDistance = 0.1;
			const rotationSpeed = rotationFactor / (p.position.length() + minDistance);

			p.angle += rotationSpeed * dt;

			// Apply Gravity
			const forces = Particle.GRAVITY.clone();
			// Apply pseudo air resistance drag force that works against the velocity
			forces.add(p.velocity.clone().multiplyScalar(0.1)); //DRAG

			p.velocity.add(forces.multiplyScalar(dt));

			const displacement = p.velocity.clone().multiplyScalar(dt);
			//p.position.add(displacement)



	}

	#updateParticles(dt) {

		for (const particle of this.#particles) {

			this.#updateParticle(particle, dt);

		}

	}


}


// Entry point for creating particles that contains emitters.
export class ParticleSystem {

	#emitters: Emitter[] = [];

	constructor() {

	}

	addEmitter(emitter) {

		this.#emitters.push(emitter);

	}

	step(dt) {

		for (const emitter of this.#emitters) {

			emitter.step(dt);

		}

	}

}

// Renders the particles.

interface ParticleRendererParams {
	positions: Float32Array<ArrayBuffer>,
	lifes: Float32Array<ArrayBuffer>,
	numParticles: number,
	scene: THREE.Scene,
}
export class ParticleRenderer {
	
	// For purposes of the WebGPU version, particlesSprite is effectively the particle geometry.
	// Though it's an inelegant analogue given that the "geometry" returned already has a material 
	// attached to it.
	#particlesSprite: THREE.Sprite;
	#positions: Float32Array<ArrayBuffer>;
	#lifes: Float32Array<ArrayBuffer>;

	constructor(material, params: ParticleRendererParams) {

		this.#positions = params.positions;
		this.#lifes = params.lifes;

		this.#particlesSprite = new THREE.Sprite(material);
		this.#particlesSprite.count = params.numParticles;

		params.scene.add(this.#particlesSprite);

	}

	updateFromParticles(particles: Particle[]) {

		for (let i = 0; i < particles.length; i++) {

			const particle = particles[i]
			this.#positions[i * 3 + 0] = particle.position.x
			this.#positions[i * 3 + 1] = particle.position.y
			this.#positions[i * 3 + 2] = particle.position.z;

			this.#lifes[i] = particle.life / particle.maxLife;


		}

	}

	updateFromParticle(particle: Particle, index: number) {

		this.#positions[index * 3 + 0] = particle.position.x;
		this.#positions[index * 3 + 1] = particle.position.y;
		this.#positions[index * 3 + 2] = particle.position.z;

		this.#lifes[index] = particle.life / particle.maxLife;

	}

}