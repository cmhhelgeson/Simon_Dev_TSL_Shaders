//import * as THREE from 'three';
import * as THREE from 'three/webgpu'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { WebGPURenderer } from 'three/webgpu';

class App {

  // Private references to values shared across all single scene Threejs applications
  #renderer_: WebGPURenderer //| THREE.WebGLRenderer
  #camera_: THREE.PerspectiveCamera;
  #scene_ : THREE.Scene;
  #clock_: THREE.Clock;
  #debugUI_: GUI;


  // Override these methods
  async onSetupProject( projectFolder?: GUI ) {
  }

  onRender() {
  }

  onStep( dt, totalTimeElapsed ) {
  }

  onResize() {
  }

  async #setupRenderer_() {

    this.#renderer_ = new THREE.WebGPURenderer( { antialias: true } );
    this.#renderer_.shadowMap.enabled = true;
    this.#renderer_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer_.toneMapping = THREE.ACESFilmicToneMapping;
    this.#renderer_.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( this.#renderer_.domElement );

    this.#debugUI_ = new GUI();

    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 2000;
    this.#camera_ = new THREE.PerspectiveCamera( fov, aspect, near, far );
    this.#camera_.position.set( 400, 200, 400 );
    this.#camera_.position.set( - 408.5944710487976, 259.17825010251136, - 354.7917599129882 );
    this.#camera_.lookAt( new THREE.Vector3( 0, 0, 0 ) );

    const controls = new OrbitControls( this.#camera_, this.#renderer_.domElement );
    controls.enableDamping = true;
    controls.target.set( 0, 0, 0 );
    controls.update();

    this.#scene_ = new THREE.Scene();
    this.#scene_.background = new THREE.Color( 0x000000 );

    // Scene tweaks
    this.#scene_.backgroundBlurriness = 0.0;
    this.#scene_.backgroundIntensity = 0.2;
    this.#scene_.environmentIntensity = 1.0;
    // Apply general parameters to the scene
    const sceneFolder = this.#debugUI_.addFolder( 'Scene' );
    sceneFolder.add( this.#scene_, 'backgroundBlurriness', 0.0, 1.0 );
    sceneFolder.add( this.#scene_, 'backgroundIntensity', 0.0, 1.0 );
    sceneFolder.add( this.#scene_, 'environmentIntensity', 0.0, 1.0 );

  }


  async #setupProject_() {

    await this.#setupRenderer_();

    // Initialize project
    const projectFolder = this.#debugUI_.addFolder( 'Project' );

    // Apply project specific parameters to the scene
    await this.onSetupProject( projectFolder );

  }


  #onWindowResize_() {

    // Intentionally ignoring DPR for now
    // const dpr = window.devicePixelRatio;
    const dpr = 1;

    const canvas = this.#renderer_.domElement;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const aspect = w / h;

    this.#renderer_.setSize( w, h, false );
    this.#camera_.aspect = aspect;
    this.#camera_.updateProjectionMatrix();

  }

  #raf_() {

    requestAnimationFrame( ( t ) => {

      // Calculate and compute
      this.#step_( this.#clock_.getDelta() );
      // Render
      this.#render_();
      // Call next animation frame
      this.#raf_();

    } );

  }

  #render_() {

    this.onRender();
    this.#renderer_.render( this.#scene_, this.#camera_ );

  }

  #step_( dt ) {

    this.onStep( dt, this.#clock_.getElapsedTime() );

  }

  loadRGBE( path ) {

    const rgbeLoader = new RGBELoader();
    rgbeLoader.load( path, ( hdrTexture ) => {

      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

      this.#scene_.background = hdrTexture;
      this.#scene_.environment = hdrTexture;

    } );

  }

  async initialize() {

    this.#clock_ = new THREE.Clock( true );

    // Setup event listeners before render loop
    window.addEventListener( 'resize', () => {

      this.#onWindowResize_();

    }, false );

    // Setup Project and call App specific onSetupProject
    await this.#setupProject_();

    // Resize window to meet current canvas dimensions
    this.#onWindowResize_();
    // Start render loop
    this.#raf_();

  }

  // Getters
  get Scene() {

    return this.#scene_;

  }

}


export { App };
