
import * as THREE from 'three/webgpu';
import { PointsNodeMaterial } from 'three/webgpu';
import {float, sin, instanceIndex, time, instance, instancedBufferAttribute, vec2} from 'three/tsl';

import { App } from './App';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

interface ParticleInfo {
	life: number,
  maxLife: number,
  alpha?: number,
  size: number
  angle?: number,
  colour?: number,
  position: THREE.Vector3,
  velocity?: THREE.Vector3,
}

interface ParticlesData {
	positions: Float32Array<ArrayBuffer>,
	positionAttribute: THREE.InstancedBufferAttribute,
	sizes: Float32Array<ArrayBuffer>,
	sizeAttribute: THREE.InstancedBufferAttribute,
	angles: Float32Array<ArrayBuffer>
	angleAttribute: THREE.InstancedBufferAttribute,
}


class ParticleProject extends App {
  #particles: ParticleInfo[] = [];
	#particlesData: ParticlesData;
  #particleGeometry: THREE.BufferGeometry
	#particleMaterial: PointsNodeMaterial
	#positionAttribute: THREE.InstancedBufferAttribute;

  constructor() {
    super();
  }

	#createPointsParticleSystem() {

		const numParticles = 1000;

		this.#particleGeometry = new THREE.BufferGeometry();

		const positions = new Float32Array(numParticles * 3);
		const sizes = new Float32Array(numParticles);
		const angles = new Float32Array(numParticles);

		for (let i = 0; i < numParticles; i ++) {
			const x = positions[i * 3] = ( Math.random() * 2 - 1) * 100;
			const y = positions[i * 3 + 1] = (Math.random() * 2 - 1)* 100;
			const z = positions[i * 3 + 2] = (Math.random() * 2 - 1) * 100;
			sizes[i] = 50.0;
			angles[i] = (Math.PI * ((i % 10) / 5 ))

			this.#particles.push({
				life: 0,
				maxLife: 4,
				angle: angles[i],
				position: new THREE.Vector3(x, y, z),
				size: 50.0,
			})
		}

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load('./resources/star.png')

		const positionAttribute = new THREE.InstancedBufferAttribute( positions, 3 );
		const sizeAttribute = new THREE.InstancedBufferAttribute( sizes, 1 );
		const angleAttribute = new THREE.InstancedBufferAttribute( angles, 1)
		this.#particleMaterial = new THREE.PointsNodeMaterial( {
			color: 0xffffff,
			positionNode: instancedBufferAttribute(positionAttribute),
			sizeNode: instancedBufferAttribute(sizeAttribute),
			sizeAttenuation: true,
			depthWrite: false,
			map: starTexture,
			depthTest: true,
			transparent: true,
			blending: THREE.AdditiveBlending
		} );

		const particles = new THREE.Sprite(this.#particleMaterial)
		particles.count = numParticles;

		this.#particlesData = {
			positions: positions,
			positionAttribute: positionAttribute,
			sizes: sizes,
			sizeAttribute: sizeAttribute,
			angles: angles,
			angleAttribute: angleAttribute
		}

		this.Scene.add(particles);


	}


	#stepParticles(dt) {

		if(!this.#particleMaterial) {

			return;

		}

		const {
			positions, positionAttribute,
			sizes, sizesAttribute,
			angles, anglesAttribute
		} = this.#particlesData;

		for (let i = 0; i < this.#particles.length; i++) {

			// Update the particle
			const p = this.#particles[i];

			p.life += dt;
			p.life = Math.min(p.life, p.maxLife);

			p.angle += dt;

			// Assign the value of the updated particle to the buffer
			
			positions[i * 3] = p.position.x;
			p.position.y -= 10.0 * dt;
			positions[i * 3 + 1] = p.position.y 
			positions[i * 3 + 2] = p.position.z;

			positionAttribute.needsUpdate = true;
			
			sizes[i] = p.size + Math.sin(dt / 100) * 20.0;

		}

		
	}

	onStep(dt) {

		this.#stepParticles(dt)


	}
	

	async onSetupProject(projectFolder?: GUI): Promise<void> {
		this.loadRGBE('./resources/moonless_golf_2k.hdr')

		this.#createPointsParticleSystem();

	}

 
}


let APP_ = new ParticleProject();

window.addEventListener('DOMContentLoaded', async () => {
  await APP_.initialize();
});
