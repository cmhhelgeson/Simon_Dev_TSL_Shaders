import { distance, exp, sub, Fn, negateBefore, negate, normalize } from 'three/tsl';

export const CalculateAttractorForce = /*@__PURE__*/ Fn( ( [
	currentPosition,
	attractorPosition,
	attractorRadius,
	attractorDecay,
	attractorIntensity
] ) => {

	const distToAttractor = distance( currentPosition, attractorPosition );
	const distOverRadius = distToAttractor.div( attractorRadius );

	const distNegated = negate( distOverRadius );

	// Soft attractor
	const attractorForce = attractorIntensity.mul( sub( 1.0, exp( distNegated.mul( attractorDecay ) ) ) );
	const dirToAttractor = attractorPosition.sub( currentPosition );

	return dirToAttractor.mul( attractorForce );

}, {
	currentPosition: 'vec3',
	attractorPosition: 'vec3',
	attractorRadius: 'float',
	attractorDecay: 'float',
	attractorIntensity: 'float',
	return: 'vec3'
} );
