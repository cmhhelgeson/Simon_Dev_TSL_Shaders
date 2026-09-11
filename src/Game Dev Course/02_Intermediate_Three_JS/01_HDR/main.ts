import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { App } from "../../../utils/App";
import * as THREE from 'three'

interface HDRExampleSettings {
	textureColorSpace: THREE.ColorSpace

}
class HDRExample extends App {

	#settings: HDRExampleSettings = {
		textureColorSpace: THREE.SRGBColorSpace,
	}

  async onSetupProject(projectFolder?: GUI) {

		this.Camera.position.set( 2, 1, 2 );
		this.Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
		this.CameraControls.target.set( 0, 0, 0 );

		const midGreyTexture = await this.loadTexture('./resources/textures/mid-grey.png');

		const geo = new THREE.SphereGeometry(1, 32, 32);
		// Built via a factory: changing a texture colour space only takes effect
		// on a brand new material instance - see the GUI handler below.
		const createMaterial = () => new THREE.MeshStandardMaterial({
			// Unsure on the color conversion here
			// Simon says that the color is being treated as a linear color that gets converted to sRGB in the output
			// But colorManagement docs suggest that certain color types are treated as sRGB by default
			// https://threejs.org/manual/?q=color#en/color-management
			// color: new THREE.Color(0.5, 0.5, 0.5).convertSRGBToLinear()
			// per the docs, if we use hexadecimal, the .convertSRGBToLinear conversion isn't necessary.
			// So just be careful with what formats you use to provide color
			// color: new THREE.Color().setHex(0x7f7f7f)
			// RGB is supplied in Linear
			// Hex is supplied in SRGB
			map: midGreyTexture,
		});

		let cubeMaterial = createMaterial();
		const mesh = new THREE.Mesh(geo, cubeMaterial)
		this.Scene.add(mesh)

		// removing physically accurate lighting by multiplying by PI
		const light = new THREE.DirectionalLight(0xFFFFFF, 3.1415);
		light.position.set(5, 20, 5);
		light.target.position.set(0, 0, 0);
		this.Scene.add(light);

		const colorSpaceFolder = this.GUIManager.addFolder('Color Space');
		colorSpaceFolder.add(this.#settings, 'textureColorSpace', [
			THREE.SRGBColorSpace,
			THREE.LinearSRGBColorSpace,
			THREE.NoColorSpace
		]).onChange(() => {

			midGreyTexture.colorSpace = this.#settings.textureColorSpace;

			// A texture colour space is baked into the generated shader at build
			// time (TextureNode -> colorSpaceToWorking); it is not read per frame.
			// The render object cache key deliberately skips material.version and
			// texture.colorSpace, so material.needsUpdate alone lands in the
			// "same key" branch of RenderObjects and reuses the cached program.
			//
			// RenderObjects keys its cache on the material instance, so handing the
			// mesh a fresh material is what actually regenerates the shader.
			//
			// texture.needsUpdate is not needed: colour space only selects an sRGB
			// GPU format for compressed textures, and this is a plain PNG.
			cubeMaterial.dispose();
			cubeMaterial = createMaterial();
			mesh.material = cubeMaterial;

		})

  }
}


// While this will produce identical output to the code below, tidy code
// and encapsulation is the key to preventing sprawl.
const app = new HDRExample();
app.initialize( {
	projectName: 'HDR Example',
	debug: true
} );