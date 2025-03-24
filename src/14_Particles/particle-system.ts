

import * as THREE from 'three';

// Defines the shape of the volume where the particles are created.
class EmitterShape {


}

class Particle {

	position: THREE.Vector3
	velocity: THREE.Vector3
	life: number
	maxLife: number
	
	constructor() {

		this.position = new THREE.Vector3();
		this.velocity = new THREE.Vector3();
		this.life = 0
		this.maxLife = 6;



	}



}

class EmitterParameters {

	// Max number of particles display at once.
	maxDisplayParticles = 100;
	// Number of particles emitted per second
	particleEmissionRate = 1;
	// Max number of particles ever emitted
	maxEmission = 200;

}

// Emitter will create particles.
// Rather than creating particles randomly, 
class Emitter {

	#particles: Particle[] = [];
	#emissionTime = 0;
	#numParticlesEmitted = 0;
	#params: EmitterParameters;

	constructor(params) {
		this.#params = params
	}

	// 1. Update itself and its own properties
	// 2. Then update the particles it has jusidiction over.
	step(dt) {

		this.#updateEmission(dt);
		this.#updateParticles(dt);

	}

	#canCreateParticle() {

		// Time between each particle
		const secondsPerParticle = 1.0 / this.#params.particleEmissionRate;

		// Condtions for whether a new particle can be created
		return (
			// We are equal to are beyond the time per particle
			this.#emissionTime >= secondsPerParticle &&
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
		this.#emissionTime += dt;
		const secondsPerParticle = 1.0 / this.#params.particleEmissionRate;
		
		if (this.#canCreateParticle()) {

			// Reset time since last emission
			this.#emissionTime -= secondsPerParticle

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
			const forces = gravity.clone();
			// Apply pseudo air resistance drag force that works against the velocity
			forces.add(p.velocity.clone().multiplyScalar(DRAG));

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
class ParticleSystem {

	#emitters: Emitter[] = [];

	constructor() {

	}

	// Create an emitter.
	addEmitter(emitter) {

		this.#emitters.push(emitter);

	}

	// Step through each emitter. (probably call in App.onStep())
	step(dt) {

		for (const emitter of this.#emitters) {

			emitter.step(dt);

		}

	}


}

// Renders the particles.
class ParticleRenderer {

}