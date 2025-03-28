
import * as THREE from 'three';
import {float, texture, vec3, sin, instanceIndex, time, instance, instancedBufferAttribute, instancedDynamicBufferAttribute, vec2, Fn} from 'three/tsl';

import { App } from './App';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import MATH from './math'

import { ParticleRenderer } from './particle-system';

interface ParticleInfo {
	life: number,
  maxLife: number,
  alpha: number,
  size: number
  angle: number,
  position: THREE.Vector3,
  velocity: THREE.Vector3,
}

interface ParticlesData {
	positions: Float32Array<ArrayBuffer>,
	angles: Float32Array<ArrayBuffer>
	lifes: Float32Array<ArrayBuffer>,
}

const remap = (val, inLow, inHigh, outLow, outHigh) => {
	
	const t = (val - inLow) / (inHigh - inLow);
	return t * (outHigh - outLow) + outLow;

}


class ParticleProject extends App {
  #particles: ParticleInfo[] = [];
	#particleRenderer: ParticleRenderer;
	#particlesData: ParticlesData;
	#particleMaterial: THREE.PointsNodeMaterial

  constructor() {
    super();
  }

	#createPointsParticleSystem() {

		const numParticles = 1000;

		const positions = new Float32Array(numParticles * 3);
		const angles = new Float32Array(numParticles);
		const lifes = new Float32Array(numParticles);

		for (let i = 0; i < numParticles; i ++) {
			const x = positions[i * 3] = ( MATH.random() * 2 - 1) * 100;
			const y = positions[i * 3 + 1] = (MATH.random() * 2 - 1)* 100;
			const z = positions[i * 3 + 2] = (MATH.random() * 2 - 1) * 100;
			angles[i] = (Math.PI * ((i % 10) / 5 ));
			lifes[i] = 0.0;

			// Direction of velocity explosion will always emanate from the origin
			const dir = new THREE.Vector3(x, y, z).normalize();

			this.#particles.push({
				life: 0,
				maxLife: 18,
				alpha: 1.0,
				angle: angles[i],
				position: new THREE.Vector3(x, y, z),
				size: 100.0,
				velocity: dir.multiplyScalar(50),
			})
		}

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load('./resources/star.png')

		// All particles use one life value (p.life / p.maxLife) so each interpolant has to cover
		// the same length of time, irrespective of whether it is doing anything during
		// large stretches of time.
		const sizesOverLife = new MATH.FloatInterpolant([
			{time: 0, value: 100.0},
			{time: 1, value: 0.0},
			{time: 2, value: 100.0},
			{time: 3, value: 0.0},
			{time: 4, value: 200.0},
			{time: 5, value: 0.0},
			{time: 6, value: 100.0},
			{time: 18, value: 100.0},
		]);

		const alphasOverLife = new MATH.FloatInterpolant([
			{time: 0, value: 1},
			{time: 8, value: 1},
			{time: 10, value: 0},
			{time: 12, value: 1},
			{time: 18, value: 1},
		]);

		const colorsOverLife = new MATH.ColorInterpolant([
			{time: 0, value: new THREE.Color(0xFFFFFF)},
			{time: 14, value: new THREE.Color(0xFFFFFF)},
			{time: 15, value: new THREE.Color(0xFF0000)},
			{time: 16, value: new THREE.Color(0x00FF00)},
			{time: 17, value: new THREE.Color(0x0000FF)},
			{time: 18, value: new THREE.Color(0xFFFFFF)},
		]);

		const sizeOverLifeTexture: THREE.DataTexture = sizesOverLife.toTexture();
		const alphasOverLifeTexture: THREE.DataTexture = alphasOverLife.toTexture();
		const colorsOverLifeTexture: THREE.DataTexture = colorsOverLife.toTexture();

		const positionAttribute = new THREE.InstancedBufferAttribute( positions, 3 );
		const angleAttribute = new THREE.InstancedBufferAttribute( angles, 1)
		const lifeAttribute = new THREE.InstancedBufferAttribute(lifes, 1);

		const lifeNode = instancedDynamicBufferAttribute(lifeAttribute)
		
		this.#particleMaterial = new THREE.PointsNodeMaterial( {
			color: 0xffffff,
			rotationNode: instancedDynamicBufferAttribute(angleAttribute).debug(code => console.log(code)),
			positionNode: instancedDynamicBufferAttribute(positionAttribute).debug(code => console.log(code)),
			sizeNode: texture(sizeOverLifeTexture, vec2(lifeNode, 0.5)).x,
			opacityNode: texture(alphasOverLifeTexture, vec2(lifeNode, 0.5)).x,
			colorNode: Fn(() => {

				const starMap = texture(starTexture);
				const color = texture(colorsOverLifeTexture, vec2(lifeNode, 0.5)).rgb;
				return vec3(starMap.mul(color));

			})(),
			sizeAttenuation: true,
			depthWrite: false,
			depthTest: true,
			transparent: true,
			blending: THREE.AdditiveBlending
		} )

		this.#particleRenderer = new ParticleRenderer(this.#particleMaterial, {
			scene: this.Scene,
			positions: positions,
			lifes: lifes,
			numParticles: numParticles,
		})

	}

	#stepParticles(dt, totalTimeElapsed) {

		if(!this.#particleMaterial) {

			return;

		}

		const gravity = new THREE.Vector3(0.0, -9.8, 0.0);
		const DRAG = -0.1;

		for (let i = 0; i < this.#particles.length; i++) {

			// Update the particle
			const p = this.#particles[i];
			p.life += dt;
			p.life = Math.min(p.life, p.maxLife)
			
			const rotationFactor = 100.0;
			const minDistance = 0.1;
			const rotationSpeed = rotationFactor / (p.position.length() + minDistance);

			p.angle += rotationSpeed * dt;

			// Apply Gravity
			const forces = gravity.clone();
			// Apply pseudo air resistance drag force that works against the velocity
			forces.add(p.velocity.clone().multiplyScalar(DRAG))

			p.velocity.add(forces.multiplyScalar(dt));

			const displacement = p.velocity.clone().multiplyScalar(dt);
			p.position.add(displacement)
			
			this.#particleRenderer.updateFromParticle(p, i)

		}

		
	}

	onStep(dt, totalTimeElapsed) {

		this.#stepParticles(dt, totalTimeElapsed)

	}
	
	async onSetupProject(projectFolder?: GUI): Promise<void> {
		this.loadRGBE('./resources/moonless_golf_2k.hdr')

		this.#createPointsParticleSystem();

	}

}

let APP_ = new ParticleProject();


/*const interpolater = new MATH.ColorInterpolant(
	[
		{ time: 0, value: new THREE.Color(0xFFFFFF)},
		{ time: 1, value: new THREE.Color(0xFF0000)},
		{time: 10, value: new THREE.Color(0x00FF00)},
	]
);

console.log(interpolater.evaluate(9.9)) */

window.addEventListener('DOMContentLoaded', async () => {
  await APP_.initialize();
});
