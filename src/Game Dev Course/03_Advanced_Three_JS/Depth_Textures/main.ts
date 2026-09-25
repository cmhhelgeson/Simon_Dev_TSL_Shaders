import * as THREE from 'three/webgpu';
import {
	Fn,
	If,
	Discard,
	pass,
	texture,
	uv,
	vec3,
	vec4,
	mix,
	time,
	screenUV,
	positionView,
	positionWorld,
	cameraNear,
	cameraFar,
	perspectiveDepthToViewZ,
	mx_noise_float,
} from 'three/tsl';

import { App } from '../../../utils/App';

// ============================================================================
// WebGPU / RenderPipeline port
// ============================================================================
//
// Frame structure (same steps as the WebGL MainRenderPass, expressed as nodes):
//
//   1. opaquePass       -> renders this.Scene into a RT that owns a depth texture
//   2. (no depth copy)  -> the force field samples opaquePass's depth directly
//   3. transparentPass  -> renders the transparent scene into its own RT
//   4. pipeline output  -> opaque colour + transparent colour (additive)

class DepthTextureProject extends App {

	#transparentScene = new THREE.Scene();

	async onSetupProject(): Promise<void> {

		// DIFFERENT: rosendal_park_sunset_1k.hdr isn't in /resources, so this uses the skybox that is.
		await this.loadHDRBackground( './resources/skybox/autumn_field_puresky_2k.hdr' );
		await this.#setupScene();

		const circleMap = await this.loadTexture( './resources/textures/circle.ktx2' );
		circleMap.wrapS = THREE.RepeatWrapping;
		circleMap.wrapT = THREE.RepeatWrapping;

		this.#setupRenderPipeline( circleMap );

	}

	async #setupScene() {

		// Unchanged: the WebGPURenderer converts built-in materials to node materials.
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

		const wallGeometry = new THREE.BoxGeometry( 10, 3, 1 );
		const wall = new THREE.Mesh( wallGeometry, planeMaterial );
		wall.position.set( 0, 1.5, - 5 );
		wall.receiveShadow = true;
		wall.castShadow = true;
		this.Scene.add( wall );

		const cubeGeometry = new THREE.BoxGeometry( 1, 1, 1 );
		const cube = new THREE.Mesh( cubeGeometry, planeMaterial );
		cube.position.set( 0, 0.5, 0 );
		cube.receiveShadow = true;
		cube.castShadow = true;
		this.Scene.add( cube );

		const light = new THREE.DirectionalLight( 0xffffff, 1 );
		light.position.set( 2, 4, 1 );
		light.target.position.set( 0, 0, 0 );
		light.castShadow = true;
		this.Scene.add( light );
		this.Scene.add( light.target );

		this.Camera.position.set( - 5, 5, 10 );

	}

	#setupRenderPipeline( map: THREE.Texture ) {

		// ------------------------------------------------------------------
		// DIFFERENT: replaces #renderTarget_ + its DepthTexture, and the
		// EffectComposer render target from createComposer().
		// A PassNode creates its own HalfFloat colour target and a DepthTexture,
		// and resizes both with the canvas (the WebGL version hard-coded
		// window.innerWidth/innerHeight and never resized them).
		// ------------------------------------------------------------------
		const opaquePass = pass( this.Scene, this.Camera );

		// ------------------------------------------------------------------
		// DIFFERENT: replaces #depthCopy_, #depthCopyMaterial_ ('depth-copy'
		// shader) and the #viewScene_/#viewQuad_/#viewCamera_ used to run it.
		// WebGL needed that copy for two reasons:
		//   a) the transparent pass rendered into the same RT whose depth
		//      texture it wanted to read (a read/write feedback loop), and
		//   b) the copy target was RGBA8, so depth was packed with
		//      packDepthToRGBA and unpacked with unpackRGBAToDepth.
		// Here the transparent scene renders into a *different* PassNode, so
		// the opaque depth texture can be sampled directly as a float.
		// ------------------------------------------------------------------
		const opaqueDepth = opaquePass.getTextureNode( 'depth' );

		const circleMap = texture( map );

		const forceFieldColour = Fn( () => {

			// DIFFERENT: `gl_FragCoord.xy / resolution.xy` -> screenUV, so the
			// `resolution` uniform (never updated on resize in WebGL) is gone.
			// Pass textures default to the mesh's uv(), so sample at screenUV explicitly.
			const depthSample = opaqueDepth.sample( screenUV );

			// DIFFERENT: the `cameraNearFar` uniform -> built-in cameraNear/cameraFar.
			const depth = perspectiveDepthToViewZ( depthSample, cameraNear, cameraFar );

			// DIFFERENT: perspectiveDepthToViewZ(gl_FragCoord.z, ...) -> positionView.z,
			// the fragment's view-space Z, which is what that call reconstructed.
			const viewZ = positionView.z;

			const distToBackground = viewZ.sub( depth );

			// DIFFERENT: WebGL rendered into the opaque RT with depthTest = true, so
			// the hardware hid any force field fragment behind the ground/wall.
			// This pass has its own depth buffer, so do that test by hand.
			If( distToBackground.lessThan( 0.0 ), () => {

				Discard();

			} );

			// DIFFERENT: the vUv / vPositionWorld varyings -> uv() / positionWorld.
			const mapSample = circleMap.sample( uv().mul( 50.0 ) );

			const alpha = positionWorld.y.remapClamp( 2.0, 0.0, 0.0, 1.0 ).pow( 2.0 );

			const glow = distToBackground.remapClamp( 1.0, 0.0, 0.0, 1.0 ).pow( 8.0 ).mul( 50.0 );

			// DIFFERENT: noise13 (GLSL helper) -> mx_noise_float; both return roughly -1..1.
			// DIFFERENT: the `time` uniform (set every frame in onStep) -> built-in `time`.
			const noiseSample = mx_noise_float( positionWorld.mul( 2.0 ).add( vec3( 0.0, time.mul( 8.0 ), 0.0 ) ) )
				.mul( 0.5 ).add( 0.5 );

			const BLUE = vec3( 0.0, 0.0, 1.0 );
			const ORANGE = vec3( 1.0, 0.5, 0.0 );
			const tintColour = mix( BLUE, ORANGE, alpha ).mul( 5.0 );

			const shieldColour = mapSample.xyz.mul( tintColour ).mul( alpha );
			const glowColour = ORANGE.mul( alpha.add( glow ) );
			const finalColour = glowColour.add( shieldColour.mul( noiseSample ) );

			return vec4( finalColour, 1.0 );

		} );

		// DIFFERENT: ShaderMaterial loaded from 'depth-test' GLSL files -> a node material.
		const forceFieldMaterial = new THREE.MeshBasicNodeMaterial();
		forceFieldMaterial.colorNode = forceFieldColour();
		forceFieldMaterial.transparent = true;
		forceFieldMaterial.side = THREE.DoubleSide;
		forceFieldMaterial.depthTest = true;
		forceFieldMaterial.depthWrite = false;
		forceFieldMaterial.blending = THREE.AdditiveBlending;

		const forceField = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), forceFieldMaterial );
		forceField.scale.setScalar( 4 );
		this.#transparentScene.add( forceField );

		// ------------------------------------------------------------------
		// DIFFERENT: replaces "Render the transparent scene" in renderMainPass
		// (autoClear = false, render #transparentScene_ into readBuffer).
		// The transparent scene gets its own pass, cleared to black, and is
		// added on top of the opaque colour below, which is the same maths as
		// AdditiveBlending onto the opaque buffer.
		// ------------------------------------------------------------------
		const transparentPass = pass( this.#transparentScene, this.Camera );

		// ------------------------------------------------------------------
		// DIFFERENT: replaces createComposer() / createMainRenderPass() /
		// MainRenderPass. The RenderPipeline's outputNode describes the whole
		// frame. opaquePass is listed first so it renders before
		// transparentPass reads its depth.
		// ------------------------------------------------------------------
		const pipeline = this.createPostProcessingPipeline( 'depthTextures' );
		pipeline.outputNode = vec4( opaquePass.rgb.add( transparentPass.rgb ), 1.0 );

		// DIFFERENT: replaces the per-frame setRenderTarget/render/autoClear calls.
		this.changeRenderHandler( () => {

			pipeline.render();

		} );

	}

	// DIFFERENT: onStep no longer traverses the transparent scene to update
	// uniforms.time; the TSL `time` node updates itself every frame.

}

const APP_ = new DepthTextureProject();

window.addEventListener( 'DOMContentLoaded', async () => {

	await APP_.initialize( {
		projectName: 'Depth Textures',
		debug: false,
		withInspector: true,
		rendererType: 'WebGPU',
		initialCameraMode: 'perspective',
	} );

} );

// ============================================================================
// Original WebGL / EffectComposer implementation
// ============================================================================
//
// import * as THREE from 'three';
//
// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
//
// import { App } from '../../../utils/App';
//
// class DepthTextureProject extends App {
//
// 	#renderTarget_ = null;
// 	#depthCopy_ = null;
// 	#depthCopyMaterial_ = null;
// 	#colourCopyMaterial_ = null;
//
// 	#transparentScene = null;
//
// 	#viewScene = null;
// 	#viewCamera_ = null;
// 	#viewQuad_ = null;
//
// 	constructor() {
//
// 		super();
//
// 	}
//
// 	async onSetupProject( pane ) {
//
// 		await this.loadHDRBackground( './resources/skybox/rosendal_park_sunset_1k.hdr' );
// 		await this.#setupDepthStuff_();
// 		await this.#setupScene_();
//
// 	}
//
// 	async #setupDepthStuff_() {
//
// 		const renderTargetOptions = {
// 			minFilter: THREE.NearestFilter,
// 			magFilter: THREE.NearestFilter,
// 			format: THREE.RGBAFormat,
// 			type: THREE.FloatType
// 		};
// 		this.#renderTarget_ = new THREE.WebGLRenderTarget(
// 			window.innerWidth, window.innerHeight, renderTargetOptions );
// 		this.#renderTarget_.depthTexture = new THREE.DepthTexture(
// 			window.innerWidth, window.innerHeight );
//
// 		const depthOptions = {
// 			minFilter: THREE.NearestFilter,
// 			magFilter: THREE.NearestFilter,
// 			format: THREE.RGBAFormat,
// 			type: THREE.UnsignedByteType
// 		};
// 		this.#depthCopy_ = new THREE.WebGLRenderTarget(
// 			window.innerWidth, window.innerHeight, depthOptions );
//
// 		this.#depthCopyMaterial_ = await this.#loadShader_( 'depth-copy', {
// 			depthTexture: { value: null }
// 		} );
// 		this.#depthCopyMaterial_.depthTest = false;
// 		this.#depthCopyMaterial_.depthWrite = false;
//
// 		const quadGeo = new THREE.PlaneGeometry( 2, 2 );
// 		const quadMaterial = new THREE.MeshBasicMaterial( {
// 			depthTest: false,
// 			depthWrite: false,
// 		} );
// 		const quad = new THREE.Mesh( quadGeo, quadMaterial );
//
// 		this.#colourCopyMaterial_ = quadMaterial;
// 		this.#viewScene_ = new THREE.Scene();
// 		this.#viewCamera_ = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0.1, 1000 );
// 		this.#viewQuad_ = quad;
//
// 		this.#viewScene.add( quad );
//
// 		this.#transparentScene = new THREE.Scene();
//
// 	}
//
// 	async setupScene() {
//
// 		// Create a ground plane
// 		const planeGeometry = new THREE.PlaneGeometry( 10, 10 );
// 		const planeMaterial = new THREE.MeshStandardMaterial( {
// 			color: 0x808080,
// 			metalness: 0,
// 			roughness: 0.8
// 		} );
// 		const plane = new THREE.Mesh( planeGeometry, planeMaterial );
//
// 		plane.rotation.x = - Math.PI / 2;
// 		plane.receiveShadow = true;
// 		plane.castShadow = false;
// 		this.Scene.add( plane );
//
// 		// Create a cube wall
// 		const wallGeometry = new THREE.BoxGeometry( 10, 3, 1 );
// 		const wall = new THREE.Mesh( wallGeometry, planeMaterial );
// 		wall.position.set( 0, 1.5, - 5 );
// 		wall.receiveShadow = true;
// 		wall.castShadow = true;
// 		this.Scene.add( wall );
//
// 		// Create a cube in the middle
// 		const cubeGeometry = new THREE.BoxGeometry( 1, 1, 1 );
// 		const cube = new THREE.Mesh( cubeGeometry, planeMaterial );
// 		cube.position.set( 0, 0.5, 0 );
// 		cube.receiveShadow = true;
// 		cube.castShadow = true;
// 		this.Scene.add( cube );
//
// 		// Create a light
// 		const light = new THREE.DirectionalLight( 0xffffff, 1 );
// 		light.position.set( 2, 4, 1 );
// 		light.target.position.set( 0, 0, 0 );
// 		light.castShadow = true;
// 		this.Scene.add( light );
// 		this.Scene.add( light.target );
//
// 		// Create a forcefield thing
// 		const forceFieldMaterial = await this.#loadShader_( 'depth-test', {
// 			depthTexture: { value: this.#depthCopy_.texture },
// 			cameraNearFar: { value: new THREE.Vector2( this.Camera.near, this.Camera.far ) },
// 			resolution: { value: new THREE.Vector2( window.innerWidth, window.innerHeight ) },
// 			map: { value: await this.loadTexture( './resources/textures/circle.ktx2', true ) },
// 			time: { value: 0 }
// 		} );
// 		forceFieldMaterial.uniforms.map.value.wrapS = THREE.RepeatWrapping;
// 		forceFieldMaterial.uniforms.map.value.wrapT = THREE.RepeatWrapping;
// 		forceFieldMaterial.transparent = true;
// 		forceFieldMaterial.side = THREE.DoubleSide;
// 		forceFieldMaterial.depthTest = true;
// 		forceFieldMaterial.depthWrite = false;
// 		forceFieldMaterial.blending = THREE.AdditiveBlending;
// 		const forceField = new THREE.Mesh( cubeGeometry, forceFieldMaterial );
// 		forceField.scale.setScalar( 4 );
//
// 		this.#transparentScene.add( forceField );
//
// 		this.Camera.position.set( - 5, 5, 10 );
//
// 	}
//
// 	createComposer() {
//
// 		const options = {
// 			format: THREE.RGBAFormat,
// 			type: THREE.HalfFloatType,
// 			minFilter: THREE.NearestFilter,
// 			magFilter: THREE.NearestFilter
// 		};
// 		const rt = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, options );
// 		rt.depthTexture = new THREE.DepthTexture( window.innerWidth, window.innerHeight );
//
// 		const composer = new EffectComposer( this.Renderer, rt );
// 		return composer;
//
// 	}
//
// 	createMainRenderPass() {
//
// 		class MainRenderPass extends RenderPass {
//
// 			#app_ = null;
//
// 			constructor( scene, camera, app ) {
//
// 				super( scene, camera );
// 				this.#app_ = app;
//
// 			}
//
// 			render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {
//
// 				this.#app_.renderMainPass( readBuffer );
//
// 			}
//
// 		}
//
// 		return new MainRenderPass( this., this.Camera, this );
//
// 	}
//
// 	renderMainPass( readBuffer ) {
//
// 		// Renders the scene and depth
// 		this.Renderer.setRenderTarget( readBuffer );
// 		this.Renderer.render( this.Scene, this.Camera );
// 		this.Renderer.setRenderTarget( null );
//
// 		// Copy the depth texture
// 		this.#depthCopyMaterial_.uniforms.depthTexture.value = readBuffer.depthTexture;
// 		this.#viewQuad_.material = this.#depthCopyMaterial_;
// 		this.#viewQuad_.position.set( 0, 0, - 1 );
// 		this.#viewQuad_.scale.setScalar( 1 );
// 		this.Renderer.setRenderTarget( this.#depthCopy_ );
// 		this.Renderer.render( this.#viewScene_, this.#viewCamera_ );
// 		this.Renderer.setRenderTarget( null );
// 		this.#viewQuad_.material = this.#colourCopyMaterial_;
//
// 		// Render the transparent scene
// 		this.Renderer.autoClear = false;
// 		this.Renderer.setRenderTarget( readBuffer );
// 		this.Renderer.render( this.#transparentScene_, this.Camera );
// 		this.Renderer.setRenderTarget( null );
//
// 		// Show the rendered colour and depth on the screen
// 		// this.#viewQuad_.material.map = this.#renderTarget_.texture;
// 		// this.#viewQuad_.position.set(0, 0, -1);
// 		// this.#viewQuad_.scale.setScalar(1);
// 		// this.Renderer.autoClear = false;
// 		// this.Renderer.render(this.#viewScene_, this.#viewCamera_);
//
// 		// this.#viewQuad_.material.map = this.#depthCopy_.texture;
// 		// this.#viewQuad_.position.set(0.375, -0.375, -1);
// 		// this.#viewQuad_.scale.setScalar(0.25);
// 		// this.Renderer.render(this.#viewScene_, this.#viewCamera_);
//
// 		this.Renderer.autoClear = true;
//
// 	}
//
// 	// onRender() {
// 	//   // Renders the scene and depth
// 	//   this.Renderer.setRenderTarget(this.#renderTarget_);
// 	//   this.Renderer.render(this.Scene, this.Camera);
// 	//   this.Renderer.setRenderTarget(null);
//
// 	//   // Copy the depth texture
// 	//   this.#depthCopyMaterial_.uniforms.depthTexture.value = this.#renderTarget_.depthTexture;
// 	//   this.#viewQuad_.material = this.#depthCopyMaterial_;
// 	//   this.#viewQuad_.position.set(0, 0, -1);
// 	//   this.#viewQuad_.scale.setScalar(1);
// 	//   this.Renderer.setRenderTarget(this.#depthCopy_);
// 	//   this.Renderer.render(this.#viewScene_, this.#viewCamera_);
// 	//   this.Renderer.setRenderTarget(null);
// 	//   this.#viewQuad_.material = this.#colourCopyMaterial_;
//
// 	//   // Render the transparent scene
// 	//   this.Renderer.autoClear = false;
// 	//   this.Renderer.setRenderTarget(this.#renderTarget_);
// 	//   this.Renderer.render(this.#transparentScene_, this.Camera);
// 	//   this.Renderer.setRenderTarget(null);
//
// 	//   // Show the rendered colour and depth on the screen
// 	//   this.#viewQuad_.material.map = this.#renderTarget_.texture;
// 	//   this.#viewQuad_.position.set(0, 0, -1);
// 	//   this.#viewQuad_.scale.setScalar(1);
// 	//   this.Renderer.autoClear = false;
// 	//   this.Renderer.render(this.#viewScene_, this.#viewCamera_);
//
// 	//   // this.#viewQuad_.material.map = this.#depthCopy_.texture;
// 	//   // this.#viewQuad_.position.set(0.375, -0.375, -1);
// 	//   // this.#viewQuad_.scale.setScalar(0.25);
// 	//   // this.Renderer.render(this.#viewScene_, this.#viewCamera_);
//
// 	//   this.Renderer.autoClear = true;
// 	// }
//
// 	onStep( timeElapsed, totalTime ) {
//
// 		this.#transparentScene.traverse( ( obj ) => {
//
// 			if ( obj.isMesh ) {
//
// 				if ( obj.material.uniforms ) {
//
// 					obj.material.uniforms.time.value = totalTime;
//
// 				}
//
// 			}
//
// 		} );
//
// 	}
//
// }
//
//
// const APP_ = new DepthTextureProject();
//
// window.addEventListener( 'DOMContentLoaded', async () => {
//
// 	await APP_.initialize();
//
// } );
