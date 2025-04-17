import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { App } from '../utils/App';

class GPGPUProject extends App {

	constructor() {

		super();

	}

	async onSetupProject( projectFolder?: GUI ): Promise<void> {

		await this.loadRGBE( './resources/moonless_golf_2k.hdr' );
		await this.#setupGPUParticlesStateless();

	}

	async #setupGPUParticlesStateless() {

	}

	onStep( dt: number, totalTimeElapsed: number ) {


	}

}

const APP_ = new GPGPUProject();
window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize();

} );
