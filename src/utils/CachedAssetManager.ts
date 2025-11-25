import * as THREE from 'three';
import { Renderer } from 'three/webgpu';
import { ManagedGroup } from './ManagedGroup';

interface CachedAssetStreamerOptions {
    renderer: THREE.WebGLRenderer | Renderer
    scene: THREE.Scene
    camera: THREE.Camera
}

class CachedAssetStreamer {

	#loaded: Record<string, THREE.Group | null> = {};
	#loading: Record<string, THREE.Group | null> = {};
	#compileOptions: CachedAssetStreamerOptions;

	constructor( options: CachedAssetStreamerOptions ) {

		this.#compileOptions = options;

	}

	dispose() {

		for ( const k in this.#loaded ) {

			this.#loaded[ k ]?.dispose();

		}

	}

	async loadAsync( url: string ) {

		// If asset is already loaded, then clone it
		if ( this.#loaded[ url ] ) {

			return this.#cloneObject( url );

		}

		if ( ! this.#loading[ url ] ) {

			this.#loading[ url ] = this.#loadGLTF( url );

			await this.#loading[ url ];

			this.#loading[ url ] = null;

			return this.#cloneObject( url );

		}

		await this.#loading[ url ];
		return this.#cloneObject( url );

	}

	async #warmAsset( model: THREE.Group ) {

		const { renderer, scene, camera } = this.#compileOptions;
		await renderer.compileAsync( model, camera, scene );

		const callback = ( c: THREE.Mesh | THREE.Object3D ) => {

			// Load each associated mesh of the initial GLTF
			if ( c instanceof THREE.Mesh ) {

				for ( const materialKey in c.material ) {

					const t = c.material[ materialKey ];

					// Pre-load each texture on the model
					if ( t instanceof THREE.Texture ) {

						renderer.initTexture( t );

					}


				}

			}

		};

		model.traverse( callback );

	}

	#cloneObject( url: string ) {

		const original = this.#loaded[ url ] as THREE.Group;
		const cloned = new ManagedGroup( true );
		cloned.add( original.children[ 0 ].clone() );
		return cloned;


	}

}
