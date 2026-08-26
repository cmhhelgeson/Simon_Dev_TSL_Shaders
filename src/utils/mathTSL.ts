import { saturate, Fn } from 'three/tsl';

export const inverseLerp = /*@__PURE__*/ Fn( ( [ a, b, x ] ) => {

	return saturate( x.sub( a ).div( b.sub( a ) ) );

}, { a: 'float', b: 'float', x: 'float', return: 'float' } );
