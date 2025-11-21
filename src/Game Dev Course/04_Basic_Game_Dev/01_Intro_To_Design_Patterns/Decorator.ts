class GamePlayer {

	constructor() {}

	attack() {

		return 'Player attacks!';

	}

}

class PowerUpDecorator {

	player: GamePlayer;

	constructor( player: GamePlayer ) {

		this.player = player;

	}

	attack() {

		return this.player.attack();

	}

}

// This Decorator doesn't implement a constructor,
// but it does override the functionality of attack
class FirePowerUp extends PowerUpDecorator {

	attack() {

		return `${super.attack()} with fire!`;

	}

}

class IcePowerUp extends PowerUpDecorator {

	attack() {

		return `${super.attack()} with ice!`;

	}

}

let gamePlayer = new GamePlayer();

// Usage
console.log( gamePlayer.attack() );
// Output: Player attacks!

gamePlayer = new FirePowerUp( gamePlayer );
console.log( gamePlayer.attack() );
// Output: Player attacks! with fire!

gamePlayer = new IcePowerUp( gamePlayer );
console.log( gamePlayer.attack() );
// Output: Player attacks! with fire! with ice!

// Because you wrap the original object, then object identity can be strange
// How do you check if the character is the original character after it
// has been modified by a chain of decorators?
