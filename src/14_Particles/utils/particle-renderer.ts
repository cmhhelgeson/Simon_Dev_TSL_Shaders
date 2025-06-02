import * as THREE from 'three';
import { instancedBufferAttribute, instancedDynamicBufferAttribute, mix, ShaderNodeObject, sin, texture, time, vec2, vec3 } from 'three/tsl';
import { PointsNodeMaterial, SpriteNodeMaterial, UniformNode } from 'three/webgpu';
import MATH from './math';
import { Fn } from 'three/src/nodes/TSL.js';
import { Particle } from './particle-system';

export interface ParticleGeometryAttributes {
	lifeAttribute: THREE.InstancedBufferAttribute,
	idAttribute: THREE.InstancedBufferAttribute,
	positionAttribute: THREE.InstancedBufferAttribute,
}

export interface ParticleUniformsType {
	sizeOverLifeTexture: THREE.DataTexture
	colorOverLifeTexture: THREE.DataTexture
	map: THREE.Texture,
	alphaOverLifeTexture: THREE.DataTexture
	twinkleOverLifeTexture: THREE.DataTexture
}

export interface ParticleUniformsTypeWebGPU extends ParticleUniformsType {
	spinSpeed: number | ShaderNodeObject<UniformNode<number>>
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
	uniforms: Record<string, ShaderNodeObject<UniformNode<number>>>
}

export class ParticleRenderer {

	#backend: ParticleRendererBackend;

	constructor( renderer: 'WebGL' | 'WebGPU' = 'WebGPU' ) {

		this.#backend = renderer === 'WebGPU' ? new ParticleRendererWebGPUBackend() : new ParticleRendererWebGLBackend();

	}

	dispose() {

		this.#backend.dispose();

	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	initialize( uniforms: ParticleUniformsType, params: any ) {

		this.#backend.initialize( uniforms, params );

	}

	updateFromParticles( particles: Particle[] ) {

		this.#backend.updateFromParticles( particles );

	}

}

abstract class ParticleRendererBackend {

	abstract dispose(): void;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	abstract initialize( uniforms: ParticleUniformsType, params: any ): void;
	abstract updateFromParticles( particles: Particle[] ): void;

}

// Contains particle geometry data and "renders" particles.
// Not actually a draw call per se (that happens in the raf loop)
// but more like a class that separates our CPU logic from our GPU logic.
// We effectively "upload" CPU data to the GPU in this class, which is
// a nice bit of abstraction of "CPU" code from "GPU" code
export class ParticleRendererWebGPUBackend extends ParticleRendererBackend {

	// For purposes of the WebGPU version, particlesSprite is effectively the particle geometry.
	// Though it's an inelegant analogue given that the "geometry" returned already has a material
	// attached to it.
	#particlesSprite: THREE.Sprite | null = null;
	#geometryAttributes: ParticleGeometryAttributes | null = null;
	#particleMaterial: SpriteNodeMaterial | null = null;
	#uniforms: ParticleUniformsTypeWebGPU;

	constructor( ) {

		super();

	}

	dispose() {

		this.#particlesSprite?.removeFromParent();
		this.#geometryAttributes = null;
		// We tend to recreate materials a lot perhaps there should be some kind of map of the materials that are created
		this.#particleMaterial?.dispose();
		this.#particlesSprite = null;

	}

	initialize( uniforms: ParticleUniformsTypeWebGPU, params ) {

		const positions = new Float32Array( params.maxDisplayParticles * 3 );
		const lifes = new Float32Array( params.maxDisplayParticles );
		const ids = new Float32Array( params.maxDisplayParticles );

		for ( let i = 0; i < params.maxDisplayParticles; i ++ ) {

			ids[ i ] = MATH.random();

		}

		const positionAttribute = new THREE.InstancedBufferAttribute( positions, 3 );
		const lifeAttribute = new THREE.InstancedBufferAttribute( lifes, 1 );
		const idAttribute = new THREE.InstancedBufferAttribute( ids, 1 );

		// Using instancedDynamicBufferAttributes obivates the need to execute these lines
		// of code in our updateFromParticles function
		// ... this.#geometryAttributes.positionAttribute.needsUpdate = true;
		// ... this.#geometryAttributes.lifeAttribute.needsUpdate = true;

		const lifeNode = instancedDynamicBufferAttribute( lifeAttribute );
		const newPosition = instancedDynamicBufferAttribute( positionAttribute );
		const idNode = instancedBufferAttribute( idAttribute );

		// Both static and dynamic geometry attributes
		this.#geometryAttributes = {
			positionAttribute: positionAttribute,
			lifeAttribute: lifeAttribute,
			idAttribute: idAttribute,
		};

		this.#uniforms = uniforms;

		const {
			sizeOverLifeTexture,
			colorOverLifeTexture,
			map,
			alphaOverLifeTexture,
			twinkleOverLifeTexture,
			spinSpeed,
		} = this.#uniforms;

		const idNodeOffset = idNode.mul( 6.28 );

		const colorNodeCallback = () => {

			const starMap = texture( map );
			const color = texture( colorOverLifeTexture, vec2( lifeNode, 0.5 ) ).rgb;
			return vec3( starMap.mul( color ) );

		};

		console.log( params.blending );

		this.#particleMaterial = new PointsNodeMaterial( {
			//color: 0xffffff,
			positionNode: newPosition,
			sizeNode: texture( sizeOverLifeTexture, vec2( lifeNode, 0.5 ) ).x,
			colorNode: Fn( colorNodeCallback )(),
			opacityNode: Fn( () => {

				const twinkleSample = texture( twinkleOverLifeTexture, vec2( lifeNode, 0.5 ) ).x;
  			const twinkle = mix( 1.0, sin(
					time.mul( 20.0 ).add( idNodeOffset )
				).mul( 0.5 ).add( 0.5 ), twinkleSample
				);

				const alpha = texture( alphaOverLifeTexture, vec2( lifeNode, 0.5 ) ).x;
				return alpha.mul( twinkle );

			} )(),
			sizeAttenuation: true,
			depthWrite: false,
			depthTest: true,
			transparent: true,
			blending: params.blending ? params.blending : THREE.AdditiveBlending,
			rotationNode: time.mul( spinSpeed ).add( idNodeOffset ),
		} );

		this.#particlesSprite = new THREE.Sprite( this.#particleMaterial );
		this.#particlesSprite.count = params.maxDisplayParticles;

		params.group.add( this.#particlesSprite );
		params.scene.add( params.group );

		return this.#particleMaterial;

	}

	updateFromParticles( particles: Particle[] ) {

		const positions = new Float32Array( particles.length * 3 );
		const lifes = new Float32Array( particles.length );

		for ( let i = 0; i < particles.length; ++ i ) {

			const p = particles[ i ];
			positions[ i * 3 + 0 ] = p.position.x;
			positions[ i * 3 + 1 ] = p.position.y;
			positions[ i * 3 + 2 ] = p.position.z;
			lifes[ i ] = p.life / p.maxLife;

		}

		this.#geometryAttributes?.positionAttribute.copyArray( positions );
		if ( this.#geometryAttributes?.lifeAttribute ) {

			this.#geometryAttributes.lifeAttribute.copyArray( lifes );

		}

		// Don't necessarily need this if positionAttribute and lifeAttribute
		// are already defined as instancedDynamicBufferAttributes() in TSL
		//this.#geometryAttributes.positionAttribute.needsUpdate = true;
		//this.#geometryAttributes.lifeAttribute.needsUpdate = true;

		if ( this.#particlesSprite ) {

			this.#particlesSprite.count = particles.length;

		}

	}

}

class ParticleRendererWebGLBackend extends ParticleRendererBackend {

	constructor() {

		super();

	}

	dispose() {

		console.log( 'dispose' );

	}

	initialize( uniforms: ParticleUniformsType, params: any ) {

		console.log( 'test' );

	}

	updateFromParticles( particles: Particle[] ) {

		console.log( 'yo' );

	}

}
