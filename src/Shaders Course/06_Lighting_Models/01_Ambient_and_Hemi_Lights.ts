import * as THREE from 'three';
import {
	Fn,
	vec3,
	remap,
	mix,
	uniform,
	normalGeometry,
	normalize,
	color,
} from 'three/tsl';
import { App } from '../../utils/App';

import { MeshStandardNodeMaterial } from 'three/webgpu';
import { NodeMaterialNodeProperties } from 'three/src/materials/nodes/NodeMaterial.js';

type ShaderType = 'Basic Ambient' | 'Basic Normal' | 'Basic Hemi' | 'HemisphereLight';
class AmbientAndHemisphereLights extends App {

	async onSetupProject(): Promise<void> {

		this.Camera.position.z = 4;

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

		const effectController = {
			'Current Shader': 'Basic Ambient',
			// Material Properties
			objectColor: uniform( color( 1.0, 1.0, 1.0 ) ),
			// Hemi Lighting Shader
			skyColor: uniform( color( 0.0, 0.3, 0.6 ) ),
			groundColor: uniform( color( 0.6, 0.3, 0.1 ) )

		};

		const cubemap = new THREE.CubeTextureLoader().load( urls );
		this.Scene.background = cubemap;

		const suzanneMaterial = new MeshStandardNodeMaterial();

		const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1 );
		hemiLight.color.setHSL( 0.6, 1, 0.6 );
		hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
		hemiLight.position.set( 0, 20, 0 );
		this.Scene.add( hemiLight );

		const shaders: Record<ShaderType, NodeMaterialNodeProperties[ 'fragmentNode' ]> = {

			// Basic Ambient lighting
			'Basic Ambient': Fn( () => {

				const baseColor = effectController.objectColor;
				// Ambient Lighting
				const ambient = vec3( 0.5 );
				return baseColor.mul( ambient );


			} )(),

			// Return mesh normals
			'Basic Normal': Fn( () => {

				// Equivalent of normalize(vNormal);
				return normalize( normalGeometry );

			} )(),

			// Crudely emulate THREE.HemisphereLight.
			'Basic Hemi': Fn( () => {

				const { skyColor, groundColor, objectColor } = effectController;

				const ambient = vec3( 0.5 );
				const lighting = vec3( 0.0 ).toVar( 'lighting' );

				const hemiMix = remap( normalGeometry.y, - 1.0, 1.0, 0.0, 1.0 );
				const hemi = mix( groundColor, skyColor, hemiMix );

				lighting.assign( ambient.mul( 0.0 ).add( hemi ) );

				return objectColor.mul( lighting );

			} )(),

			// Actual Three.HemisphereLight implementation
			'HemisphereLight': null,

		};

		const defaultFragmentNode = suzanneMaterial.fragmentNode;
		suzanneMaterial.fragmentNode = shaders[ 'Basic Ambient' ];

		const suzanne = await this.loadGLTF( './resources/suzanne.glb' );
		suzanne.scene.traverse( c => {

			if ( c instanceof THREE.Mesh ) {

				c.material = suzanneMaterial;

			}

		} );

		this.Scene.add( suzanne.scene );


		this.CameraControls.enableZoom = false;
		this.CameraControls.enablePan = false;
		this.CameraControls.minPolarAngle = Math.PI / 4;
		this.CameraControls.maxPolarAngle = Math.PI / 1.5;


		const gui = this.Inspector.createParameters( 'Ambient and Hemi Lights' );
		gui.add( effectController, 'Current Shader', Object.keys( shaders ) ).onChange( () => {

			if ( effectController[ 'Current Shader' ] === 'HemisphereLight' ) {

				suzanneMaterial.fragmentNode = defaultFragmentNode;
				suzanneMaterial.needsUpdate = true;
				return;

			}

			suzanneMaterial.fragmentNode = shaders[ effectController[ 'Current Shader' ] as ShaderType ];
			suzanneMaterial.needsUpdate = true;

		} );

		// The Inspector edits the uniform's Color in place, so the callbacks only
		// need to mirror the change onto whatever else consumes it.
		gui.addColor( effectController.objectColor, 'value' )
			.name( 'objectColor' )
			.onChange( () => {

				/*suzanneMaterial.colorNode = Fn( () => {

					return effectController.objectColor;

				} )(); */
				suzanneMaterial.needsUpdate = true;

			} );


		gui.addColor( effectController.skyColor, 'value' )
			.name( 'skyColor' )
			.onChange( ( value ) => {

				hemiLight.color.copy( value );

			} );

		gui.addColor( effectController.groundColor, 'value' )
			.name( 'groundColor' )
			.onChange( ( value ) => {

				hemiLight.groundColor.copy( value );

			} );

	}

}

const APP_ = new AmbientAndHemisphereLights();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: true,
		withInspector: true,
		projectName: 'Ambient and Hemi Lights',
		rendererType: 'WebGPU',
		initialCameraMode: 'perspective',
	} );

} );
