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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { App } from '../../utils/App';

import { MeshStandardNodeMaterial, Node } from 'three/webgpu';

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

		const shaders: Record<ShaderType, Node> = {

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
			'HemisphereLight': Fn( () => {} ),

		};

		const defaultFragmentNode = suzanneMaterial.fragmentNode;
		suzanneMaterial.fragmentNode = shaders[ 'Basic Ambient' ];

		const suzanne = await this.loadGLTF( './resources/models/pumpkin.glb' );

		this.Scene.add( suzanne );


		this.CameraControls.enableZoom = false;
		this.CameraControls.enableZoom = false;
		this.CameraControls.enablePan = false;
		this.CameraControls.minPolarAngle = Math.PI / 4;
		this.CameraControls.maxPolarAngle = Math.PI / 1.5;


		this.DebugGui.add( effectController, 'Current Shader', Object.keys( shaders ) ).onChange( () => {

			if ( effectController[ 'Current Shader' ] === 'HemisphereLight' ) {

				suzanneMaterial.fragmentNode = defaultFragmentNode;
				suzanneMaterial.needsUpdate = true;
				return;

			}

			suzanneMaterial.fragmentNode = shaders[ effectController[ 'Current Shader' ] ];
			suzanneMaterial.needsUpdate = true;

		} );

		this.DebugGui.addColor( { color: effectController.objectColor.value.getHex( THREE.SRGBColorSpace ) }, 'color' )
			.name( 'objectColor' )
			.onChange( function ( value ) {

				effectController.objectColor.value.set( value );
				/*suzanneMaterial.colorNode = Fn( () => {

					return effectController.objectColor;

				} )(); */
				suzanneMaterial.needsUpdate = true;

			} );


		this.DebugGui.addColor( { color: effectController.skyColor.value.getHex( THREE.SRGBColorSpace ) }, 'color' )
			.name( 'skyColor' )
			.onChange( function ( value ) {

				effectController.skyColor.value.set( value );
				hemiLight.color.setHex( value );

			} );

		this.DebugGui.addColor( { color: effectController.groundColor.value.getHex( THREE.SRGBColorSpace ) }, 'color' )
			.name( 'groundColor' )
			.onChange( function ( value ) {

				effectController.groundColor.value.set( value );
				hemiLight.groundColor.setHex( value );

			} );

	}

}

const APP_ = new AmbientAndHemisphereLights();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		debug: true,
		projectName: 'Ambient and Hemi Lights',
		rendererType: 'WebGPU',
		initialCameraMode: 'perspective',
	} );

} );
