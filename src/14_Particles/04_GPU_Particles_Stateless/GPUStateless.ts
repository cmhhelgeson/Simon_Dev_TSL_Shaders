import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { App } from '../../utils/App';
import * as THREE from 'three';
import { MeshBasicNodeMaterial, PointsNodeMaterial, SpriteNodeMaterial } from 'three/webgpu';
import { attribute, float, Fn, mix, sin, smoothstep, time, vec3 } from 'three/tsl';
import { MeshSurfaceSampler } from 'three/examples/jsm/Addons.js';


class GPGPUProject extends App {

	#shaders = {};

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		await this.loadRGBE( './resources/moonless_golf_2k.hdr' );
		this.Camera.position.z = 4;
		await this.#setupGPUParticlesStatelessSphere();

	}

	async #setupGPUParticlesStatelessSphere() {

		const numParticles = 10000;

		// Create first ampling mesh
		const geol = new THREE.SphereGeometry( 2, 32, 32 );
		const mat1 = new MeshBasicNodeMaterial();
		const mesh1 = new THREE.Mesh( geol, mat1 );

		const geo2 = new THREE.TorusKnotGeometry( 1, 0.3, 100, 16 );
		const mat2 = new MeshBasicNodeMaterial();
		const mesh2 = new THREE.Mesh( geo2, mat2 );

		// Sample from mesh
		const sphereSampler = new MeshSurfaceSampler( mesh1 ).build();
		const torusSampler = new MeshSurfaceSampler( mesh2 ).build();

		//Create point geometry
		const positions = new Float32Array( numParticles * 3 );
		const positions2 = new Float32Array( numParticles * 3 );
		const pt = new THREE.Vector3();

		for ( let i = 0; i < numParticles; i ++ ) {

			// Get sampled sphere into vec3
			sphereSampler.sample( pt );
			positions[ i * 3 ] = pt.x;
			positions[ i * 3 + 1 ] = pt.y;
			positions[ i * 3 + 2 ] = pt.z;

			torusSampler.sample( pt );
			positions2[ i * 3 ] = pt.x;
			positions2[ i * 3 + 1 ] = pt.y;
			positions2[ i * 3 + 2 ] = pt.z;


		}

		const positionAttributeSphere = new THREE.InstancedBufferAttribute( positions, 3 );
		const positionAttributeTorus = new THREE.InstancedBufferAttribute( positions2, 3 );

		const positionFn = Fn( () => {

			const spherePosition = attribute( 'sphereSurfacePosition' );
			const torusPosition = attribute( 'torusSurfacePosition' );

			return mix( spherePosition, torusPosition, smoothstep( 0, 1.0, sin( time ).add( 1 ).div( 2 ) ) );

		} );

		const pointMaterial = new PointsNodeMaterial( {
			positionNode: positionFn(),
			sizeNode: float( 5.0 ),
			sizeAttenuation: true,
		} );

		const particlesSprite = new THREE.Sprite( pointMaterial );
		particlesSprite.count = numParticles;


		particlesSprite.geometry.setAttribute( 'sphereSurfacePosition', positionAttributeSphere );
		particlesSprite.geometry.setAttribute( 'torusSurfacePosition', positionAttributeTorus );

		this.Scene.add( particlesSprite );

	}

	async #setupGPUParticlesStatelessDemo() {

		const numParticles = 1000;

		const positions = new Float32Array( 3 * numParticles );

		for ( let i = 0; i < numParticles; i ++ ) {

			positions[ i * 3 ] = i / 10;
			positions[ i * 3 + 1 ] = 0;
			positions[ i * 3 + 2 ] = 0;

		}

		const positionAttribute = new THREE.InstancedBufferAttribute( positions, 3 );

		const pointMaterial = new PointsNodeMaterial( {
			positionNode: attribute( 'instancePosition' ),
			sizeNode: float( 10.0 )
		} );

		const particlesSprite = new THREE.Sprite( pointMaterial );
		particlesSprite.count = numParticles;


		particlesSprite.geometry.setAttribute( 'instancePosition', positionAttribute );
		this.Scene.add( particlesSprite );

	}

	onStep( dt: number, totalTimeElapsed: number ) {


	}

}

const APP_ = new GPGPUProject();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: true,
		projectName: 'GPGPU Particles',
		rendererType: 'WebGPU',
		initialCameraMode: 'perspective',
	} );

} );
