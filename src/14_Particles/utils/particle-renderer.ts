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

export interface ParticleGeometryBuffers {
	positions: Float32Array,
	lifes: Float32Array,
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
		const newPosition = instancedDynamicBufferAttribute( positionAttribute ).label( 'dirper' );
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

		console.log( this.#particlesSprite );

		params.group.add( this.#particlesSprite );
		params.scene.add( params.group );

		return this.#particleMaterial;

	}

	updateFromParticles( particles: Particle[] ) {

		if ( this.#geometryAttributes ) {

			for ( let i = 0; i < particles.length; ++ i ) {

				const p = particles[ i ];

				// Not always best practice to update arrays directly but for now we do
				this.#geometryAttributes.positionAttribute.array[ i * 3 + 0 ] = p.position.x;
				this.#geometryAttributes.positionAttribute.array[ i * 3 + 1 ] = p.position.y;
				this.#geometryAttributes.positionAttribute.array[ i * 3 + 2 ] = p.position.z;
				this.#geometryAttributes.lifeAttribute.array[ i ] = p.life / p.maxLife;

			}

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


// ParticleRenderer will render particles
class ParticleRendererWebGLBackend extends ParticleRendererBackend {

	#particleGeometry: THREE.BufferGeometry | null;
	#particlePoints: THREE.Points | null;
	#material: THREE.ShaderMaterial | null;

	constructor() {

		super();

	}

	dispose() {

		this.#particlePoints?.removeFromParent();
		this.#particleGeometry?.dispose();
		this.#material?.dispose();

		this.#particlePoints = null;
		// Is setting particleGeometry to null necessary
		this.#particleGeometry = null;
		// As is setting the material to null?
		this.#material = null;

	}

	initialize( material, params ) {

		this.#particleGeometry = new THREE.BufferGeometry();

		const positions = new Float32Array( params.maxParticles * 3 );
		const particleData = new Float32Array( params.maxParticles * 2 );

		this.#particleGeometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
		this.#particleGeometry.setAttribute( 'particleData', new THREE.Float32BufferAttribute( particleData, 2 ) );

		// Set dynamic draw usage on every attribute we plan on updating
		( this.#particleGeometry.attributes.position as THREE.BufferAttribute ).setUsage( THREE.DynamicDrawUsage );
		( this.#particleGeometry.attributes.position as THREE.BufferAttribute ).setUsage( THREE.DynamicDrawUsage );

		this.#particlePoints = new THREE.Points( this.#particleGeometry, material );

		this.#material = material;

		params.group.add( this.#particlePoints );

	}

	updateFromParticles( particles: Particle[], params, totalTimeElapsed ) {

		if ( this.#material ) {

			this.#material.uniforms.time.value = totalTimeElapsed;
			this.#material.uniforms.spinSpeed.value = params.spinSpeed;

		}

		if ( this.#particleGeometry ) {

			for ( let i = 0; i < particles.length; ++ i ) {

				const p = particles[ i ];
				this.#particleGeometry.attributes.position.array[ i * 3 + 0 ] = p.position.x;
				this.#particleGeometry.attributes.position.array[ i * 3 + 1 ] = p.position.y;
				this.#particleGeometry.attributes.position.array[ i * 3 + 2 ] = p.position.z;
				this.#particleGeometry.attributes.particleData.array[ i * 2 + 0 ] = p.life / p.maxLife;
				this.#particleGeometry.attributes.particleData.array[ i * 2 + 1 ] = p.id;

			}

		}

		if ( this.#particleGeometry ) {

			this.#particleGeometry.attributes.position.needsUpdate = true;
			this.#particleGeometry.attributes.particleData.needsUpdate = true;

			this.#particleGeometry.setDrawRange( 0, particles.length );

		}

	}

}
