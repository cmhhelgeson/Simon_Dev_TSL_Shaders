import { Fn, uint, floatBitsToUint, uintBitsToFloat, floor, fract, sub, mul, mix, vec3 } from 'three/tsl';

export const murmurHash13 = /*@__PURE__*/ Fn( ( [ src_immutable ] ) => {

	const src = src_immutable.toVar();
	const M = uint( 0x5bd1e995 );
	const h = uint( 1190494759 );
	src.mulAssign( M );
	src.bitXorAssign( src.shiftRight( 24 ) );
	src.mulAssign( M );
	h.mulAssign( M );
	h.bitXorAssign( src.x );
	h.mulAssign( M );
	h.bitXorAssign( src.y );
	h.mulAssign( M );
	h.bitXorAssign( src.z );
	h.bitXorAssign( h.shiftRight( 13 ) );
	h.mulAssign( M );
	h.bitXorAssign( h.shiftRight( 15 ) );

	return h;

}, { src: 'uvec3', return: 'uint' } );

export const hash13 = /*@__PURE__*/ Fn( ( [ src ] ) => {

	const h = murmurHash13( floatBitsToUint( src ) );

	return uintBitsToFloat( h.bitAnd( 0x007fffff ).bitOr( 0x3f800000 ) ).sub( 1.0 );

}, { src: 'vec3', return: 'float' } );

export const noise13 = /*@__PURE__*/ Fn( ( [ x ] ) => {

	const i = floor( x );
	const f = fract( x );
	f.assign( f.mul( f ).mul( sub( 3.0, mul( 2.0, f ) ) ) );

	return mix( mix( mix( hash13( i.add( vec3( 0.0, 0.0, 0.0 ) ) ), hash13( i.add( vec3( 1.0, 0.0, 0.0 ) ) ), f.x ), mix( hash13( i.add( vec3( 0.0, 1.0, 0.0 ) ) ), hash13( i.add( vec3( 1.0, 1.0, 0.0 ) ) ), f.x ), f.y ), mix( mix( hash13( i.add( vec3( 0.0, 0.0, 1.0 ) ) ), hash13( i.add( vec3( 1.0, 0.0, 1.0 ) ) ), f.x ), mix( hash13( i.add( vec3( 0.0, 1.0, 1.0 ) ) ), hash13( i.add( vec3( 1.0, 1.0, 1.0 ) ) ), f.x ), f.y ), f.z );

}, { x: 'vec3', return: 'float' } );


