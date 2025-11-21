class Monster {

	attack() {}

}

class Goblin extends Monster {

	attack() {

		return 'Goblin attacks!';

	}

}

class Troll extends Monster {

	attack() {

		return 'Troll attacks';

	}

}


// Simplifies code. Someone asking for enemies doesn't need to know
// how to initialize 100s of enemies. They just ask the enemy factory
// to automatically initialize one of type x for them.
class EnemyFactory {

	static createEnemy( type ) {

		switch ( type ) {

			case 'goblin': {

				return new Goblin();

			}

			case 'troll': {

				return new Troll();

			}

			default: {

				throw new Error( 'Unknown enemy type' );

			}

		}

	}

}

const enemy = EnemyFactory.createEnemy( 'goblin' );
console.log( enemy.attack() );
