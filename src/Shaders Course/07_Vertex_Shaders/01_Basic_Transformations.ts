import * as THREE from 'three';
import {
	Fn,
	vec3,
	remap,
	sin,
	time,
	positionLocal,
	rotate,
} from 'three/tsl';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MeshStandardNodeMaterial, Node } from 'three/webgpu';
import { App } from '../../utils/App';

type ShaderType =
  'Move Z' |
  'Stretch XZ' |
  'Rotate X' |
  'Rotate Y' |
  'Rotate Z' |
  'Rotate All'

interface EffectControllerType {
  'Current Shader': ShaderType,
}

class BasicTransformations extends App {

	async onSetupProject( ): Promise<void> {

		this.Camera.position.z = 4;

		const effectController: EffectControllerType = {
			'Current Shader': 'Move Z'
		};

		const shaders: Record<ShaderType, Node> = {
			'Move Z': Fn( () => {

				const position = positionLocal.toVar( 'newPosition' );
				position.z.addAssign( sin( time ) );

				return position;

			} )(),

			'Stretch XZ': Fn( () => {

				const newPosition = positionLocal.toVar( 'newPosition' );
				newPosition.xz.mulAssign( remap( sin( time ), - 1.0, 1.0, 0.5, 1.5 ) );

				return newPosition;


			} )(),

			'Rotate X': Fn( () => {

				const newPosition = positionLocal.toVar( 'newPosition' );
				newPosition.assign( rotate( newPosition, vec3( time, 0.0, 0.0 ) ) );

				return newPosition;


			} )(),

			'Rotate Y': Fn( () => {

				const newPosition = positionLocal.toVar( 'newPosition' );
				newPosition.assign( rotate( newPosition, vec3( 0.0, time, 0.0 ) ) );

				return newPosition;


			} )(),

			'Rotate Z': Fn( () => {

				const newPosition = positionLocal.toVar( 'newPosition' );
				newPosition.assign( rotate( newPosition, vec3( 0.0, 0.0, time ) ) );

				return newPosition;

			} )(),

			'Rotate All': Fn( () => {

				const newPosition = positionLocal.toVar( 'newPosition' );
				newPosition.assign( rotate( newPosition, time ) );

				return newPosition;

			} )(),


		};

		// Cubemap texture
		const path = './resources/Cold_Sunset/';
		const urls = [
			path + 'Cold_Sunset__Cam_2_Left+X.png',
			path + 'Cold_Sunset__Cam_3_Right-X.png',
			path + 'Cold_Sunset__Cam_4_Up+Y.png',
			path + 'Cold_Sunset__Cam_5_Down-Y.png',
			path + 'Cold_Sunset__Cam_0_Front+Z.png',
			path + 'Cold_Sunset__Cam_1_Back-Z.png',
		];

		const cubemap = new THREE.CubeTextureLoader().load( urls );
		this.Scene.background = cubemap;

		const loader = new GLTFLoader();
		const suzanneMaterial = new MeshStandardNodeMaterial();
		suzanneMaterial.positionNode = shaders[ 'Move Z' ];

		const light = new THREE.DirectionalLight( 0xffffff, 2 );
		const light2 = new THREE.DirectionalLight( 0xffffff, 1 );
		light.position.x = 2;
		light.position.z = 3;
		light2.position.x = - 2;
		light2.position.z = - 3;
		this.Scene.add( light );
		this.Scene.add( light2 );

		loader.load( './resources/suzanne.glb', ( gltf ) => {

			gltf.scene.traverse( c => {

				c.material = suzanneMaterial;

			} );

			this.Scene.add( gltf.scene );

		} );


		this.CameraControls.enableZoom = false;
		this.CameraControls.enablePan = false;
		this.CameraControls.minPolarAngle = Math.PI / 4;
		this.CameraControls.maxPolarAngle = Math.PI / 1.5;

		this.DebugGui.add( effectController, 'Current Shader', Object.keys( shaders ) ).onChange( () => {

			suzanneMaterial.positionNode = shaders[ effectController[ 'Current Shader' ] ];
			suzanneMaterial.needsUpdate = true;

		} );

	}

}

const app = new BasicTransformations();
app.initialize( {
	debug: true,
	projectName: 'Basic Transformations',
	rendererType: 'WebGPU',
	initialCameraMode: 'perspective',
} );
