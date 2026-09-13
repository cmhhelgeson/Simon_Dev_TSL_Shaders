import { distance, exp, sub, Fn, negate } from 'three/tsl';
import { Node } from 'three/webgpu';

export const CalculateAttractorForce = /*@__PURE__*/ Fn( ( [
	currentPosition,
	attractorPosition,
	attractorRadius,
	attractorDecay,
	attractorIntensity
]: [
	Node<'vec3'>,
	Node<'vec3'>,
	Node<'float'>,
	Node<'float'>,
	Node<'float'>
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
