
// The base class npc
class NPC {

	constructor( health ) {

		this.health = health;

	}

	clone() {

		return new Monster( this.health );

	}

	test() {

		return `Monster has ${this.health} HP`;

	}

}

class Goblin extends NPC {

	constructor( name, health ) {

		super( health );
		this.name = name;

	}

	clone() {

		return new Goblin( this.name, this.health );

	}

	test() {

		return `Goblin ${this.name} has ${this.health} HP`;

	}

}


// Usage
const originalGoblin = new Goblin( 'Bill', 100 );
const clonedGoblin = originalGoblin.clone();
clonedGoblin.name = 'Ted';

console.log( originalGoblin.test() );
// Output: Goblin Bill has 100 HP

console.log( clonedGoblin.test() );
// Output: Goblin Ted has 100 HP
