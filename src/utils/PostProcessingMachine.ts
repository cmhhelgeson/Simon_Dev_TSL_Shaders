import { PostProcessing, WebGPURenderer } from 'three/webgpu';

class WebGPUPostProcessingEngine {

	#renderer: WebGPURenderer;

	constructor( renderer: WebGPURenderer ) {

		this.#renderer = renderer;

	}

	createPostProcessingPipeline() {

		return new PostProcessing( this.#renderer );

	}

}

/* class WebGLPostProcessingEngine extends PostProcessingEngine<WebGLRenderer> {

	constructor( renderer: WebGLRenderer ) {

		super( renderer );

	}

	assignOutput() {


	}

	createPostProcessingPipeline() {

		return new EffectComposer( this.renderer );

	}

} */

export class PostProcessingMachine {

	engine: WebGPUPostProcessingEngine;

	constructor( renderer: WebGPURenderer ) {

		this.engine = new WebGPUPostProcessingEngine( renderer );

	}

	createPostProcessingPipeline() {

		return this.engine.createPostProcessingPipeline();

	}

}


