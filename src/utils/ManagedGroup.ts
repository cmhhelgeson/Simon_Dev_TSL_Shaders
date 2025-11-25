import * as THREE from 'three';

class ManagedGroup extends THREE.Group {

	#disposeMaterials: boolean = true;
	#disposeTextures: boolean = true;
	#disposeGeometries: boolean = true;

	constructor( shallow: boolean ) {

		super();

		if ( shallow ) {

			this.#disposeMaterials = true;
			this.#disposeTextures = false;
			this.#disposeGeometries = false;

		}

	}

	get IsManagedGroup() {

		return true;

	}

	dispose() {

		for ( let i = 0; i < this.children.length; i ++ ) {

			const child = this.children[ i ];

			if ( child instanceof ManagedGroup ) {

				child.dispose();

			} else {

				this.#disposeChild_( child );

			}

		}

	}

	#disposeChild_( node: THREE.Object3D ) {

		node.traverse( ( c ) => {

			if ( c instanceof THREE.Mesh ) {

				for ( const k in c.material ) {

					if ( this.#disposeTextures ) {

						if ( c.material[ k ] instanceof THREE.Texture ) {

							const tex = c.material[ k ];

							if ( tex.source.data instanceof ImageBitmap ) {

								tex.source.data.close();

							}

							tex.dispose();

						}

					}

				}

				if ( this.#disposeGeometries ) {

					c.geometry.dispose();

				}

				if ( this.#disposeMaterials ) {

					c.material.dispose();

				}

			}

		} );

	}

}

export { ManagedGroup };
