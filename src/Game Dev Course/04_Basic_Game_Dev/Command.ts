// Class command executes a command on the object reference that is passed to it

class Command {

	execute() {}

}

class Light {

	turnOn() {

		console.log( 'Light is on' );

	}

	turnOff() {

		console.log( 'Light is off' );

	}

}

class LightOnCommand extends Command {

	light: Light;

	constructor( light: Light ) {

		super();
		this.light = light;

	}

	execute() {

		this.light.turnOn();

	}

}

class LightOffCommand extends Command {

	light: Light;

	constructor( light ) {

		super();
		this.light = light;

	}

	execute() {

		this.light.turnOff();

	}

}

class RemoteControl {

	commands: Command[];

	constructor() {

		this.commands = [];

	}

	setCommand( command ) {

		this.commands.push( command );

	}

	executeCommands() {

		this.commands.forEach( command => command.execute() );

	}

}


// Usage
const light = new Light();
// Commands that can be handled by the remote control. Separate commands
// that operate on the same object (can be changed so that a single )
// command operates on multiple objects
const lightOn = new LightOnCommand( light );
const lightOff = new LightOffCommand( light );


// Controller of commands
const remote = new RemoteControl();
remote.setCommand( lightOn );
remote.setCommand( lightOff );

// Sequentially execute all commands passed to the remote control
remote.executeCommands();
// Output:
// Light is on
// Light is off
