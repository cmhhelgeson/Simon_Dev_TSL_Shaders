import { abs, clamp, dot, float, Fn, fract, length, max, min, mix, negate, sign, smoothstep, vec2, vec3 } from 'three/tsl';

export const DrawGrid = Fn( ( [ pixelCoords, baseColor, lineColor, cellWidth, lineWidth ] ) => {

	const gridPosition = pixelCoords.div( cellWidth );
	// Access each individual cell's uv space.
	const cellUV = fract( gridPosition );

	// Move center of each cell (0, 0) from bottom-left to the middle.
	cellUV.assign( abs( cellUV.sub( 0.5 ) ) );
	const distToEdge = ( float( 0.5 ).sub( max( cellUV.x, cellUV.y ) ) ).mul( cellWidth );
	const ceilLine = smoothstep( 0.0, lineWidth, distToEdge );

	const color = mix( lineColor, baseColor, ceilLine );

	return color;

}, {
	pixelCoords: 'vec2',
	baseColor: 'vec3',
	lineColor: 'vec3',
	cellWidth: 'float',
	lineWidth: 'float',
	return: 'vec3'
} );

export const SDFCircle = Fn( ( [ position, radius ] ) => {

	return length( position ).sub( radius );

}, {
	position: 'vec2',
	radius: 'float',
	return: 'float'
} );

export const SDFBox = Fn( ( [ position, bounds ] ) => {

	const d = abs( position ).sub( bounds );
	return length( max( d, 0.0 ) ).add( min( max( d.x, d.y ), 0.0 ) );

}, {
	position: 'vec2',
	bounds: 'vec2',
	return: 'float'
} );

export const SDFLine = Fn( ( [ p, a, b ] ) => {

	const pa = p.sub( b );
	const ba = b.sub( a );
	const h = clamp(
		dot( pa, ba ).div( dot( ba, ba ) ),
		0.0,
		1.0
	);

	return length( pa.sub( ba.mul( h ) ) );

}, {
	p: 'vec2',
	a: 'vec2',
	b: 'vec2',
	return: 'float'
} );
