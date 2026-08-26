import * as THREE from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

import { App } from '../../../utils/App';



class DepthTextureProject extends App {

	#renderTarget_ = null;
	#depthCopy_ = null;
	#depthCopyMaterial_ = null;
	#colourCopyMaterial_ = null;

	#transparentScene = null;

	#viewScene = null;
	#viewCamera_ = null;
	#viewQuad_ = null;

	constructor() {

		super();

	}

	async onSetupProject( pane ) {

		await this.loadHDRBackgroundS( './resources/skybox/rosendal_park_sunset_1k.hdr' );
		await this.#setupDepthStuff_();
		await this.#setupScene_();

	}

	async #setupDepthStuff_() {

		const renderTargetOptions = {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		};
		this.#renderTarget_ = new THREE.WebGLRenderTarget(
			window.innerWidth, window.innerHeight, renderTargetOptions );
		this.#renderTarget_.depthTexture = new THREE.DepthTexture(
			window.innerWidth, window.innerHeight );

		const depthOptions = {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.UnsignedByteType
		};
		this.#depthCopy_ = new THREE.WebGLRenderTarget(
			window.innerWidth, window.innerHeight, depthOptions );

		this.#depthCopyMaterial_ = await this.#loadShader_( 'depth-copy', {
			depthTexture: { value: null }
		} );
		this.#depthCopyMaterial_.depthTest = false;
		this.#depthCopyMaterial_.depthWrite = false;

		const quadGeo = new THREE.PlaneGeometry( 2, 2 );
		const quadMaterial = new THREE.MeshBasicMaterial( {
			depthTest: false,
			depthWrite: false,
		} );
		const quad = new THREE.Mesh( quadGeo, quadMaterial );

		this.#colourCopyMaterial_ = quadMaterial;
		this.#viewScene_ = new THREE.Scene();
		this.#viewCamera_ = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0.1, 1000 );
		this.#viewQuad_ = quad;

		this.#viewScene.add( quad );

		this.#transparentScene = new THREE.Scene();

	}

	async setupScene() {

		// Create a ground plane
		const planeGeometry = new THREE.PlaneGeometry( 10, 10 );
		const planeMaterial = new THREE.MeshStandardMaterial( {
			color: 0x808080,
			metalness: 0,
			roughness: 0.8
		} );
		const plane = new THREE.Mesh( planeGeometry, planeMaterial );

		plane.rotation.x = - Math.PI / 2;
		plane.receiveShadow = true;
		plane.castShadow = false;
		this.Scene.add( plane );

		// Create a cube wall
		const wallGeometry = new THREE.BoxGeometry( 10, 3, 1 );
		const wall = new THREE.Mesh( wallGeometry, planeMaterial );
		wall.position.set( 0, 1.5, - 5 );
		wall.receiveShadow = true;
		wall.castShadow = true;
		this.Scene.add( wall );

		// Create a cube in the middle
		const cubeGeometry = new THREE.BoxGeometry( 1, 1, 1 );
		const cube = new THREE.Mesh( cubeGeometry, planeMaterial );
		cube.position.set( 0, 0.5, 0 );
		cube.receiveShadow = true;
		cube.castShadow = true;
		this.Scene.add( cube );

		// Create a light
		const light = new THREE.DirectionalLight( 0xffffff, 1 );
		light.position.set( 2, 4, 1 );
		light.target.position.set( 0, 0, 0 );
		light.castShadow = true;
		this.Scene.add( light );
		this.Scene.add( light.target );

		// Create a forcefield thing
		const forceFieldMaterial = await this.#loadShader_( 'depth-test', {
			depthTexture: { value: this.#depthCopy_.texture },
			cameraNearFar: { value: new THREE.Vector2( this.Camera.near, this.Camera.far ) },
			resolution: { value: new THREE.Vector2( window.innerWidth, window.innerHeight ) },
			map: { value: await this.loadTexture( './resources/textures/circle.ktx2', true ) },
			time: { value: 0 }
		} );
		forceFieldMaterial.uniforms.map.value.wrapS = THREE.RepeatWrapping;
		forceFieldMaterial.uniforms.map.value.wrapT = THREE.RepeatWrapping;
		forceFieldMaterial.transparent = true;
		forceFieldMaterial.side = THREE.DoubleSide;
		forceFieldMaterial.depthTest = true;
		forceFieldMaterial.depthWrite = false;
		forceFieldMaterial.blending = THREE.AdditiveBlending;
		const forceField = new THREE.Mesh( cubeGeometry, forceFieldMaterial );
		forceField.scale.setScalar( 4 );

		this.#transparentScene.add( forceField );

		this.Camera.position.set( - 5, 5, 10 );

	}

	createComposer() {

		const options = {
			format: THREE.RGBAFormat,
			type: THREE.HalfFloatType,
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter
		};
		const rt = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, options );
		rt.depthTexture = new THREE.DepthTexture( window.innerWidth, window.innerHeight );

		const composer = new EffectComposer( this.Renderer, rt );
		return composer;

	}

	createMainRenderPass() {

		class MainRenderPass extends RenderPass {

			#app_ = null;

			constructor( scene, camera, app ) {

				super( scene, camera );
				this.#app_ = app;

			}

			render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

				this.#app_.renderMainPass( readBuffer );

			}

		}

		return new MainRenderPass( this., this.Camera, this );

	}

	renderMainPass( readBuffer ) {

		// Renders the scene and depth
		this.Renderer.setRenderTarget( readBuffer );
		this.Renderer.render( this.Scene, this.Camera );
		this.Renderer.setRenderTarget( null );

		// Copy the depth texture
		this.#depthCopyMaterial_.uniforms.depthTexture.value = readBuffer.depthTexture;
		this.#viewQuad_.material = this.#depthCopyMaterial_;
		this.#viewQuad_.position.set( 0, 0, - 1 );
		this.#viewQuad_.scale.setScalar( 1 );
		this.Renderer.setRenderTarget( this.#depthCopy_ );
		this.Renderer.render( this.#viewScene_, this.#viewCamera_ );
		this.Renderer.setRenderTarget( null );
		this.#viewQuad_.material = this.#colourCopyMaterial_;

		// Render the transparent scene
		this.Renderer.autoClear = false;
		this.Renderer.setRenderTarget( readBuffer );
		this.Renderer.render( this.#transparentScene_, this.Camera );
		this.Renderer.setRenderTarget( null );

		// Show the rendered colour and depth on the screen
		// this.#viewQuad_.material.map = this.#renderTarget_.texture;
		// this.#viewQuad_.position.set(0, 0, -1);
		// this.#viewQuad_.scale.setScalar(1);
		// this.Renderer.autoClear = false;
		// this.Renderer.render(this.#viewScene_, this.#viewCamera_);

		// this.#viewQuad_.material.map = this.#depthCopy_.texture;
		// this.#viewQuad_.position.set(0.375, -0.375, -1);
		// this.#viewQuad_.scale.setScalar(0.25);
		// this.Renderer.render(this.#viewScene_, this.#viewCamera_);

		this.Renderer.autoClear = true;

	}

	// onRender() {
	//   // Renders the scene and depth
	//   this.Renderer.setRenderTarget(this.#renderTarget_);
	//   this.Renderer.render(this.Scene, this.Camera);
	//   this.Renderer.setRenderTarget(null);

	//   // Copy the depth texture
	//   this.#depthCopyMaterial_.uniforms.depthTexture.value = this.#renderTarget_.depthTexture;
	//   this.#viewQuad_.material = this.#depthCopyMaterial_;
	//   this.#viewQuad_.position.set(0, 0, -1);
	//   this.#viewQuad_.scale.setScalar(1);
	//   this.Renderer.setRenderTarget(this.#depthCopy_);
	//   this.Renderer.render(this.#viewScene_, this.#viewCamera_);
	//   this.Renderer.setRenderTarget(null);
	//   this.#viewQuad_.material = this.#colourCopyMaterial_;

	//   // Render the transparent scene
	//   this.Renderer.autoClear = false;
	//   this.Renderer.setRenderTarget(this.#renderTarget_);
	//   this.Renderer.render(this.#transparentScene_, this.Camera);
	//   this.Renderer.setRenderTarget(null);

	//   // Show the rendered colour and depth on the screen
	//   this.#viewQuad_.material.map = this.#renderTarget_.texture;
	//   this.#viewQuad_.position.set(0, 0, -1);
	//   this.#viewQuad_.scale.setScalar(1);
	//   this.Renderer.autoClear = false;
	//   this.Renderer.render(this.#viewScene_, this.#viewCamera_);

	//   // this.#viewQuad_.material.map = this.#depthCopy_.texture;
	//   // this.#viewQuad_.position.set(0.375, -0.375, -1);
	//   // this.#viewQuad_.scale.setScalar(0.25);
	//   // this.Renderer.render(this.#viewScene_, this.#viewCamera_);

	//   this.Renderer.autoClear = true;
	// }

	onStep( timeElapsed, totalTime ) {

		this.#transparentScene.traverse( ( obj ) => {

			if ( obj.isMesh ) {

				if ( obj.material.uniforms ) {

					obj.material.uniforms.time.value = totalTime;

				}

			}

		} );

	}

}


const APP_ = new DepthTextureProject();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize();

} );
