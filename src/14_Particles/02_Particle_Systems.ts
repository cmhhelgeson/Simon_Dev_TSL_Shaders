
import * as THREE from 'three';
import {float, texture, vec3, sin, instanceIndex, time, instance, instancedBufferAttribute, vec2, Fn} from 'three/tsl';

import { App } from './App';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import MATH from './math'

interface ParticleInfo {
	life: number,
  maxLife: number,
  alpha: number,
  size: number
  angle: number,
  color: THREE.Color,
  position: THREE.Vector3,
  velocity: THREE.Vector3,
}

interface ParticlesData {
	positions: Float32Array<ArrayBuffer>,
	positionAttribute: THREE.InstancedBufferAttribute,
	sizes: Float32Array<ArrayBuffer>,
	sizeAttribute: THREE.InstancedBufferAttribute,
	angles: Float32Array<ArrayBuffer>
	angleAttribute: THREE.InstancedBufferAttribute,
	alphas: Float32Array<ArrayBuffer>,
	alphaAttribute: THREE.InstancedBufferAttribute,
	colors: Float32Array<ArrayBuffer>,
	colorAttribute: THREE.InstancedBufferAttribute,
	lifes: Float32Array<ArrayBuffer>,
	lifeAttribute: THREE.InstancedBufferAttribute,
}

const remap = (val, inLow, inHigh, outLow, outHigh) => {
	
	const t = (val - inLow) / (inHigh - inLow);
	return t * (outHigh - outLow) + outLow;

}


class ParticleProject extends App {
  #particles: ParticleInfo[] = [];
	#particlesData: ParticlesData;
	#particleMaterial: THREE.PointsNodeMaterial

  constructor() {
    super();
  }

	#createPointsParticleSystem() {

		const numParticles = 1000;

		const positions = new Float32Array(numParticles * 3);
		const sizes = new Float32Array(numParticles);
		const angles = new Float32Array(numParticles);
		const alphas = new Float32Array(numParticles);
		const colors = new Float32Array(numParticles * 3)
		const lifes = new Float32Array(numParticles);

		for (let i = 0; i < numParticles; i ++) {
			const x = positions[i * 3] = ( MATH.random() * 2 - 1) * 100;
			const y = positions[i * 3 + 1] = (MATH.random() * 2 - 1)* 100;
			const z = positions[i * 3 + 2] = (MATH.random() * 2 - 1) * 100;
			sizes[i] = 100.0;
			angles[i] = (Math.PI * ((i % 10) / 5 ));
			alphas[i] = 0.0;
			lifes[i] = 0.0;

			// Direction of velocity explosion will always emanate from the origin
			const dir = new THREE.Vector3(x, y, z).normalize();

			const c = new THREE.Color().setHSL(1.0, 1.0, 1.0);
			colors[i * 3] = c.r;
			colors[i * 3 + 1] = c.g;
			colors[i * 3 + 2] = c.b;

			this.#particles.push({
				life: 0,
				maxLife: 6,
				alpha: 1.0,
				angle: angles[i],
				position: new THREE.Vector3(x, y, z),
				size: 100.0,
				velocity: dir.multiplyScalar(50),
				color: c,
			})
		}

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load('./resources/star.png')

		const sizesOverLife = new MATH.FloatInterpolant([
			{time: 0, value: 100.0},
			{time: 1, value: 0.0},
			{time: 2, value: 100.0},
			{time: 3, value: 0.0},
			{time: 4, value: 200.0},
			{time: 5, value: 0.0},
			{time: 6, value: 100.0},
		]);

		const sizeOverLifeTexture: THREE.DataTexture = sizesOverLife.toTexture();

		const positionAttribute = new THREE.InstancedBufferAttribute( positions, 3 );
		const sizeAttribute = new THREE.InstancedBufferAttribute( sizes, 1 );
		const angleAttribute = new THREE.InstancedBufferAttribute( angles, 1)
		const alphaAttribute = new THREE.InstancedBufferAttribute(alphas, 1)
		const colorAttribute = new THREE.InstancedBufferAttribute(colors, 3);
		const lifeAttribute = new THREE.InstancedBufferAttribute(lifes, 1);
		this.#particleMaterial = new THREE.PointsNodeMaterial( {
			color: 0xffffff,
			rotationNode: instancedBufferAttribute(angleAttribute),
			positionNode: instancedBufferAttribute(positionAttribute),
			sizeNode: texture(sizeOverLifeTexture, vec2(instancedBufferAttribute(lifeAttribute), 0.5)).x,
			opacityNode: instancedBufferAttribute(alphaAttribute),
			colorNode: Fn(() => {

				const starMap = texture(starTexture);
				const color = instancedBufferAttribute(colorAttribute);
				return vec3(starMap.mul(color));

			})(),
			sizeAttenuation: true,
			depthWrite: false,
			//map: starTexture,
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
			angleAttribute: angleAttribute,
			alphas: alphas,
			alphaAttribute: alphaAttribute,
			colors: colors,
			colorAttribute: colorAttribute,
			lifes: lifes,
			lifeAttribute: lifeAttribute,
		}

		this.Scene.add(particles);

	}


	#stepParticles(dt, totalTimeElapsed) {

		if(!this.#particleMaterial) {

			return;

		}

		const {
			positions, positionAttribute,
			sizes, sizeAttribute,
			angles, angleAttribute,
			alphas, alphaAttribute,
			colors, colorAttribute,
			lifes, lifeAttribute
		} = this.#particlesData;

		const gravity = new THREE.Vector3(0.0, -9.8, 0.0);
		const DRAG = -0.1;

		const colorOverLife = new MATH.ColorInterpolant([
			{time: 0, value: new THREE.Color(0xFFFFFF)},
			{time: 1, value: new THREE.Color(0xFF0000)},
			{time: 2, value: new THREE.Color(0x00FF00)},
			{time: 3, value: new THREE.Color(0x0000FF)},
			{time: 4, value: new THREE.Color(0xFFFFFF)},
		]);

		const alphaOverLife = new MATH.FloatInterpolant([
			{time: 0, value: 0},
			{time: 1, value: 1},
			{time: 6, value: 0},
		]);

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
			//p.position.add(displacement)

			// Assign the value of the updated particle to the buffer
			
			p.alpha = alphaOverLife.evaluate(p.life)
			const color = colorOverLife.evaluate(p.life);
			// Positions
			positions[i * 3] = p.position.x;
			positions[i * 3 + 1] = p.position.y 
			positions[i * 3 + 2] = p.position.z;
			// Colors
			colors[i * 3] = color.r;
			colors[i * 3 + 1] = color.g;
			colors[i * 3 + 2] = color.b;
			// Other
			alphas[i] = p.alpha as number;
			angles[i] = p.angle as number;
			
			//sizes[i] = 300.0;

			lifes[i] = p.life / p.maxLife;

			positionAttribute.needsUpdate = true;
			// Block to get rid of
			alphaAttribute.needsUpdate = true;
			angleAttribute.needsUpdate = true;
			colorAttribute.needsUpdate = true;
			// End of block
			lifeAttribute.needsUpdate = true;
			//sizeAttribute.needsUpdate = true;

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
