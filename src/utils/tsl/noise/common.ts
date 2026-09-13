import { floor, sin, Fn, vec3, sub, vec4, mul, overloadingFn, fract, abs, dot, lessThan, float, mod } from 'three/tsl';
import { Node } from 'three/webgpu';

/**
 * Annotating the destructured tuple is what steers Fn to its array-argument
 * overload; without it TypeScript matches the ( builder: NodeBuilder ) => ...
 * signature and every parameter degrades to an untyped node.
 *
 * `overloadingFn` is declared upstream as returning a bare FunctionOverloadingNode,
 * which extends the non-generic Node and so carries no operators or node type.
 * The signatures below restore the per-input return type each overload set
 * actually produces at runtime.
 */
type Mod289Fn = {
	( x: Node<'vec3'> ): Node<'vec3'>;
	( x: Node<'vec4'> ): Node<'vec4'>;
};

type PermuteFn = {
	( x: Node<'vec4'> ): Node<'vec4'>;
	( x: Node<'float'> ): Node<'float'>;
};

type TaylorInvSqrtFn = {
	( r: Node<'vec4'> ): Node<'vec4'>;
	( r: Node<'float'> ): Node<'float'>;
};

/**
 * Confines the two casts `overloadingFn` needs to one place: it wants `Node[]`
 * but Fn definitions are `FnNode`, and it hands back a `FunctionOverloadingNode`
 * that has lost the node type its members return.
 */
const overloads = <T>( fns: unknown[] ): T => overloadingFn( fns as Node[] ) as unknown as T;

/**
 * Hashes a vec3 into a pseudo-random vec3 in the -1 to 1 range.
 *
 * Kept bit-for-bit equivalent to the inline copies in 09_Noise/04_Perlin_Simplex
 * and 11_Planet/01_Stars: the three dot products all read the untouched input,
 * and the multiplier is 43578.543123.
 *
 * @param {vec3} p - Input vector.
 * @returns {vec3} Hashed vector.
 */
export const hash3 = /*@__PURE__*/ Fn( ( [ p_immutable ]: [ Node<'vec3'> ] ) => {

	const p = vec3(
		dot( p_immutable, vec3( 127.1, 311.7, 74.7 ) ),
		dot( p_immutable, vec3( 269.5, 183.3, 246.1 ) ),
		dot( p_immutable, vec3( 113.5, 271.9, 124.6 ) )
	);

	return float( - 1.0 ).add( float( 2.0 ).mul( fract( sin( p ).mul( 43578.543123 ) ) ) );

}, { p: 'vec3', return: 'vec3' } );

export const mod289_0 = /*#__PURE__*/ Fn( ( [ x_immutable ]: [ Node<'vec3'> ] ) => {

	const x = vec3( x_immutable ).toVar();

	return x.sub( floor( x.mul( 1.0 / 289.0 ) ).mul( 289.0 ) );

} ).setLayout( {
	name: 'mod289_0',
	type: 'vec3',
	inputs: [ { name: 'x', type: 'vec3' } ],
} );

export const mod289_1 = /*#__PURE__*/ Fn( ( [ x_immutable ]: [ Node<'vec4'> ] ) => {

	const x = vec4( x_immutable ).toVar();

	return x.sub( floor( x.mul( 1.0 / 289.0 ) ).mul( 289.0 ) );

} ).setLayout( {
	name: 'mod289_1',
	type: 'vec4',
	inputs: [ { name: 'x', type: 'vec4' } ],
} );

export const mod289 = /*#__PURE__*/ overloads<Mod289Fn>( [ mod289_0, mod289_1 ] );

export const fade = /*#__PURE__*/ Fn( ( [ t_immutable ]: [ Node<'vec3'> ] ) => {

	const t = vec3( t_immutable ).toVar();

	return t
		.mul( t )
		.mul( t )
		.mul( t.mul( t.mul( 6.0 ).sub( 15.0 ) ).add( 10.0 ) );

} ).setLayout( {
	name: 'fade',
	type: 'vec3',
	inputs: [ { name: 't', type: 'vec3' } ],
} );

/**
 * Permutes a vec4 using a specific formula.
 * @param {vec4} x - Input vector.
 * @returns {vec4} Permuted vector.
 */
export const permute_0 = /*#__PURE__*/ Fn( ( [ x_immutable ]: [ Node<'vec4'> ] ) => {

	const x = vec4( x_immutable ).toVar();

	return mod( x.mul( 34.0 ).add( 1.0 ).mul( x ), 289.0 );

} ).setLayout( {
	name: 'permute_0',
	type: 'vec4',
	inputs: [ { name: 'x', type: 'vec4' } ],
} );

/**
 * Permutes a float using a specific formula.
 * @param {float} x - Input value.
 * @returns {float} Permuted value.
 */
export const permute_1 = /*#__PURE__*/ Fn( ( [ x_immutable ]: [ Node<'float'> ] ) => {

	const x = float( x_immutable ).toVar();

	return floor( mod( x.mul( 34.0 ).add( 1.0 ).mul( x ), 289.0 ) );

} ).setLayout( {
	name: 'permute_1',
	type: 'float',
	inputs: [ { name: 'x', type: 'float' } ],
} );

/**
 * Overloaded permute function for vec4 and float.
 * @param {vec4|float} x - Input value.
 * @returns {vec4|float} Permuted value.
 */
export const permute = /*#__PURE__*/ overloads<PermuteFn>( [ permute_0, permute_1 ] );

/**
 * Taylor inverse square root for vec4.
 * @param {vec4} r - Input vector.
 * @returns {vec4} Result vector.
 */
export const taylorInvSqrt_0 = /*#__PURE__*/ Fn( ( [ r_immutable ]: [ Node<'vec4'> ] ) => {

	const r = vec4( r_immutable ).toVar();

	return sub( 1.79284291400159, mul( 0.85373472095314, r ) );

} ).setLayout( {
	name: 'taylorInvSqrt_0',
	type: 'vec4',
	inputs: [ { name: 'r', type: 'vec4' } ],
} );

/**
 * Taylor inverse square root for float.
 * @param {float} r - Input value.
 * @returns {float} Result value.
 */
export const taylorInvSqrt_1 = /*#__PURE__*/ Fn( ( [ r_immutable ]: [ Node<'float'> ] ) => {

	const r = float( r_immutable ).toVar();

	return sub( 1.79284291400159, mul( 0.85373472095314, r ) );

} ).setLayout( {
	name: 'taylorInvSqrt_1',
	type: 'float',
	inputs: [ { name: 'r', type: 'float' } ],
} );

/**
 * Overloaded taylorInvSqrt function for vec4 and float.
 * @param {vec4|float} r - Input value.
 * @returns {vec4|float} Result value.
 */
export const taylorInvSqrt = /*#__PURE__*/ overloads<TaylorInvSqrtFn>( [ taylorInvSqrt_0, taylorInvSqrt_1 ] );

/**
 * 4D gradient function for simplex noise.
 * @param {float} j - Index value.
 * @param {vec4} ip - Input permutation vector.
 * @returns {vec4} Gradient vector.
 */
export const grad4 = /*#__PURE__*/ Fn( ( [ j_immutable, ip_immutable ]: [ Node<'float'>, Node<'vec4'> ] ) => {

	const ip = vec4( ip_immutable ).toVar();
	const j = float( j_immutable ).toVar();
	const ones = vec4( 1.0, 1.0, 1.0, - 1.0 );
	const p = vec4().toVar(),
		s = vec4().toVar();
	p.xyz.assign(
		floor( fract( vec3( j ).mul( ip.xyz ) ).mul( 7.0 ) )
			.mul( ip.z )
			.sub( 1.0 ),
	);
	p.w.assign( sub( 1.5, dot( abs( p.xyz ), ones.xyz ) ) );
	s.assign( vec4( lessThan( p, vec4( 0.0 ) ) ) );
	p.xyz.assign( p.xyz.add( s.xyz.mul( 2.0 ).sub( 1.0 ).mul( s.www ) ) );

	return p;

} ).setLayout( {
	name: 'grad4',
	type: 'vec4',
	inputs: [
		{ name: 'j', type: 'float' },
		{ name: 'ip', type: 'vec4' },
	],
} );
