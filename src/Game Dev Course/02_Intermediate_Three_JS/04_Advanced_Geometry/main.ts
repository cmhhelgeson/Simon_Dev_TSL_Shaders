import * as THREE from 'three';
import { App } from '../../../utils/App';
import { StorageBufferAttribute } from 'three/webgpu';
import { attribute, attributeArray, distance, Fn, instanceIndex, sin, smoothstep, storage, time, vec3 } from 'three/tsl';

const TERRAIN_RESOLUTION = 256;
const TERRAIN_SIZE = 250;

// A geometry already creates a position attribute

class AdvancedGeometry extends App {

	async onSetupProject() {

		this.toneMapping = THREE.ACESFilmicToneMapping;

		this.#setupTerrain( );
		this.#setupLighting();

	}

	modifyGeometryCPU( geometry: THREE.PlaneGeometry ) {

		// 1st Method: Smoothstep
		const positionAttribute = geometry.attributes.position;

		const pos = new THREE.Vector3();
		const zeroVector = new THREE.Vector3();

		for ( let i = 0; i < positionAttribute.count; i ++ ) {

			pos.fromBufferAttribute( positionAttribute, i );

			// Note that the CPU smoothstep needs to treat arguments differently than GPU
			pos.z = THREE.MathUtils.smoothstep(-pos.distanceTo(zeroVector), -100, 0) * 100;

			positionAttribute.setZ( i, pos.z );

		}

		geometry.computeVertexNormals();
		geometry.computeTangents();

		// Without this the GPU never sees the edited vertices.
		positionAttribute.needsUpdate = true;

	}

	modifyGeometryGPU(geometry: THREE.BufferGeometry) {

		const positionBaseAttribute = geometry.attributes.position;
		const positionStorageBufferAttribute = new StorageBufferAttribute(positionBaseAttribute.array, 3);
		// mesh.geometry.setAttribute('position', positionStorageBufferAttribute);

		const computeInit = Fn(() => {

			const positionStorage = storage(positionStorageBufferAttribute, 'vec3', positionStorageBufferAttribute.count);

			const currentPosition = positionStorage.element(instanceIndex);

			const steppedDistToCenter = smoothstep(100, 0, currentPosition.distance(vec3( 0,0, 0)))

			currentPosition.z.assign(
				steppedDistToCenter.mul(100)
			);//smoothstep(100, 0, currentPosition.distance(vec3(0))));

		})().compute(positionBaseAttribute.count);

		this.compute(computeInit).then(() => {
			geometry.setAttribute('position', positionStorageBufferAttribute);
			geometry.computeVertexNormals();
			geometry.computeTangents();
		})
	}

	#setupTerrain() {

		// Ground
		const groundGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE * 2, TERRAIN_SIZE * 2, TERRAIN_RESOLUTION, TERRAIN_RESOLUTION);
		//this.modifyGeometryCPU(groundGeometry)
		this.modifyGeometryGPU(groundGeometry);
		const groundMaterial = new THREE.MeshStandardMaterial( {
			color: 0x202020,
			metalness: 0.1,
			roughness: 0.6,
			wireframe: false
		} );

		const groundMesh = new THREE.Mesh( groundGeometry, groundMaterial );
		groundMesh.rotation.x = - Math.PI / 2;
		groundMesh.receiveShadow = true;

		//this.modifyGeometryGPU(groundMesh)
		//groundMesh.geometry.computeVertexNormals();
		//groundMesh.geometry.computeTangents();
		this.Scene.add( groundMesh );

		this.Camera.position.set(400, 200, 200);
		this.CameraControls.update();


    /* for (let i = 0; i < positions.count * 3; i += 3) {
      const pos = new THREE.Vector3().fromArray(positions.array, i);

      // pos.z = Math.random() * 10;
      // const distToCenter = pos.distanceTo(new THREE.Vector3());
      // pos.z = smoothstep(100, 0, distToCenter) * 100;

      // pos.z = Math.sin(pos.x * 0.05) * Math.sin(pos.y * 0.05) * 10;
      // pos.z = noise(pos.x * 0.01, pos.y * 0.01) * 10;

      const duneValue = (1 - Math.abs(noise(pos.x * 0.05, pos.y * 0.05))) * 0.1 - 0.5;
      const rollingHills = noise(pos.x * 0.01, pos.y * 0.01);
      const mixFactor = noise(pos.x * 0.005, pos.y * 0.005) * 0.5 + 0.5;

      // pos.z = FBM(noise, pos.x * 0.01, pos.y * 0.01, 5, 2.0, 0.5) * 10;
      // pos.z = duneValue * 10;
      pos.z = lerp(duneValue, rollingHills, THREE.MathUtils.smoothstep(0.25, 0.55, mixFactor)) * 20;

      // const ridged = RIDGED_FBM(noise, pos.x * 0.005, pos.y * 0.005, 5, 2.0, 0.5);
      // pos.z = ridged * 40;

      // Flatten edges
      const edgeValue = (
        smoothstep(SIZE - 18, SIZE - 20, Math.abs(pos.x)) *
        smoothstep(SIZE - 18, SIZE - 20, Math.abs(pos.y)));
      pos.z *= edgeValue;

      const dropoff = (Math.abs(pos.x) == SIZE || Math.abs(pos.y) == SIZE) ? 1 : 0;
      pos.z -= dropoff * 25;

      positions.array[i + 0] = pos.x;
      positions.array[i + 1] = pos.y;
      positions.array[i + 2] = pos.z;

      // Colors

      const col = new THREE.Color();

      const t = smoothstep(SAND_CUTOFF, SAND_CUTOFF + 5, pos.z);
      col.lerpColors(SAND, GREEN, t);
      col.lerpColors(BLACK, col, edgeValue);

      colors.push(col.r, col.g, col.b);
    } */

	}


	#setupLighting() {

		// Light
		const light = new THREE.DirectionalLight( 0xFFFFFF, 2.0 );
		light.position.set( 5, 20, 5 );
		light.lookAt( new THREE.Vector3() );
		light.castShadow = true;
		light.shadow.mapSize.setScalar( 1024 );
		light.shadow.camera.near = 1.0;
		light.shadow.camera.far = 100;
		light.shadow.camera.left = - 5;
		light.shadow.camera.right = 5;
		light.shadow.camera.top = 5;
		light.shadow.camera.bottom = - 5;
		light.shadow.bias = - 0.001;
		this.Scene.add( light );

		this.loadHDRBackground( './resources/skybox/autumn_field_puresky_2k.hdr' );

	}

}


const APP_ = new AdvancedGeometry();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: true,
		projectName: 'Advanced Geometry',
		rendererType: 'WebGPU',
		initialCameraMode: 'perspective',
	} );

} );
