abstract class NPC {

	abstract attack(): string;

}

class OrcWarrior extends NPC {

	attack() {

		return 'Orc Warrior attacks!';

	}

}

class OrcMage extends NPC {

	attack() {

		return 'Orc Mage casts a spell!';

	}

}

class ElfWarrior extends NPC {

	attack() {

		return 'Elf Warrior attacks!';

	}

}

class ElfMage extends NPC {

	attack() {

		return 'Elf Mage casts a spell!';

	}

}

abstract class AbstractFactory {

	abstract create( type: string ): NPC

}

class OrcFactory extends AbstractFactory {

	create( type ) {

		switch ( type ) {

			case 'warrior':
				return new OrcWarrior();
			case 'mage':
				return new OrcMage();
			default:
				throw new Error( 'Unknown enemy type' );

		}

	}

}

class ElfFactory extends AbstractFactory {

	create( type ) {

		switch ( type ) {

			case 'warrior':
				return new ElfWarrior();
			case 'mage':
				return new ElfMage();
			default:
				throw new Error( 'Unknown enemy type' );

		}

	}

}

// Usage
function createArmy( factory ) {

	const warrior = factory.create( 'warrior' );
	const mage = factory.create( 'mage' );
	console.log( warrior.attack() );
	console.log( mage.attack() );

}

const orcFactory = new OrcFactory();
createArmy( orcFactory );
// Output: Orc Warrior attacks! Orc Mage casts a spell!

const elfFactory = new ElfFactory();
createArmy( elfFactory );
// Output: Elf Warrior attacks! Elf Mage casts a spell!
