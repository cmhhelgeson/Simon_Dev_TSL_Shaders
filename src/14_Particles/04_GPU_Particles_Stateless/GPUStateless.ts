import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { App } from '../utils/App';
import * as THREE from 'three';
import { NodeMaterial, MeshBasicNodeMaterial } from 'three/webgpu';
import { attribute, cameraProjectionMatrix, Fn, instancedBufferAttribute, modelViewMatrix, modelViewProjection, positionGeometry, positionLocal, positionView, vec2, vec3, vec4, viewport } from 'three/tsl';

class GPGPUProject extends App {

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		await this.loadRGBE( './resources/moonless_golf_2k.hdr' );
		await this.#setupGPUParticlesStateless();

	}

	async #setupGPUParticlesStateless() {

		const pointGeo = new THREE.BufferGeometry();

		// No equivalent to GL_PointSize in WebGPU, so we copy the THREE.Sprite's
		// BufferGeometry and use Sprites as equivalent to points.
		const positions = new Float32Array( [
			- 0.5, - 0.5, 0,
			0.5, - 0.5, 0,
			0.5, 0.5, 0,
			- 0.5, 0.5, 0,
		] );

		const sizes = new Float32Array( [
			10.0
		] );

		pointGeo.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
		pointGeo.setAttribute( 'size', new THREE.InstancedBufferAttribute( sizes, 1 ) );

		const vertexNodeCallback = () => {

			// Copied from PointsNodeMaterial
			const mvp = modelViewProjection;
			const size = instancedBufferAttribute( new THREE.InstancedBufferAttribute( sizes, 1 ) );

			const alignedPosition = positionGeometry.xy.toVar();
			const aspect = viewport.z.div( viewport.w );

			// point size

			const pointSize = vec2( size );

			// scale

			alignedPosition.mulAssign( pointSize.mul( 2 ) );

			alignedPosition.assign( alignedPosition.div( viewport.z ) );
			alignedPosition.y.assign( alignedPosition.y.mul( aspect ) );

			// back to clip space
			alignedPosition.assign( alignedPosition.mul( mvp.w ) );

			//clipPos.xy += offset;
			mvp.addAssign( vec4( alignedPosition, 0, 0 ) );

			return mvp;

		};

		const material = new MeshBasicNodeMaterial( {
			vertexNode: Fn( vertexNodeCallback )(),
			colorNode: vec3( 1.0, 0.0, 0.0 )
		} );

		const mesh = new THREE.Mesh( new THREE.PlaneGeometry(), material );

		this.Scene.add( mesh );

	}

	onStep( dt: number, totalTimeElapsed: number ) {


	}

}

const APP_ = new GPGPUProject();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize();

} );
