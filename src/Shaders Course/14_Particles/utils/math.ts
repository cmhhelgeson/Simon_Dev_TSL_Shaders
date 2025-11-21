import MersenneTwiseter from 'mersennetwister';
import * as THREE from 'three';

const MT_ = new MersenneTwiseter();

const random = () => {

	return MT_.random();

};

type Frame<T> = {
	time: number,
	value: T,
}

const remap = (
	val: number,
	inLow: number,
	inHigh: number,
	outLow: number,
	outHigh: number
) => {

	const t = ( val - inLow ) / ( inHigh - inLow );
	return t * ( outHigh - outLow ) + outLow;

};


class Interpolant<T> {

	// Values which construct the interpolater.
	Frames: Frame<T>[];
	// Base THREE.Interpolater class.
	#interpolater: THREE.Interpolant;
	// Buffer where interpolation gets stored.
	#resultBuffer: ArrayBuffer;

	constructor( frames: Frame<T>[], stride ) {


		// Think of frames not as individual frames but as keyframes that define a value.

		const times: number[] = frames.map( f => f.time );
		const values: number[] = frames.flatMap( f => ( f.value instanceof Array ? f.value : [ f.value ] ) );

		// Result buffer get written over during interpolation.
		this.#resultBuffer = new Float32Array( stride );

		this.Frames = frames;
		this.#interpolater = new THREE.LinearInterpolant( times, values, stride, this.#resultBuffer );

	}

	// Pass in totalTimeElapsed, get interpolation value
	evaluate( totalTimeElapsed ) {

		this.#interpolater.evaluate( totalTimeElapsed );
		return this.onEvaluate( this.#resultBuffer );

	}

	// Example Flow:
	// Frames:
	// 	{	time: 0, value: 0 },
	//  {	time: 4, value: 1 },
	//  {	time: 7, value: 2 },
	//  {	time: 9, value: 3 },
	//	{	time: 10, value: 4 }
	// Output:
	// 	maxFrameTime: 10
	// 	i = 1 -> stepSize = 0.4,
	//  i = 2 -> stepSize = 0.3
	// 	i = 3 -> stepSize = 0.2
	// 	i = 4 -> stepSize = 0.1
	// 	smallestStep = 0.1
	// 	recommendedSize = Math.ceil(1/smallestStep) -> 10;
	// 	10 unit 1-D Texture

	getTextureWidth() {

		const frames = this.Frames;

		const maxFrameTime = frames[ frames.length - 1 ].time;
		let smallestStep = 0.5;

		for ( let i = 1; i < frames.length; ++ i ) {

			const percentOfTime = ( frames[ i ].time - frames[ i - 1 ].time ) / maxFrameTime;
			smallestStep = Math.min( smallestStep, percentOfTime );

		}

		const recommendedSize = Math.ceil( 1 / smallestStep );
		return recommendedSize + 1;

	}

	// on functions indicate intended overridability
	// Default behavior is to return the Float32ArrayBuffer
	onEvaluate( result ) {

		return result;

	}

}

class Vec3Interpolant extends Interpolant<THREE.Vector3> {

	constructor( frames ) {

		super( frames, 3 );

	}

	// Repack evaluated values of the result buffer into the expected format.
	onEvaluate( result ) {

		return new THREE.Vector3( result[ 0 ], result[ 1 ], result[ 2 ] );

	}

}

class Vec2Interpolant extends Interpolant<THREE.Vector2> {

	constructor( frames ) {

		super( frames, 2 );

	}

	onEvaluate( result ) {

		return new THREE.Vector2( result[ 0 ], result[ 1 ] );

	}

}

class Vec4Interpolant extends Interpolant<THREE.Vector4> {

	constructor( frames ) {

		super( frames, 4 );

	}

	onEvaluate( result ) {

		return new THREE.Vector4( result[ 0 ], result[ 1 ], result[ 2 ], result[ 3 ] );

	}


}

class FloatInterpolant extends Interpolant<number> {

	constructor( frames ) {

		for ( let i = 0; i < frames.length; i ++ ) {

			frames[ i ].value = [ frames[ i ].value ];

		}

		super( frames, 1 );

	}

	onEvaluate( result ) {

		return result[ 0 ];

	}

	toTexture() {

		const textureWidth = this.getTextureWidth();
		const maxFrameTime = this.Frames[ this.Frames.length - 1 ].time;

		const data = new Float32Array( textureWidth );

		// 10 unit example texture:
		// UV.X 0.0 -> this.evaluate(0.0)
		// UV.X 1.0 -> this.evaluate(1.0)
		for ( let i = 0; i < textureWidth; ++ i ) {

			const t = i / ( textureWidth - 1 );
			const value = this.evaluate( t * maxFrameTime );
			data[ i ] = value;

		}

		const dataTex = new THREE.DataTexture( data, textureWidth, 1, THREE.RedFormat, THREE.FloatType );
		dataTex.minFilter = THREE.LinearFilter;
		dataTex.magFilter = THREE.LinearFilter;
		dataTex.wrapS = THREE.ClampToEdgeWrapping;
		dataTex.wrapT = THREE.ClampToEdgeWrapping;
		dataTex.needsUpdate = true;
		return dataTex;

	}

}

class ColorInterpolant extends Interpolant<THREE.Color> {

	constructor( frames ) {

		for ( const frame of frames ) {

			frame.value = [ frame.value.r, frame.value.g, frame.value.b ];

		}

		super( frames, 3 );

	}

	onEvaluate( result ) {

		return new THREE.Color( result[ 0 ], result[ 1 ], result[ 2 ] );

	}

	toTexture( alphaInterpolant?: FloatInterpolant ) {

		const frames = this.Frames;

		let maxFrameTime = frames[ frames.length - 1 ].time;

		if ( alphaInterpolant ) {

			const alphaFrames = alphaInterpolant.Frames;

			maxFrameTime = Math.max(
				maxFrameTime,
				alphaFrames[ alphaFrames.length - 1 ].time
			);

		}

		// Custom getTextureWidth implementation

		let smallestStep = 0.5;
		for ( let i = 1; i < frames.length; ++ i ) {

			const stepSize = ( frames[ i ].time - frames[ i - 1 ].time ) / maxFrameTime;
			smallestStep = Math.min( smallestStep, stepSize );

		}

		if ( alphaInterpolant ) {

			const alphaFrames = alphaInterpolant.Frames;

			for ( let i = 1; i < alphaFrames.length; ++ i ) {

				const stepSize = ( alphaFrames[ i ].time - alphaFrames[ i - 1 ].time ) / maxFrameTime;
				smallestStep = Math.min( smallestStep, stepSize );

			}

		}

		// Compute recommended size
		const recommendedSize = Math.ceil( 1 / smallestStep );

		// Make 1D texture with the values
		const width = recommendedSize + 1;

		const elementSize = 4;
		const data = new Float32Array( width * elementSize );

		for ( let i = 0; i < width; ++ i ) {

			const t = i / ( width - 1 );
			const color = this.evaluate( t * maxFrameTime );

			data[ i * elementSize + 0 ] = color.r;
			data[ i * elementSize + 1 ] = color.g;
			data[ i * elementSize + 2 ] = color.b;
			data[ i * elementSize + 3 ] = alphaInterpolant !== undefined ? alphaInterpolant.evaluate( t * maxFrameTime ) : 1.0;


		}

		const dt = new THREE.DataTexture( data, width, 1, THREE.RGBAFormat, THREE.FloatType );
		dt.minFilter = THREE.LinearFilter;
		dt.magFilter = THREE.LinearFilter;
		dt.wrapS = THREE.ClampToEdgeWrapping;
		dt.wrapT = THREE.ClampToEdgeWrapping;
		dt.needsUpdate = true;
		return dt;

	}

}

export default {
	random,
	Vec3Interpolant,
	FloatInterpolant,
	Vec2Interpolant,
	Vec4Interpolant,
	ColorInterpolant,
	remap
};
