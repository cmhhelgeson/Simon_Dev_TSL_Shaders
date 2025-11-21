
import * as THREE from 'three';
import { float, texture, vec3, sin, instanceIndex, time, instance, instancedBufferAttribute, instancedDynamicBufferAttribute, vec2, Fn } from 'three/tsl';

import { App } from '../utils/App';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

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
	sizes: Float32Array<ArrayBuffer>,
	angles: Float32Array<ArrayBuffer>
	alphas: Float32Array<ArrayBuffer>,
}

const remap = ( val, inLow, inHigh, outLow, outHigh ) => {

	const t = ( val - inLow ) / ( inHigh - inLow );
	return t * ( outHigh - outLow ) + outLow;

};

class ParticleProject extends App {

	#particles: ParticleInfo[] = [];
	#particlesData: ParticlesData;
	#particleMaterial: THREE.PointsNodeMaterial;

	constructor() {

		super();

	}

	#createPointsParticleSystem() {

		const numParticles = 1000;

		const positions = new Float32Array( numParticles * 3 );
		const sizes = new Float32Array( numParticles );
		const angles = new Float32Array( numParticles );
		const alphas = new Float32Array( numParticles );
		const colors = new Float32Array( numParticles * 3 );

		for ( let i = 0; i < numParticles; i ++ ) {

			const x = positions[ i * 3 ] = ( Math.random() * 2 - 1 ) * 100;
			const y = positions[ i * 3 + 1 ] = ( Math.random() * 2 - 1 ) * 100;
			const z = positions[ i * 3 + 2 ] = ( Math.random() * 2 - 1 ) * 100;
			sizes[ i ] = 100.0;
			angles[ i ] = ( Math.PI * ( ( i % 10 ) / 5 ) );
			alphas[ i ] = 0.0;

			// Direction of velocity explosion will always emanate from the origin
			const dir = new THREE.Vector3( x, y, z ).normalize();

			const c = new THREE.Color().setHSL( Math.random(), 1, 0.5 );
			colors[ i * 3 ] = c.r;
			colors[ i * 3 + 1 ] = c.g;
			colors[ i * 3 + 2 ] = c.b;

			this.#particles.push( {
				life: 0,
				maxLife: 4,
				alpha: 0.0,
				angle: angles[ i ],
				position: new THREE.Vector3( x, y, z ),
				size: 100.0,
				velocity: dir.multiplyScalar( 50 ),
				color: c,
			} );

		}

		const textureLoader = new THREE.TextureLoader();
		const starTexture = textureLoader.load( './resources/star.png' );

		const positionAttribute = new THREE.InstancedBufferAttribute( positions, 3 );
		const sizeAttribute = new THREE.InstancedBufferAttribute( sizes, 1 );
		const angleAttribute = new THREE.InstancedBufferAttribute( angles, 1 );
		const alphaAttribute = new THREE.InstancedBufferAttribute( alphas, 1 );
		const colorAttribute = new THREE.InstancedBufferAttribute( colors, 3 );
		this.#particleMaterial = new THREE.PointsNodeMaterial( {
			color: 0xffffff,
			rotationNode: instancedDynamicBufferAttribute( angleAttribute ),
			positionNode: instancedDynamicBufferAttribute( positionAttribute ),
			sizeNode: instancedDynamicBufferAttribute( sizeAttribute ),
			opacityNode: instancedDynamicBufferAttribute( alphaAttribute ),
			colorNode: Fn( () => {

				const starMap = texture( starTexture );
				const color = instancedBufferAttribute( colorAttribute );

				return vec3( starMap.mul( color ) );


			} )(),
			sizeAttenuation: true,
			depthWrite: false,
			//map: starTexture,
			depthTest: true,
			transparent: true,
			blending: THREE.AdditiveBlending
		} );

		const particles = new THREE.Sprite( this.#particleMaterial );
		particles.count = numParticles;

		this.#particlesData = {
			positions: positions,
			sizes: sizes,
			angles: angles,
			alphas: alphas,
		};

		this.Scene.add( particles );


	}


	#stepParticles( dt, totalTimeElapsed ) {

		if ( ! this.#particleMaterial ) {

			return;

		}

		const {
			positions,
			sizes,
			angles,
			alphas,
		} = this.#particlesData;

		const gravity = new THREE.Vector3( 0.0, - 9.8, 0.0 );
		const DRAG = - 0.1;

		for ( let i = 0; i < this.#particles.length; i ++ ) {

			// Update the particle
			const p = this.#particles[ i ];
			p.life += dt;
			p.life = Math.min( p.life, p.maxLife );

			if ( p.life < 1 ) {

				p.alpha = p.life;

			} else if ( p.life > p.maxLife - 1 ) {

				p.alpha = p.maxLife - p.life;

			}

			const rotationFactor = 1000.0;
			const minDistance = 0.1;
			const rotationSpeed = rotationFactor / ( p.position.length() + minDistance );

			p.angle += rotationSpeed * dt;

			// Apply Gravity
			const forces = gravity.clone();
			// Apply pseudo air resistance drag force that works against the velocity
			forces.add( p.velocity.clone().multiplyScalar( DRAG ) );

			p.velocity.add( forces.multiplyScalar( dt ) );

			const displacement = p.velocity.clone().multiplyScalar( dt );
			p.position.add( displacement );

			// Assign the value of the updated particle to the buffer

			positions[ i * 3 ] = p.position.x;
			positions[ i * 3 + 1 ] = p.position.y;
			positions[ i * 3 + 2 ] = p.position.z;
			alphas[ i ] = p.alpha as number;
			angles[ i ] = p.angle as number;
			sizes[ i ] = p.size + Math.sin( dt / 100 ) * 20.0;

		}


	}

	onStep( dt, totalTimeElapsed ) {

		this.#stepParticles( dt, totalTimeElapsed );

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		this.loadRGBE( './resources/moonless_golf_2k.hdr' );

		this.#createPointsParticleSystem();

	}

}

const APP_ = new ParticleProject();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize();

} );
