class SoundSystem {

	playSound() {

		return 'Playing sound';

	}

}

class RenderSystem {

	renderGraphics() {

		return 'Rendering graphics';

	}

}

class PhysicsSystem {

	updatePhysics() {

		return 'Updating physics';

	}

}

class GameFacade {

	soundSystem: SoundSystem;
	renderSystem: RenderSystem;
	physicsSystem: PhysicsSystem;

	constructor() {

		this.soundSystem = new SoundSystem();
		this.renderSystem = new RenderSystem();
		this.physicsSystem = new PhysicsSystem();

	}

	play() {

		console.log( this.soundSystem.playSound() );
		console.log( this.renderSystem.renderGraphics() );
		console.log( this.physicsSystem.updatePhysics() );

	}

}


// Usage
const game = new GameFacade();
game.play();
// Output:
// Playing sound
// Rendering graphics
// Updating physics
