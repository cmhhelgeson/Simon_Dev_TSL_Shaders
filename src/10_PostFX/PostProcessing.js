import { vec4, renderOutput } from 'three/tsl';
import { LinearSRGBColorSpace, NoToneMapping } from 'three';

import * as THREE from 'three';

// Customized version of THREE.PostProcessing allowing for multiple
// Postprocess passes across different areas of the image

let PostProcessInstance = 0;
class PostProcessing {

  constructor( renderer, outputNode = vec4( 0, 0, 1, 1 ) ) {

    this.renderer = renderer;
    this.outputNode = outputNode;
    this.outputColorTransform = true;
    this.needsUpdate = true;
    this._material = new THREE.NodeMaterial();
    this._quadMesh = new THREE.QuadMesh( this._material );
    this._material.name = `PostProcessing${PostProcessInstance}`;
    PostProcessInstance += 1;

  }

  render() {

    this._update();

    const renderer = this.renderer;

    const toneMapping = renderer.toneMapping;
    const outputColorSpace = renderer.outputColorSpace;

    renderer.toneMapping = NoToneMapping;
    renderer.outputColorSpace = LinearSRGBColorSpace;

    //

    this._quadMesh.render( renderer );

    //

    renderer.toneMapping = toneMapping;
    renderer.outputColorSpace = outputColorSpace;

  }

  _update() {

    if ( this.needsUpdate === true ) {

      const renderer = this.renderer;

      const toneMapping = renderer.toneMapping;
      const outputColorSpace = renderer.outputColorSpace;

      this._quadMesh.material.fragmentNode = this.outputColorTransform === true ? renderOutput( this.outputNode, toneMapping, outputColorSpace ) : this.outputNode.context( { toneMapping, outputColorSpace } );
      this._quadMesh.material.needsUpdate = true;

      this.needsUpdate = false;

    }

  }

  async renderAsync() {

    this._update();

    const renderer = this.renderer;

    const toneMapping = renderer.toneMapping;
    const outputColorSpace = renderer.outputColorSpace;

    renderer.toneMapping = NoToneMapping;
    renderer.outputColorSpace = LinearSRGBColorSpace;

    await this._quadMesh.renderAsync( renderer );

    renderer.toneMapping = toneMapping;
    renderer.outputColorSpace = outputColorSpace;

  }

}

export default PostProcessing;
