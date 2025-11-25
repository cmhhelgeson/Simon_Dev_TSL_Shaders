
interface PointerInterface {
    x: number
    y: number
    left: boolean
    right: boolean
}

class InputManager {

	#keys: Record<string, boolean> = {
		forward: false,
		backward: false,
		left: false,
		right: false,
		space: false,
	};

	#pointer: PointerInterface = {
		x: 0,
		y: 0,
		left: false,
		right: false,
	};

	#previousPointer: PointerInterface = {
		x: 0,
		y: 0,
		left: false,
		right: false,
	};

	#previousKeys: Record<string, boolean> = {
		forward: false,
		backward: false,
		left: false,
		right: false,
		space: false,
	};

	#mapping_: Record<number, string> = {
		87: 'forward',
		83: 'backward',
		65: 'left',
		68: 'right',
		38: 'forward',
		40: 'backward',
		37: 'left',
		39: 'right',
		32: 'space',
	};

	constructor() {
	}

	initialize() {

		window.addEventListener( 'keydown', ( e ) => {

			this.#onKeyDown( e );

		} );
		window.addEventListener( 'keyup', ( e ) => {

			this.#onKeyUp( e );

		} );
		window.addEventListener( 'pointermove', ( e ) => {

			this.#pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
			this.#pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

		} );
		window.addEventListener( 'pointerdown', ( e ) => {

			this.#onPointerDown( e );

		} );
		window.addEventListener( 'pointerup', ( e ) => {

			this.#onPointerUp( e );

		} );

	}

	step( timeElapsed: number ) {

		// Copy current state into previous state
		this.#previousKeys = { ...this.#keys };
		this.#previousPointer = { ...this.#pointer };

	}

	get Pointer() {

		return this.#pointer;

	}

	get PreviousPointer() {

		return this.#previousPointer;

	}

	get Actions() {

		return this.#keys;

	}

	get PreviousActions() {

		return this.#previousKeys;

	}

	#onPointer( e: MouseEvent, b: boolean ) {

		if ( e.button === 0 ) {

			this.#pointer.left = b;

		}

		if ( e.button === 2 ) {

			this.#pointer.right = b;

		}

	}

	#onPointerDown( e: MouseEvent ) {

		this.#onPointer( e, true );

	}

	#onPointerUp( e: MouseEvent ) {

		this.#onPointer( e, false );

	}

	#onKey( e: KeyboardEvent, b: boolean ) {

		const key = this.#mapping_[ e.keyCode ];
		if ( key ) {

			this.#keys[ key ] = b;

		}

	}

	#onKeyUp( e: KeyboardEvent ) {

		this.#onKey( e, false );

	}

	#onKeyDown( e: KeyboardEvent ) {

		this.#onKey( e, true );

	}

}

export { InputManager };
