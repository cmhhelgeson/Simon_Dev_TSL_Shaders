class OldAudioPlayer {

	playFile( filename: string ) {

		return `Playing OLD audio file: ${filename}`;

	}

}


class NewAudioPlayer {

	play( filename: string, format: string ) {

		return `Playing NEW ${format} file: ${filename}`;

	}

}

class AudioPlayerAdapter {

	newAudioPlayer: NewAudioPlayer;

	constructor() {

		this.newAudioPlayer = new NewAudioPlayer();

	}

	playFile( filename: string ) {

		const format = filename.split( '.' ).pop();
		return this.newAudioPlayer.play( filename, format as string );

	}

}


// Usage
// Old audio player
const oldPlayer = new OldAudioPlayer();
console.log( oldPlayer.playFile( 'song.mp3' ) );
// Output: Playing OLD audio file: song.mp3


// An audio player adapter that maps the old interface (using .playFile())
// to the new interface (which uses .play())
const adaptedPlayer = new AudioPlayerAdapter();
console.log( adaptedPlayer.playFile( 'song.mp3' ) );
// Output: Playing NEW mp3 file: song.mp3
