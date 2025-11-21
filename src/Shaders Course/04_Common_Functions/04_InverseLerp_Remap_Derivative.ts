
import * as THREE from 'three';
import { Fn, texture, dFdx, dFdy, time, sin, mix } from 'three/tsl';
import { App } from '../../utils/App';
import { MeshBasicNodeMaterial } from 'three/webgpu';

// InverseLerp(currentValue, minValue, maxValue)
// Returns how far between minValue and maxValue the current value is
// Or the distance traveled to maxValue from minValue as a percentage.
// Could also be construed as a linear version of smooth step.

// inverseLerp( 0.0, 0.0, 100.0 ) -> 0.0
// inverseLerp( 25.0, 0.0, 100.0 ) -> 0.25
// inverseLerp( 100.0, 0.0, 100.0 ) -> 1.0
// inverseLerp( 4.0, 3.0, 6.0 ); -> 0.333...

// Remap(currentValue, inMin, inMax, outMin, outMax)
// Maps the percentage traveled along the range [inMin, inMax]
// to the percentage traveled along the range [outMin, outMax]
// Three.js natively implements this function within the 'RemapNode' class.

// remap(50.0, 0.0, 100.0, 5.0, 10.0) -> 7.5
// 50% into range [50, 100] is 50.0 -> 50% into range [5, 10] -> 7.5

// dFdx(x) dFdy(y)
// Get delta of current pixel value and value of the neighboring pixel.
//
// The GPU organizes fragment shaders into 2x2 blocks
// Example of a 2x2 block:
//
// +---+------+-------------
// | (x, y+1) | (x+1, y+1) |
// +---+------+------------+
// |  (x, y)  |  (x+1, y)  |
// +----------+------------+

// dFdx(value) = value(x+1) - value(x);
// dFdy(value) = value(y+1) - value(y);

class InverseLerpRemapDerivative extends App {

	async onSetupProject(): Promise<void> {

		const geometry = new THREE.PlaneGeometry( 2, 2 );

		const material = new MeshBasicNodeMaterial();
		const textureLoader = new THREE.TextureLoader();
		const map = textureLoader.load( './resources/uv_grid_opengl.jpg' );

		// Grid shaders succintly demonstrate the functionality of dFdx due to the harsh
		// changes between grid lines and the rest of the grid space.
		material.colorNode = Fn( () => {

			const color = texture( map );
			color.assign( mix( dFdx( color ), dFdy( color ), sin( time ) ) );

			return color;

		} )();

		const quad = new THREE.Mesh( geometry, material );
		this.Scene.add( quad );

	}

}

const APP_ = new InverseLerpRemapDerivative();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Chapter 4: InverseLerp, Remap, Derivative',
		debug: false,
		rendererType: 'WebGPU',
		initialCameraMode: 'orthographic'
	} );

} );
