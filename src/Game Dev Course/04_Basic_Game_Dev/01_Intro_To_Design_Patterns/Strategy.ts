class Strategy {

	execute( data: number[] ) {}

}

class QuickSort extends Strategy {

	execute( data: number[] ) {

		console.log( 'Sorting using quick sort' );
		// Implement quick sort logic

	}

}

class BubbleSort extends Strategy {

	execute( data: number[] ) {

		console.log( 'Sorting using bubble sort' );
		// Implement bubble sort logic

	}

}

class Context {

	strategy: Strategy;

	constructor( strategy: Strategy ) {

		this.strategy = strategy;

	}

	setStrategy( strategy: Strategy ) {

		this.strategy = strategy;

	}

	executeStrategy( data: number[] ) {

		this.strategy.execute( data );

	}

}

// Usage
const data = [ 5, 3, 8, 1 ];

const context1 = new Context( new QuickSort() );
context1.executeStrategy( data ); // Output: Sorting using quick sort

context1.setStrategy( new BubbleSort() );
context1.executeStrategy( data ); // Output: Sorting using bubble sort
