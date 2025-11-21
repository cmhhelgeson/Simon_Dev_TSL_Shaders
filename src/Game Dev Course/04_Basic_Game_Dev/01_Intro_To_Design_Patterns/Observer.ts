class Subject {

	observers: Observer[];

	constructor() {

		this.observers = [];

	}

	addObserver( observer ) {

		this.observers.push( observer );

	}

	// When the state of the subject changes, all it's observers get notified
	// For instance, let's say the subject is the UI and the observer is the Game character
	// and the rendering system
	// When I click on a ui element, the character and its rendering system will be notified
	// now the character will move and its skin will turn ultraviolet
	notifyObservers() {

		this.observers.forEach( observer => observer.update() );

	}

}

class Observer {

	name: string;

	constructor( name: string ) {

		this.name = name;

	}

	update() {

		console.log( `${this.name} updated` );

	}

}

// Usage
const subject = new Subject();
const observer1 = new Observer( 'Observer 1' );
const observer2 = new Observer( 'Observer 2' );

subject.addObserver( observer1 );
subject.addObserver( observer2 );

// Note: Here we're explicitly calling notifyObservers method,
// but in real-world scenarios, this method is called when
// the state of the subject changes. For example, if this was
// a UI item, notifyObservers would be called when the user
// interacts with it.
subject.notifyObservers();
// Output:
// Observer 1 updated
// Observer 2 updated
