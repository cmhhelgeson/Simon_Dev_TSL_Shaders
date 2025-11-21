import MATH from '../../utils/math';
import * as THREE from 'three';

// All particles use one life value (p.life / p.maxLife) so each interpolant has to cover
// the same length of time, irrespective of whether it is doing anything during
// large stretches of time.

export const smokeData = {
	sizeOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 20 },
		{ time: 3, value: 40 },
	] ),
	alphaOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 0 },
		{ time: 0.2, value: 1 },
		{ time: 3, value: 0 },
	] ),
	colorOverLife: new MATH.ColorInterpolant( [
	// { time: 0, value: new THREE.Color(0x808080) },
	// { time: 1, value: new THREE.Color(0x404040) },
		{ time: 0, value: new THREE.Color( 0x808080 ) },
		{ time: 1, value: new THREE.Color( 0x202020 ) },
		{ time: 3, value: new THREE.Color( 0x202020 ) }
	] ),
	twinkleOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 0 },
		{ time: 3, value: 0 },
	] ),
};

export const leadData = {
	sizeOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 2 },
		{ time: 0.1, value: 40 },
		{ time: 5, value: 40 },
	] ),
	alphaOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 0 },
		{ time: 0.25, value: 1 },
		{ time: 4.5, value: 1 },
		{ time: 5, value: 0 },
	] ),
	colorOverLife: new MATH.ColorInterpolant( [
		{ time: 0, value: new THREE.Color().setHSL( 0, 1, 0.75 ) },
		{ time: 2, value: new THREE.Color().setHSL( 0.5, 1, 0.5 ) },
		{ time: 5, value: new THREE.Color().setHSL( 1, 1, 0.5 ) },
	] ),
	twinkleOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 0 },
		{ time: 3, value: 1 },
		{ time: 4, value: 1 },
	] ),
};

export const punchData = {
	// Pucnh parameters
	sizeOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 100.0 },
		{ time: 1, value: 0.0 },
		{ time: 2, value: 100.0 },
		{ time: 3, value: 0.0 },
		{ time: 4, value: 200.0 },
		{ time: 5, value: 0.0 },
		{ time: 6, value: 100.0 },
		{ time: 18, value: 100.0 },
		{ time: 20, value: 200.0 }
	] ),
	alphaOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 1 },
		{ time: 8, value: 1 },
		{ time: 10, value: 0 },
		{ time: 12, value: 1 },
		{ time: 17, value: 1 },
		{ time: 18, value: 0 }
	] ),
	colorOverLife: new MATH.ColorInterpolant( [
		{ time: 0, value: new THREE.Color( 0xFFFFFF ) },
		{ time: 14, value: new THREE.Color( 0xFFFFFF ) },
		{ time: 15, value: new THREE.Color( 0xFF0000 ) },
		{ time: 16, value: new THREE.Color( 0x00FF00 ) },
		{ time: 17, value: new THREE.Color( 0x0000FF ) },
		{ time: 18, value: new THREE.Color( 0xFFFFFF ) },
	] ),
	twinkleOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 0 },
		{ time: 3, value: 1 },
		{ time: 4, value: 1 },
	] ),
};

export const explosionData = {
	// Generic Firework Explosion Parameters
	sizeOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 30 },
		{ time: 5, value: 40 },
	] ),
	alphaOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 0 },
		{ time: 0.25, value: 1 },
		{ time: 4.5, value: 1 },
		{ time: 5, value: 0 },
	] ),
	colorOverLife: new MATH.ColorInterpolant( [
		{ time: 0, value: new THREE.Color().setHSL( 0, 1, 0.75 ) },
		{ time: 2, value: new THREE.Color().setHSL( 0.5, 1, 0.5 ) },
		{ time: 5, value: new THREE.Color().setHSL( 1, 1, 0.5 ) },
	] ),
	twinkleOverLife: new MATH.FloatInterpolant( [
		{ time: 0, value: 0 },
		{ time: 3, value: 1 },
		{ time: 4, value: 1 },
	] ),
};
