import * as THREE from 'three';
import {
	fract,
	length,
	smoothstep,
	float,
	Fn,
	mix,
	viewportSize,
	uniform,
	abs,
	uv,
	vec3,
	remap,
	max,
	negate,
	min,
	vec2,
	If,
	rotate,
	uint,
	time,
	dot,
	clamp,
	int,
	Loop,
	sin,
	floor
} from 'three/tsl';
import { SDFLine } from '../08_SDF/util';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Node, WebGPURenderer } from 'three/webgpu';

let renderer, camera, scene, gui;

const FunctionEnum = {
	'SIN': 0,
	'NOISE': 1,
};


type ShaderType = 'Graph' | 'Gradient Noise';

const effectController = {
	currentShader: 'Gradient Noise',
	// Grid Uniforms
	cellWidth: uniform( 15 ).label( 'uCellWidth' ),
	lineWidth: uniform( 1.0 ).label( 'uLineWidth' ),
	// Vignette Uniforms
	vignetteColorMin: uniform( 0.3 ).label( 'uVignetteColorMin' ),
	vignetteColorMax: uniform( 1.0 ).label( 'uVignetteColorMax' ),
	vignetteRadius: uniform( 1.0 ).label( 'uVignetteRadius' ),
	lightFallOff: uniform( 0.3 ).label( 'uLightFallOff' ),
	// Antialias Uniforms
	antialiasRange: uniform( 1.0 ).label( 'uAntialiasRange' ),
	// Function Uniforms
	lineSpeed: uniform( 96.0 ),
	gradientSpeed: uniform( 0.2 ),
	gradientSize: uniform( 10.0 ),
	functionDetail: uniform( 1.0 ).label( 'uFunctionDetail' ),
	baseAmplitude: uniform( 0.5 ).label( 'uBaseAmplitude' ),
	baseFrequencyController: 1.0,
	baseFrequency: uniform( 1.0 ).label( 'uBaseFrequency' ),
	amplitudePersistence: uniform( 0.5 ).label( 'uPersistence' ),
	frequencyLacunarity: uniform( 2.0 ).label( 'uLacunity' ),
	octaves: uniform( uint( 4 ) ),
	px: uniform( 2.0 ).label( 'uPx' ),
	function: 'SIN',
	defineFunction: uniform( uint( 0 ) ),
};

const RED = vec3( 1.0, 0.0, 0.0 );

const hash3 = ( pNode ) => {

	const p = vec3(
		dot( pNode, vec3( 127.1, 311.7, 74.7 ) ),
		dot( pNode, vec3( 269.5, 183.3, 246.1 ) ),
		dot( pNode, vec3( 113.5, 271.9, 124.6 ) )
	);

	return float( - 1.0 ).add(
		float( 2.0 ).mul( fract(
			sin( p ).mul( 43578.543123 )
		) )
	);

};

const Math_Random = Fn( ( [ coords ] ) => {

	const p = float( 50.0 ).mul( fract( coords.mul( 0.3183099 ).add( vec2( 0.71, 0.113 ) ) ) );

	const fractCalc = fract( p.x.mul( p.y ).mul( p.x.add( p.y ) ) );
	return float( - 1.0 ).add( float( 2.0 ).mul( fractCalc ) );

} ).setLayout( {
	name: 'Math_Random',
	type: 'float',
	inputs: [
		{ name: 'coords', type: 'vec2' }
	]
} );

const noise2D = Fn( ( [ coords ] ) => {

	const texSize = vec2( 1.0 );
	const pc = coords.mul( texSize );
	const base = floor( pc );

	const s1 = Math_Random( (
		base.add( vec2( 0.0, 0.0 ) )
	).div( texSize ) );
	const s2 = Math_Random( (
		base.add( vec2( 1.0, 0.0 ) )
	).div( texSize ) );
	const s3 = Math_Random( (
		base.add( vec2( 0.0, 1.0 ) )
	).div( texSize ) );
	const s4 = Math_Random( (
		base.add( vec2( 1.0, 1.0 ) )
	).div( texSize ) );

	const f = smoothstep( 0.0, 1.0, fract( pc ) );

	const px1 = mix( s1, s2, f.x );
	const px2 = mix( s3, s4, f.x );
	const result = mix( px1, px2, f.y );
	return result;

} ).setLayout( {
	name: 'noise2D',
	type: 'float',
	inputs: [
		{ name: 'coords', type: 'vec2' }
	]
} );

const noise3D = ( p ) => {

	const i = floor( p );
	const f = fract( p );

	const u = f.mul( f ).mul(
		float( 3.0 ).sub( f.mul( 2.0 ) )
	);

	// Gradients
	const ga = hash3( i.add( vec3( 0.0, 0.0, 0.0 ) ) );
	const gb = hash3( i.add( vec3( 1.0, 0.0, 0.0 ) ) );
	const gc = hash3( i.add( vec3( 0.0, 1.0, 0.0 ) ) );
	const gd = hash3( i.add( vec3( 1.0, 1.0, 0.0 ) ) );
	const ge = hash3( i.add( vec3( 0.0, 0.0, 1.0 ) ) );
	const gf = hash3( i.add( vec3( 1.0, 0.0, 1.0 ) ) );
	const gg = hash3( i.add( vec3( 0.0, 1.0, 1.0 ) ) );
	const gh = hash3( i.add( vec3( 1.0, 1.0, 1.0 ) ) );

	// Projections
	const va = f.sub( vec3( 0.0, 0.0, 0.0 ) );
	const vb = f.sub( vec3( 1.0, 0.0, 0.0 ) );
	const vc = f.sub( vec3( 0.0, 1.0, 0.0 ) );
	const vd = f.sub( vec3( 1.0, 1.0, 0.0 ) );
	const ve = f.sub( vec3( 0.0, 0.0, 1.0 ) );
	const vf = f.sub( vec3( 1.0, 0.0, 1.0 ) );
	const vg = f.sub( vec3( 0.0, 1.0, 1.0 ) );
	const vh = f.sub( vec3( 1.0, 1.0, 1.0 ) );

	return mix(
		mix(
			mix(
				dot( ga, va ), dot( gb, vb ), u.x
			),
			mix(
				dot( gc, vc ), dot( gd, vd ), u.x
			),
			u.y
		),
		mix(
			mix(
				dot( ge, ve ), dot( gf, vf ), u.x
			),
			mix(
				dot( gg, vg ), dot( gh, vh ), u.x
			),
			u.y
		),
		u.z
	);

};

const fbmFunctionLayout = {
	name: 'fbm',
	type: 'float',
	inputs: [
		{ name: 'p', type: 'vec3' }
	]
};

const fbm = Fn( ( [ p ] ) => {

	const {
		amplitudePersistence,
		frequencyLacunarity,
		octaves,
		baseAmplitude,
		baseFrequency
	} = effectController;

	const currentAmplitude = float( 0.0 ).toVar( 'currentAmplitude' );
	currentAmplitude.assign( baseAmplitude );
	const currentFrequency = float( 0.0 ).toVar( 'currentFrequency' );
	currentFrequency.assign( baseFrequency );
	const total = float( 0.0 ).toVar( 'total' );
	const normalization = float( 0.0 ).toVar( 'normalization' );

	Loop( { start: uint( 0 ), end: octaves, type: 'uint', condition: '<' }, () => {

		// FBM function
		const noiseValue = noise3D( p.mul( currentFrequency ) ).toVar( 'noiseValue' );

		// Prepare for next loop
		total.addAssign( noiseValue.mul( currentAmplitude ) );
		normalization.addAssign( currentAmplitude );
		currentAmplitude.mulAssign( amplitudePersistence );
		currentFrequency.mulAssign( frequencyLacunarity );

	} );

	total.divAssign( normalization );
	return total;

} ).setLayout( fbmFunctionLayout );

const ridgedFBM = Fn( ( [ p ] ) => {

	const {
		amplitudePersistence,
		frequencyLacunarity,
		octaves,
		baseAmplitude,
		baseFrequency
	} = effectController;

	const currentAmplitude = float( 0.0 ).toVar( 'currentAmplitude' );
	currentAmplitude.assign( baseAmplitude );
	const currentFrequency = float( 0.0 ).toVar( 'currentFrequency' );
	currentFrequency.assign( baseFrequency );
	const total = float( 0.0 ).toVar( 'total' );
	const normalization = float( 0.0 ).toVar( 'normalization' );

	Loop( { start: uint( 0 ), end: octaves, type: 'uint', condition: '<' }, () => {

		// Ridged FBM Function
		const noiseValue = noise3D( p.mul( currentFrequency ) ).toVar( 'noiseValue' );
		noiseValue.assign( abs( noiseValue ) );
		noiseValue.assign( float( 1.0 ).sub( noiseValue ) );
		total.addAssign( noiseValue.mul( currentAmplitude ) );

		// Prep for next loop
		normalization.addAssign( currentAmplitude );
		currentAmplitude.mulAssign( amplitudePersistence );
		currentFrequency.mulAssign( frequencyLacunarity );

	} );

	total.divAssign( normalization );
	total.mulAssign( total );
	return total;

} ).setLayout( {
	...fbmFunctionLayout,
	name: 'ridgedFBM',
} );

const turbulenceFBM = Fn( ( [ p ] ) => {

	const {
		amplitudePersistence,
		frequencyLacunarity,
		octaves,
		baseAmplitude,
		baseFrequency
	} = effectController;

	const currentAmplitude = float( 0.0 ).toVar( 'currentAmplitude' );
	currentAmplitude.assign( baseAmplitude );
	const currentFrequency = float( 0.0 ).toVar( 'currentFrequency' );
	currentFrequency.assign( baseFrequency );
	const total = float( 0.0 ).toVar( 'total' );
	const normalization = float( 0.0 ).toVar( 'normalization' );

	Loop( { start: uint( 0 ), end: octaves, type: 'uint', condition: '<' }, () => {

		// Turbulence FBM Function
		const noiseValue = noise3D( p.mul( currentFrequency ) ).toVar( 'noiseValue' );
		noiseValue.assign( abs( noiseValue ) );
		total.addAssign( noiseValue.mul( currentAmplitude ) );

		// Prep for next loop
		normalization.addAssign( currentAmplitude );
		currentAmplitude.mulAssign( amplitudePersistence );
		currentFrequency.mulAssign( frequencyLacunarity );

	} );

	total.divAssign( normalization );
	total.mulAssign( total );
	return total;

} ).setLayout( {
	...fbmFunctionLayout,
	name: 'turbulenceFBM',
} );

const cellular = Fn( ( [ coords ] ) => {

	const gridBasePosition = floor( coords.xy );
	const gridCoordOffset = fract( coords.xy );

	const closest = float( 1.0 ).toVar( 'closest' );
	Loop( { start: - 2, end: - 2, type: 'int', condition: '<=' }, ( { y } ) => {

		Loop( { start: - 2, end: - 2, type: 'int', condition: '<=' }, ( { x } ) => {

			const neighborCellPosition = vec2( x, y );
			const cellWorldPosition = gridBasePosition.add( neighborCellPosition );
			const cellOffset = vec2(
				noise3D( vec3( cellWorldPosition, coords.z ).add( vec3( 243.432, 324.235, 0.0 ) ) ),
				noise3D( vec3( cellWorldPosition, coords.z ) )
			);

			const distToNeighbor = length(
				neighborCellPosition.add( cellOffset ).sub( gridCoordOffset )
			);

			closest.assign( min( closest, distToNeighbor ) );

		} );

	} );

	return closest;

} ).setLayout( {
	name: 'cellular',
	type: 'float',
	inputs: [
		{ name: 'coords', type: 'vec3' }
	]
} );

const stepped = Fn( ( [ noiseSample ] ) => {

	const steppedSample = floor( noiseSample.mul( 10.0 ) ).div( 10.0 ).toVar( 'steppedSample' );
	const remainder = fract( noiseSample.mul( 10.0 ) );
	steppedSample.assign(
		( steppedSample.sub( remainder ) ).mul( 0.5 ).add( 0.5 )
	);
	return steppedSample;

} ).setLayout( {
	name: 'stepped',
	type: 'float',
	inputs: [
		{ name: 'noiseSample', type: 'float' }
	]
} );

const domainWarpingFBM = Fn( ( [ coords ] ) => {

	const offset = vec3(
		fbm( coords ),
		fbm( coords.add( vec3( 43.235, 23.112, 0.0 ) ) ),
		0.0
	);

	const noiseSample = fbm( coords.add( offset ) ).toVar( 'noiseSample' );

	const offset2 = vec3(
		fbm( coords.add( offset.mul( 4.0 ).add( vec3( 5.325, 1.421, 3.235 ) ) ) ),
		fbm( coords.add( offset.mul( 4.0 ).add( vec3( 4.32, 0.532, 6.324 ) ) ) ),
		0.0
	);

	noiseSample.assign( coords.add( offset2.mul( 4.0 ) ) );

	return noiseSample;


} ).setLayout( {
	name: 'domainWarpingFBM',
	type: 'float',
	inputs: [
		{ name: 'coords', type: 'vec3' }
	]
} );

const evaluateNoiseFunction = Fn( ( [
	x,
	amplitudePersistence,
	frequencyLacunarity,
	octaves,
	baseAmplitude,
	baseFrequency,
] ) => {

	const y = float( 0.0 ).toVar( 'y' );

	const currentAmplitude = float( 0.0 ).toVar( 'curAmplitude' );
	currentAmplitude.assign( baseAmplitude );
	const currentFrequency = float( 0.0 ).toVar( 'curFrequency' );
	currentFrequency.assign( baseFrequency );

	Loop( { start: uint( 0 ), end: octaves, type: 'uint', condition: '<' }, () => {

		y.addAssign(
			noise2D( vec2( x ).mul( currentFrequency ) ).mul( currentAmplitude )
		);

		currentAmplitude.mulAssign( amplitudePersistence );
		currentFrequency.mulAssign( frequencyLacunarity );

	} );

	return y;

} ).setLayout( {
	name: 'evaluateNoiseFunction',
	type: 'float',
	inputs: [
		{ name: 'x', type: 'float' },
	]
} );


const evaluateSinFunction = Fn( ( [ x ] ) => {

	const {
		baseAmplitude,
		baseFrequency,
		amplitudePersistence,
		frequencyLacunarity,
	} = effectController;

	const y = float( 0.0 ).toVar( 'ySin' );

	const currentAmplitude = float( 0.0 ).toVar( 'currentAmplitude' );
	currentAmplitude.assign( baseAmplitude );

	const currentFrequency = float( 0.0 ).toVar( 'currentFrequency' );
	currentFrequency.assign( baseFrequency );

	y.addAssign(
		sin( baseFrequency.mul( x ) ).mul( currentAmplitude )
	);
	currentAmplitude.mulAssign( amplitudePersistence );
	currentFrequency.mulAssign( frequencyLacunarity );

	return y;

} ).setLayout( {
	name: 'evaluateSinFunction',
	type: 'float',
	inputs: [
		{ name: 'x', type: 'float' }
	]
} );

// Draw the function at varying levels of detail by drawing multiple
// sublines of the function.
const plotFunction = Fn( ( [ p, px, curTime ] ) => {

	const {
		defineFunction,
		amplitudePersistence,
		frequencyLacunarity,
		octaves,
		baseAmplitude,
		baseFrequency
	} = effectController;

	const result = float( 10000000.0 ).toVar( 'result' );

	// Currently the condition and update of loops are seemingly only modifiable via strings
	// Accordingly, lower the update increment to increase the fidelity of the line/tank the frame rate
	Loop( { start: float( - 5 ), end: float( 5 ), type: 'float', condition: '<', update: '+= 0.25' }, ( { i } ) => {

		const c1 = p.add( vec2( px.mul( float( i ) ), 0.0 ) ).toVar( 'c1' );
		const c2 = p.add( vec2( px.mul( float( i ).add( 1.0 ) ), 0.0 ) ).toVar( 'c2' );

		const a = vec2( 0.0 ).toVar( 'a' );
		const b = vec2( 0.0 ).toVar( 'b' );

		If( defineFunction.equal( 0 ), () => {

			a.assign( vec2( c1.x, evaluateSinFunction( c1.x.add( curTime ) ) ) );
			b.assign( vec2( c2.x, evaluateSinFunction( c2.x.add( curTime ) ) ) );

		} ).Else( () => {

			a.assign( vec2( c1.x, evaluateNoiseFunction(
				c1.x.add( curTime ),
				amplitudePersistence,
				frequencyLacunarity,
				octaves,
				baseAmplitude,
				baseFrequency
			) ) );
			b.assign( vec2( c2.x, evaluateNoiseFunction(
				c2.x.add( curTime ),
				amplitudePersistence,
				frequencyLacunarity,
				octaves,
				baseAmplitude,
				baseFrequency,
			) ) );

		} );

		result.assign( min( result, SDFLine( p, a, b ) ) );

	} );

	return result;

} ).setLayout( {
	name: 'plotFunction',
	type: 'float',
	inputs: [
		{ name: 'p', type: 'vec2' },
		{ name: 'px', type: 'float' },
		{ name: 'curTime', type: 'float' },
	]
} );

const init = async () =>{

	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	scene = new THREE.Scene();
	const geometry = new THREE.PlaneGeometry( 2, 2 );

	const material = new THREE.MeshBasicNodeMaterial();

	const black = vec3( 0.0, 0.0, 0.0 );

	const DrawGrid = Fn( ( [ pixelCoords, baseColor, lineColor, cellWidth, lineWidth ] ) => {

		const gridPosition = pixelCoords.div( cellWidth );
		// Access each individual cell's uv space.
		const cellUV = fract( gridPosition );

		// Move center of each cell (0, 0) from bottom-left to the middle.
		cellUV.assign( abs( cellUV.sub( 0.5 ) ) );
		const distToEdge = ( float( 0.5 ).sub( max( cellUV.x, cellUV.y ) ) ).mul( cellWidth );
		const ceilLine = smoothstep( 0.0, lineWidth, distToEdge );

		const color = mix( lineColor, baseColor, ceilLine );

		return color;

	} ).setLayout( {
		name: 'DrawGrid',
		type: 'vec3',
		inputs: [
			{ name: 'pixelCoords', type: 'vec2' },
			{ name: 'baseColor', type: 'vec3' },
			{ name: 'lineColor', type: 'vec3' },
			{ name: 'cellWidth', type: 'float' },
			{ name: 'lineWidth', type: 'float' }
		]
	} );

	const DrawBackgroundColor = Fn( ( [
		inputUV,
		vignetteRadius,
		lightFallOff,
		vignetteColorMin,
		vignetteColorMax
	] ) => {

		// Get the distance from the center of the uvs
		const distFromCenter = length( abs( inputUV.sub( 0.5 ) ) );
		// Move distance from range [0, 0.5] to range [1.0, 0.5]/[0.5, 1.0]
		const vignette = float( 1.0 ).sub( distFromCenter );
		vignette.assign( smoothstep( vignetteRadius.oneMinus(), lightFallOff.oneMinus(), vignette ) );
		return vec3( remap( vignette, 0.0, 1.0, vignetteColorMin, vignetteColorMax ) );

	} ).setLayout( {
		name: 'DrawBackgroundColor',
		type: 'vec3',
		inputs: [
			{ name: 'inputUV', type: 'vec2' },
			{ name: 'vignetteRadius', type: 'float' },
			{ name: 'lightFallOff', type: 'float' },
			{ name: 'vignetteColorMin', type: 'float' },
			{ name: 'vignetteColorMax', type: 'float' }
		],
	} );

	const shaders: Record<ShaderType, Node> = {
		'Graph': Fn( () => {

			const {
				cellWidth,
				lineWidth,
				lineSpeed,
				px,
				vignetteRadius,
				lightFallOff,
				vignetteColorMin,
				vignetteColorMax
			} = effectController;

			const vUv = uv();

			// Create baseline color
			const color = vec3( 0.9 ).toVar( 'color' );
			const center = vUv.sub( 0.5 );
			// Move uvs from range 0, 1 to -0.5, 0.5 thus placing 0,0 in the center of the canvas.
			const viewportPosition = center.mul( viewportSize ).toVar( 'viewportPosition' );

			// Draw vignetted background color
			color.assign( DrawBackgroundColor( uv(), vignetteRadius, lightFallOff, vignetteColorMin, vignetteColorMax ) );

			// Draw grid and inner subgrids
			color.assign( DrawGrid( viewportPosition, color, vec3( 0.5 ), cellWidth, lineWidth ) );
			color.assign( DrawGrid( viewportPosition, color, black, cellWidth.mul( 10 ), lineWidth.mul( 2 ) ) );

			const distToFunction = float( 0.0 ).toVar( 'distToFunction' );
			distToFunction.assign( plotFunction( viewportPosition, px, time.mul( lineSpeed ) ) );

			const lineColor = RED.mul(
				mix( 0.25, 1.0, smoothstep( 0.0, 3.0, abs( viewportPosition.y ) ) )
			);

			const lineBorder = smoothstep( 4.0, 6.0, distToFunction );
			color.assign( mix( lineColor, color, lineBorder ) );


			return color;


		} )(),
		'Gradient Noise': Fn( () => {

			const {
				gradientSpeed,
				gradientSize
			} = effectController;

			const coords3D = vec3( uv().mul( viewportSize.div( gradientSize ) ), time.mul( gradientSpeed ) );

			const noiseSample = remap( fbm( noise3D( coords3D ) ), - 1.0, 1.0, 0.0, 1.0 );

			const color = vec3( 0.0 ).toVar( 'color' );

			color.assign( vec3( noiseSample ) );

			return color;

		} )(),

	};

	material.colorNode = shaders[ effectController.currentShader ];

	const quad = new THREE.Mesh( geometry, material );
	scene.add( quad );

	renderer = new WebGPURenderer( { antialias: false } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	document.body.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize );

	gui = new GUI();
	gui.add( effectController, 'currentShader', Object.keys( shaders ) ).onChange( () => {

		material.colorNode = shaders[ effectController.currentShader ];
		material.needsUpdate = true;


	} );
	gui.add( effectController, 'function', Object.keys( FunctionEnum ) ).onChange( () => {

		effectController.defineFunction.value = FunctionEnum[ effectController.function ];

	} );
	gui.add( effectController.lineSpeed, 'value', 0.0, 1000.0 ).name( 'lineSpeed' );
	const shapeFolder = gui.addFolder( 'Line Shape' );
	shapeFolder.add( effectController.baseAmplitude, 'value', 0.5, 256 ).step( 0.5 ).name( 'Base Amplitude' );
	shapeFolder.add( effectController.amplitudePersistence, 'value', 0.1, 1 ).name( 'Amplitude Persistence' );
	shapeFolder.add( effectController, 'baseFrequencyController', 0.1, 200.0 ).step( 0.1 ).name( 'Base Frequency' ).onChange( () => {

		effectController.baseFrequency.value = effectController.baseFrequencyController;

	} );
	shapeFolder.add( effectController.octaves, 'value', 1, 8 ).step( 1 ).name( 'Noise Iterations' );
	shapeFolder.add( effectController.frequencyLacunarity, 'value', 0.1, 4.0 ).step( 0.1 ).name( 'Frequency Lacunarity' );
	shapeFolder.add( effectController.px, 'value', 0.1, 5.0 ).name( 'px' );
	const gradientNoiseFolder = gui.addFolder( 'Gradient Noise' );
	gradientNoiseFolder.add( effectController.gradientSpeed, 'value', 0.1, 5.0 ).step( 0.1 ).name( 'Gradient Speed' );
	gradientNoiseFolder.add( effectController.gradientSize, 'value', 1.0, 50.0 ).step( 0.1 ).name( 'Gradient Zoom' );


};
