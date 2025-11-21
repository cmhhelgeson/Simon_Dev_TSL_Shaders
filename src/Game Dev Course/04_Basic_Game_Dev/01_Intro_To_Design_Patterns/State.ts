abstract class State {

	abstract handle( context: StateMachine ): void;

}

class StandingState extends State {

	handle( context ) {

		console.log( 'Standing...' );
		context.setState( new RunningState() );

	}

}

class RunningState extends State {

	handle( context: StateMachine ) {

		console.log( 'Running...' );
		context.setState( new StandingState() );

	}

}

class StateMachine {

	state: State;

	constructor() {

		// Set default state of the state machine
		this.state = new StandingState();

	}

	setState( state ) {

		this.state = state;

	}

	// 1st call to update
	//	Will call StandingState's handle function
	// 	Don't necessarily have to pass the state machine's context
	//	But it can be useful
	//	For instance, what if part of the running state's handle() functionality is
	//	returning to the last used state. For that, it might be helpful to have a queue
	// 	of states within the state machine. This could allow us to, for example, always
	// 	transition from running, back to jo
	update() {

		this.state.handle( this );

	}

}


// Usage
const context = new StateMachine();
context.update(); // Output: Standing...
context.update(); // Output: Running...
context.update(); // Output: Standing...
