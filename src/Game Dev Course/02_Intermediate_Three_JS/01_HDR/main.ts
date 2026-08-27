import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { App } from "../../../utils/App";
import * as THREE from 'three'
class HDRExample extends App {

  async onSetupProject(projectFolder?: GUI) {

		this.Camera.position.set( 2, 1, 2 );
		this.Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
		this.CameraControls.target.set( 0, 0, 0 );

		const cubeGeo = new THREE.BoxGeometry();
		const cubeMaterial = new THREE.MeshBasicMaterial({
			// Unsure on the color conversion here
			// Simon says that the color is being treated as a linear color that gets converted to sRGB in the output
			// But colorManagement docs suggest that certain color types are treated as sRGB by default
			// https://threejs.org/manual/?q=color#en/color-management
			// color: new THREE.Color(0.5, 0.5, 0.5).convertSRGBToLinear()
			// per the docs, if we use hexadecimal, the .convertSRGBToLinear conversion isn't necessary.
			// So just be careful with what formats you use to provide color
			color: new THREE.Color().setHex(0x7f7f7f)
		})
		const cubeMesh = new THREE.Mesh(cubeGeo, cubeMaterial)

		this.Scene.add(cubeMesh)

  }
}


// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new HDRExample();
app.initialize( {
	projectName: 'HDR Example',
	debug: true
} );