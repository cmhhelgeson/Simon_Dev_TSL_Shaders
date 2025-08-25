import { Fn } from 'three/src/nodes/TSL.js';
import { uint, uvec3, floor, fract, vec4, mix, float, vec3, mul, normalize, struct, distance, exp, sub, bitcast } from 'three/tsl';

export const murmurHash34 = /*@__PURE__*/ Fn( ( [ src_immutable ] ) => {

	const src = src_immutable.toVar();
	const M = uint( 0x5bd1e995 );
	const h = uvec3( 1190494759, 2147483647, 3559788179 ).toVar();
	src.mulAssign( M );
	src.bitXorAssign( src.shiftRight( 24 ) );
	src.mulAssign( M );
	h.mulAssign( M );
	h.bitXorAssign( src.x );
	h.mulAssign( M );
	h.bitXorAssign( src.y );
	h.mulAssign( M );
	h.bitXorAssign( src.z );
	h.mulAssign( M );
	h.bitXorAssign( src.w );
	h.bitXorAssign( h.shiftRight( 13 ) );
	h.mulAssign( M );
	h.bitXorAssign( h.shiftRight( 15 ) );

	return h;

}, { src: 'uvec4', return: 'uvec3' } );

export const hash34 = /*@__PURE__*/ Fn( ( [ src ] ) => {

	const h = murmurHash34( src.bitcast( 'uint' ) );
	const v = bitcast( h.bitAnd( 0x007fffff ).bitOr( 0x3f800000 ), 'float' ).sub( 1.0 );

	return v.mul( 2.0 ).sub( 1.0 );

}, { src: 'vec4', return: 'vec3' } );

export const noise34 = /*@__PURE__*/ Fn( ( [ x ] ) => {

	const i = floor( x );
	const f = fract( x );

	// f = f*f*(3.0-2.0*f);

	const v1 = mix( mix( mix( hash34( i.add( vec4( 0.0, 0.0, 0.0, 0.0 ) ) ), hash34( i.add( vec4( 1.0, 0.0, 0.0, 0.0 ) ) ), f.x ), mix( hash34( i.add( vec4( 0.0, 1.0, 0.0, 0.0 ) ) ), hash34( i.add( vec4( 1.0, 1.0, 0.0, 0.0 ) ) ), f.x ), f.y ), mix( mix( hash34( i.add( vec4( 0.0, 0.0, 1.0, 0.0 ) ) ), hash34( i.add( vec4( 1.0, 0.0, 1.0, 0.0 ) ) ), f.x ), mix( hash34( i.add( vec4( 0.0, 1.0, 1.0, 0.0 ) ) ), hash34( i.add( vec4( 1.0, 1.0, 1.0, 0.0 ) ) ), f.x ), f.y ), f.z );
	const v2 = mix( mix( mix( hash34( i.add( vec4( 0.0, 0.0, 0.0, 1.0 ) ) ), hash34( i.add( vec4( 1.0, 0.0, 0.0, 1.0 ) ) ), f.x ), mix( hash34( i.add( vec4( 0.0, 1.0, 0.0, 1.0 ) ) ), hash34( i.add( vec4( 1.0, 1.0, 0.0, 1.0 ) ) ), f.x ), f.y ), mix( mix( hash34( i.add( vec4( 0.0, 0.0, 1.0, 1.0 ) ) ), hash34( i.add( vec4( 1.0, 0.0, 1.0, 1.0 ) ) ), f.x ), mix( hash34( i.add( vec4( 0.0, 1.0, 1.0, 1.0 ) ) ), hash34( i.add( vec4( 1.0, 1.0, 1.0, 1.0 ) ) ), f.x ), f.y ), f.z );

	return mix( v1, v2, f.w );

}, { x: 'vec4', return: 'vec3' } );

export const curlNoise = /*@__PURE__*/ Fn( ( [ p ] ) => {

	const e = float( 0.1 );
	const dx = vec4( e, 0.0, 0.0, 0.0 );
	const dy = vec4( 0.0, e, 0.0, 0.0 );
	const dz = vec4( 0.0, 0.0, e, 0.0 );
	const dx0 = noise34( p.sub( dx ) );
	const dx1 = noise34( p.add( dx ) );
	const dy0 = noise34( p.sub( dy ) );
	const dy1 = noise34( p.add( dy ) );
	const dz0 = noise34( p.sub( dz ) );
	const dz1 = noise34( p.add( dz ) );
	const x = dy1.z.sub( dy0.z ).sub( dz1.y ).add( dz0.y );
	const y = dz1.x.sub( dz0.x ).sub( dx1.z ).add( dx0.z );
	const z = dx1.y.sub( dx0.y ).sub( dy1.x ).add( dy0.x );

	return normalize( vec3( x, y, z ).div( mul( 2.0, e ) ) );

}, { p: 'vec4', return: 'vec3' } );

export const CalculateAttractorForce = /*@__PURE__*/ Fn( ( [ currentPosition, attractorParams ] ) => {

	const distToAttractor = distance( currentPosition, attractorParams.position );
	const attractorRadius = attractorParams.radius;
	const distOverRadius = distToAttractor.div( attractorRadius );

	// Soft attractor

	const decay = attractorParams.decay;
	const attractorIntensity = attractorParams.intensity;
	const attractorForce = attractorIntensity.mul( sub( 1.0, exp( distOverRadius.negateBefore().mul( decay ) ) ) );
	const dirToAttractor = attractorParams.position.sub( currentPosition );

	return dirToAttractor.mul( attractorForce );

}, { currentPosition: 'vec3', attractorParams: 'AttractorParams', return: 'vec3' } );

