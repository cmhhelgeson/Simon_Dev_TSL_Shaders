import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { App } from '../../../utils/App';
import * as THREE from 'three';
import { MeshBasicNodeMaterial, PointsNodeMaterial, SpriteNodeMaterial } from 'three/webgpu';
import { attribute, float, Fn, fract, int, mix, sin, smoothstep, Switch, texture, time, vec3 } from 'three/tsl';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import Geometries from 'three/src/renderers/common/Geometries.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { createTextMesh } from '../utils/text-utils';


class GPGPUProject extends App {

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		await this.loadHDRBackground( './resources/moonless_golf_2k.hdr' );
		this.Camera.position.z = 4;
		await this.#setupGPUParticlesStatelessSphere();

	}

	async #setupGPUParticlesStatelessSphere() {

		const numParticles = 256 * 256;

		// Create first ampling mesh
		const geol = new THREE.SphereGeometry( 2, 32, 32 );
		const mat1 = new MeshBasicNodeMaterial();
		const mesh1 = new THREE.Mesh( geol, mat1 );

		const geo2 = new THREE.TorusKnotGeometry( 1, 0.3, 100, 16 );
		const mat2 = new MeshBasicNodeMaterial();
		const mesh2 = new THREE.Mesh( geo2, mat2 );

		const pumpkinGeos = [];

		const pumpkin = await this.loadGLTF( './resources/models/pumpkin.glb' );
		// Pumpkin is small and offset from origin, so we need to account for that
		pumpkin.children[ 0 ].position.set( 0, 0, 0 );
		pumpkin.children[ 0 ].scale.setScalar( 0.01 );
		pumpkin.children[ 0 ].traverse( ( child ) => {

			child.updateMatrixWorld();

			if ( child.isMesh ) {

				if ( child.geometry ) {

					const attribute = child.geometry.getAttribute( 'position' ).clone();
					const geometry = new THREE.BufferGeometry();
					geometry.setIndex( child.geometry.index );
					geometry.setAttribute( 'position', attribute );
					geometry.applyMatrix4( child.matrixWorld );
					pumpkinGeos.push( geometry );

				}

			}

		} );

		const combinedGeometry = BufferGeometryUtils.mergeGeometries( pumpkinGeos );
		const mat3 = new MeshBasicNodeMaterial();
		const combineMesh = new THREE.Mesh( combinedGeometry, mat3 );

		const font = await this.loadFont( './resources/fonts/optimer_bold.typeface.json' );

		const textMesh = createTextMesh( 'Hello World!', font );

		const meshes = [ mesh1, mesh2, combineMesh, textMesh ];
		const attributeNames = [ 'sphereSurfacePos', 'torusSurfacePos', 'pumpkinSurfacePos', 'textSurfacePos' ];

		const positionFn = Fn( () => {

			const spherePosition = attribute( attributeNames[ 0 ] );
			const torusPosition = attribute( attributeNames[ 1 ] );
			const pumpkinPosition = attribute( attributeNames[ 2 ] );
			const textPosition = attribute( attributeNames[ 3 ] );


			const scaledTime = time.div( 2 );

			// TODO: Likely only needs to be calculated once on CPU
			const blendIndex = scaledTime.modInt( 4 );

			const position = vec3( 0.0 );

			const timing = smoothstep( 0.1, 0.9, fract( scaledTime ) );


			Switch( blendIndex ).Case( int( 0 ), () => {

				position.assign( mix( spherePosition, torusPosition, timing ) );

			} ).Case( int( 1 ), () => {

				position.assign( mix( torusPosition, pumpkinPosition, timing ) );

			} ).Case( ( int( 2 ) ), () => {

				position.assign( mix( pumpkinPosition, textPosition, timing ) );

			} ).Case( ( int( 3 ) ), () => {

				position.assign( mix( textPosition, spherePosition, timing ) );

			} );

			return position;

		} );

		const diffuseTexture = await this.loadTexture( './resources/textures/circle.png' );

		const pointMaterial = new PointsNodeMaterial( {
			positionNode: positionFn(),
			sizeNode: float( 5.0 ),
			sizeAttenuation: true,
			colorNode: texture( diffuseTexture ),
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthWrite: false,
			depthTest: false,
		} );

		const particlesSprite = new THREE.Sprite( pointMaterial );
		particlesSprite.count = numParticles;

		const pt = new THREE.Vector3();

		for ( let i = 0; i < meshes.length; i ++ ) {

			const mesh = meshes[ i ];
			const attributeName = attributeNames[ i ];

			const sampler = new MeshSurfaceSampler( mesh ).build();

			const positions = new Float32Array( numParticles * 3 );

			for ( let i = 0; i < numParticles; i ++ ) {

				// Get sampled sphere into vec3
				sampler.sample( pt );
				positions[ i * 3 ] = pt.x;
				positions[ i * 3 + 1 ] = pt.y;
				positions[ i * 3 + 2 ] = pt.z;

				const posAttribute = new THREE.InstancedBufferAttribute( positions, 3 );
				particlesSprite.geometry.setAttribute( attributeName, posAttribute );

			}

		}

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
		projectName: 'GPGPU Particles Stateless',
		rendererType: 'WebGPU',
		initialCameraMode: 'perspective',
	} );

} );
