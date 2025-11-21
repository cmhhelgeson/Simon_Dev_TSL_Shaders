export class GameManager {

	//Singleton instance
	static #instance: GameManager;

	// Private member variables
	#score = 0;

	constructor() {

		this.#score = 0;

	}

	test() {

		console.log( 'Hello' );

	}

	static Instance() {

		return GameManager.#instance;

	}

	// Only ever return the one static instance shared across
	// all instances of GameManager
	static Initialize() {

		if ( ! GameManager.#instance ) {

			GameManager.#instance = new GameManager();

		}


	}

}

GameManager.Initialize();
GameManager.Instance();
