// Unity and Godot have multiple levels of hierarchy compared to our version of GameObject
// For instance, they have game objects composed of multiple behaviors that change
// how a game object behaves.
// Parent component will have input, render, physics components
// and so will their children

class GameObject {

	name: string;
	children: GameObject[];

	constructor( name: string ) {

		this.name = name;
		this.children = [];

	}

	add( child ) {

		this.children.push( child );

	}

	remove( child: GameObject ) {

		this.children = this.children.filter( c => c !== child );

	}

	display( indent = 0 ) {

		console.log( `${' '.repeat( indent )}${this.name}` );
		this.children.forEach( child => child.display( indent + 2 ) );

	}

}

class Player extends GameObject {

	constructor( name ) {

		super( name );

	}

}

class Enemy extends GameObject {

	constructor( name ) {

		super( name );

	}

}

// Usage
// world game object
const root = new GameObject( 'Game World' );
const player = new Player( 'Player 1' );
const enemy1 = new Enemy( 'Enemy 1' );
const enemy2 = new Enemy( 'Enemy 2' );

root.add( player );
root.add( enemy1 );
root.add( enemy2 );

// Display world ("render" function)
root.display();
// Output:
// Game World
//   Player 1
//   Enemy 1
//   Enemy 2
