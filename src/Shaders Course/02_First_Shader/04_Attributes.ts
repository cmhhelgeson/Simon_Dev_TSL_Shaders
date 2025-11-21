import * as THREE from 'three';
import { attribute, Fn } from 'three/tsl';
import { App } from '../../utils/App';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { MeshBasicNodeMaterial } from 'three/webgpu';

let renderer, camera, scene;

class Attributes extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const colors = [
			new THREE.Color( 0xFF0000 ),
			new THREE.Color( 0x00FF00 ),
			new THREE.Color( 0x0000FF ),
			new THREE.Color( 0x00FFFF ),
		];

		const colorFloats = colors.map( c => c.toArray() ).flat();

		geometry.setAttribute( 'vColor', new THREE.Float32BufferAttribute( colorFloats, 3 ) );

		const material = new MeshBasicNodeMaterial();

		// three/src/nodes/core/AttributeNode.js
		/*
    // If in the vertex stage, build the attribute.
    if ( builder.shaderStage === 'vertex' ) {

      return builder.format( nodeAttribute.name, attributeType, nodeType );

    // Else, if in the fragment stage, pass the attribute as a varying to
    // the fragment shader.
    } else {

      const nodeVarying = varying( this );

      return nodeVarying.build( builder, nodeType );

    }
  */

		material.colorNode = Fn( () => {

			return attribute( 'vColor' );

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

	}

}

const APP_ = new Attributes();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Attributes',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );



