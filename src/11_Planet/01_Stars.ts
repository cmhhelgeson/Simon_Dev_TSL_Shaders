
import * as THREE from 'three';
import { uniform, viewportSize, viewportUV, viewportCoordinate, Fn, texture, dFdx, dFdy, time, sin, mix, timerLocal, floor, float, vec3, dot, fract, uint, Loop, uv, negate, length, smoothstep, vec2, ShaderNodeObject, distance, exp, If, abs, remap, sqrt } from 'three/tsl';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Node } from 'three/webgpu';

let renderer, camera, scene, gui;

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

const fbm = ( pNode ) => {

	const {
		amplitudePersistence,
		frequencyLacunarity,
		octaves
	} = effectController;

	const currentAmplitude = float( 0.0 ).toVar( 'currentAmplitude' );
	const currentFrequency = float( 0.0 ).toVar( 'currentFrequency' );
	const total = float();

	Loop( { start: uint( 0 ), end: octaves, type: 'uint', condition: '<' }, () => {

		const noiseValue = noise3D( pNode.mul() );


	} );


};

const mod289 = ( x ) => {

	return x.sub( floor( x / 289.0 ).mul( 289.0 ) );

};

const permute = ( x ) => {

	return mod289(
		( x.mul( 34.0 ).add( 1.0 ) ).mul( x )
	);


};

const taylorInvSqrt = ( r ) => {

	return float( 1.79284291400159 ).sub( r.mul( 0.85373472095314 ) );

};

type ShaderType = 'Step 1: UV' | 'Complete Shader';


const init = async () => {

	camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	scene = new THREE.Scene();
	const geometry = new THREE.PlaneGeometry( 2, 2 );

	const material = new THREE.MeshBasicNodeMaterial();
	const textureLoader = new THREE.TextureLoader();
	const map = textureLoader.load( './resources/uv_grid_opengl.jpg' );

	const effectController = {
		currentShader: 'Complete Shader',
		// Initial size of a star cell, each containing (twinkleStars + static starS) number of randomly generated cells,
		cellSize: uniform( 158.2 ),
		// How quickly the cell size decreases after each iteration of stars
		cellSizeFalloff: uniform( 0.44 ),
		// The maxiumn radius of a star
		starRadius: uniform( 4.0 ),
		// The degree to which the star radius decreases after each iteration of stars
		starRadiusFalloff: uniform( 0.45 ),
		// The stars offset from the edges of cell, intended to prevent stars from clipping outside the edges of a cell.
		distanceFromCellCenter: uniform( 4.0 ),
		// Alter Seed Value
		seedChange: uniform( 100.0 ),
		// Star Glow
		twinkleMultiplier: uniform( 11.5 ),
		twinkleSpeed: uniform( 1.0 ),
		horizontalTwinkleHeight: uniform( 0.83 ),
		// Planet Radius
		planetRadius: uniform( 400.0 )
	};

	const starsInputs = [
		{ name: 'pixelCoords', type: 'vec2' },
		{ name: 'starRadius', type: 'float' },
		{ name: 'cellSize', type: 'float' },
	];

	const GetCellInfo = (
		pixelCoords,
		cellSize,
		seed,
		seedChange
	) => {

		const cellInvert = pixelCoords.div( cellSize ).toVar( 'cellInvert' );

		// Get uv of each cell, then offset each cell into a scaled -1 to 1 NDC esque range
		// Each cell will now be the canvas for its own star shape
		const cellCoords = fract( cellInvert ).sub( 0.5 ).mul( cellSize );
		const cellID = floor( cellInvert ).add( seed.div( seedChange ) );

		// Get a 2d hash color value
		const cellHashValue = hash3( vec3( cellID, 0.0 ) );

		return { cellCoords, cellID, cellHashValue };

	};

	const GenerateGridStars = Fn( ( [ pixelCoords, starRadius, cellSize, seed, isTwinkle ] ) => {

		const { distanceFromCellCenter, twinkleMultiplier, horizontalTwinkleHeight, twinkleSpeed, seedChange } = effectController;

		// Use viewportCoordinate instead of uv to ensure that the stars have a uniform
		// size irrespective of whether the screen size increases
		const cellInvert = pixelCoords.div( cellSize ).toVar( 'cellInvert' );
		//cellInvert.y.assign( negate( cellInvert.y ) );

		// Get uv of each cell, then offset each cell into a scaled -cellSize to cellSize NDC esque range
		// Each cell will now be the canvas for its own star shape
		const cellCoords = fract( cellInvert ).sub( 0.5 ).mul( cellSize );
		const cellID = floor( cellInvert ).add( seed.div( 100.0 ) );

		const cellHashValue = hash3( vec3( cellID, 0.0 ) );

		const starPosition = vec2( 0.0 ).toVar( 'starPosition' );
		starPosition.addAssign( cellHashValue.xy.mul( cellSize.mul( 0.5 ).sub( starRadius.mul( distanceFromCellCenter ) ) ) );
		const distToStar = length( cellCoords.sub( starPosition ) );

		// Create baseline glow
		const glow = exp( float( - 2.0 ).mul( distToStar.div( starRadius ) ) ).toVar( 'glow' );

		If( isTwinkle, () => {

			const noiseSample = noise3D( vec3( cellID, time.mul( twinkleSpeed ) ) );

			const twinkleSize = remap( noiseSample, - 1.0, 1.0, 1.0, 0.1 ).mul( starRadius.mul( twinkleMultiplier ) );
			// Twinkle will moth the same in both vertical and horizontal directions
			// So we take the absolute distance of twinkleSize
			const absDist = abs( cellCoords.sub( starPosition ) );
			// As the star radius increases, the twinkle get less bright
			const twinkleValue = smoothstep( starRadius.mul( horizontalTwinkleHeight ), 0.0, absDist.y ).mul( smoothstep(
				twinkleSize, 0.0, absDist.x
			) ).toVar( 'twinkleValue' );

			const verticalTwinkle = smoothstep(
				starRadius.mul( horizontalTwinkleHeight ), 0.0, absDist.x ).mul(
				smoothstep( twinkleSize, 0.0, absDist.y )
			);

			const s = 4;
			const t = 4;
			if ( test = 4 ) {

				const s = 4;

			}

			twinkleValue.addAssign( verticalTwinkle );

			glow.addAssign( twinkleValue );

		} );

		// Randomize extent of the glow
		const starBrightness = cellHashValue.z;

		return vec3( glow.mul( starBrightness ) );

	} ).setLayout( {
		name: 'GenerateGridStars',
		type: 'vec3',
		inputs: [
			...starsInputs,
			{ name: 'seed', type: 'float' },
			{ name: 'isTwinkle', type: 'bool' }
		],
	} );

	const sdfCircle = Fn( ( [ p, r, ] ) => {

		return length( p ).sub( r );

	} ).setLayout( {
		name: 'sdfCircle',
		type: 'float',
		inputs: [
			{ name: 'p', type: 'vec2' },
			{ name: 'r', type: 'vec2' }
		]
	} );

	const DrawPlanet = ( pixelCoords, color ) => {

		const { planetRadius } = effectController;

		const d = sdfCircle( pixelCoords, planetRadius );

		const planetColor = vec3( 1.0 );

		// If we are within the 2d- circle, derive x, y, z coordinates for the planet
		If( d.lessThanEqual( 0.0 ), () => {

			// The x and y coordinates of the planet normalized by the planet's radius.
			// This also clamps our x and y values within a range of -1 to 1, which
			// is necessary for the normal z calculation
			const x = pixelCoords.x.div( planetRadius );
			const y = pixelCoords.y.div( planetRadius );

			// This is the equation for the upper hemisphere of a sphere
			// where the sphere's origin is at the point (0, 0, 0).
			// As x and y increase, the we access points that grow exponentially
			// closer to the sphere's equator at a normal in the z direction of 0.
			const z = sqrt( float( 1.0 ).sub( x.mul( x ) ).sub( y.mul( y ) ) );
			const viewNormal = vec3( x, y, z ).toVar( 'planetViewNormal' );
			const wsPosition = vec3( x, y, z ).toVar( 'planetWorldSpacePosition' );

		} );

		color.assign( mix( planetColor, color, smoothstep( - 1.0, 0.0, d ) ) );

		return color;

	};

	const GenerateStars = Fn( ( [ pixelCoords, starRadius, cellSize ] ) => {

		const { starRadiusFalloff, cellSizeFalloff } = effectController;

		const stars = vec3( 0.0 ).toVar( 'starsColor' );

		const baseStarRadius = float( 0.0 ).toVar( 'baseStarRadius' );
		baseStarRadius.assign( starRadius );

		const baseCellSize = float( 0.0 ).toVar( 'baseCellSize' );
		baseCellSize.assign( cellSize );

		Loop( { start: uint( 0 ), end: uint( 2 ), type: 'uint', condition: '<=' }, ( { i } ) => {

			stars.addAssign( GenerateGridStars( pixelCoords, baseStarRadius, baseCellSize, i, true ) );
			baseStarRadius.mulAssign( starRadiusFalloff );
			baseCellSize.mulAssign( cellSizeFalloff );

		} );

		Loop( { start: uint( 0 ), end: uint( 3 ), type: 'uint', condition: '<=' }, ( { i } ) => {

			stars.addAssign( GenerateGridStars( pixelCoords, baseStarRadius, baseCellSize, i, false ) );
			baseStarRadius.mulAssign( starRadiusFalloff );
			baseCellSize.mulAssign( cellSizeFalloff );

		} );

		return stars;

	} ).setLayout( {
		name: 'GenerateStars',
		type: 'vec3',
		inputs: starsInputs,
	} );

	const fragmentShaders: Record<ShaderType, ShaderNodeObject<Node>> = {
		'Step 1: UV': Fn( () => {

			return uv().sub( 0.5 ).mul( viewportSize );

		} )(),

		'Step 2: Initial Cell UV': Fn( () => {

			const { cellSize } = effectController;

			const pixelCoords = uv().sub( 0.5 ).mul( viewportSize );
			const cellInvert = pixelCoords.div( cellSize ).toVar( 'cellInvert' );
			//cellInvert.y.assign( negate( cellInvert.y ) );

			const cellCoords = fract( cellInvert );
			return cellCoords;

		} )(),

		'Step 3: Offset Cell UV': Fn( () => {

			const { cellSize } = effectController;

			const pixelCoords = uv().sub( 0.5 ).mul( viewportSize );
			const cellInvert = pixelCoords.div( cellSize ).toVar( 'cellInvert' );
			//cellInvert.y.assign( negate( cellInvert.y ) );

			const cellCoords = fract( cellInvert ).sub( 0.5 );
			return cellCoords;

		} )(),

		'Step 4: Scale Cell UV': Fn( () => {

			const { cellSize } = effectController;

			const pixelCoords = uv().sub( 0.5 ).mul( viewportSize );
			const cellInvert = pixelCoords.div( cellSize ).toVar( 'cellInvert' );
			cellInvert.y.assign( negate( cellInvert.y ) );

			const cellCoords = fract( cellInvert ).sub( 0.5 ).mul( cellSize );
			return cellCoords;

		} )(),

		'Step 5: Cell ID': Fn( () => {

			const { cellSize, seedChange } = effectController;

			const pixelCoords = uv().sub( 0.5 ).mul( viewportSize );
			const cellInvert = pixelCoords.div( cellSize ).toVar( 'cellInvert' );
			cellInvert.y.assign( negate( cellInvert.y ) );

			const cellID = floor( cellInvert ).add( float( 1.0 ).div( seedChange ) );
			return cellID;


		} )(),

		'Step 6: Cell Hash': Fn( () => {

			const { cellSize, seedChange } = effectController;

			const pixelCoords = uv().sub( 0.5 ).mul( viewportSize );

			const { cellCoords, cellID, cellHashValue } = GetCellInfo( pixelCoords, cellSize, float( 1.0 ), seedChange );

			return cellHashValue;


		} )(),

		'Step 7: Dist to Star': Fn( () => {

			const { cellSize, seedChange, starRadius, distanceFromCellCenter } = effectController;

			const pixelCoords = uv().sub( 0.5 ).mul( viewportSize );

			const { cellCoords, cellID, cellHashValue } = GetCellInfo( pixelCoords, cellSize, float( 1.0 ), seedChange );

			const starPosition = vec2( 0.0 ).toVar( 'starPosition' );
			starPosition.addAssign( cellHashValue.xy.mul( cellSize.mul( 0.5 ).sub( starRadius.mul( distanceFromCellCenter ) ) ) );
			const distToStar = length( cellCoords.sub( starPosition ) );

			return distToStar;

		} )(),

		// We work in a broad uv space than scale it down
		'Step 8: Scaled Dist to Star': Fn( () => {

			const { cellSize, seedChange, starRadius, distanceFromCellCenter } = effectController;

			const pixelCoords = uv().sub( 0.5 ).mul( viewportSize );

			const { cellCoords, cellID, cellHashValue } = GetCellInfo( pixelCoords, cellSize, float( 1.0 ), seedChange );

			const starPosition = vec2( 0.0 ).toVar( 'starPosition' );
			starPosition.addAssign( cellHashValue.xy.mul( cellSize.mul( 0.5 ).sub( starRadius.mul( distanceFromCellCenter ) ) ) );
			const distToStar = length( cellCoords.sub( starPosition ) );

			return distToStar.div( cellSize );


		} )(),

		'Complete Shader': Fn( () => {

			const { starRadius, cellSize } = effectController;

			const color = vec3( 0.0 ).toVar( 'color' );

			const offsetUV = uv().sub( 0.5 );

			color.assign( GenerateStars( offsetUV.mul( viewportSize ), starRadius, cellSize ) );

			DrawPlanet( offsetUV.mul( viewportSize ), color );

			return color;


		} )(),


	};

	// Grid shaders succintly demonstrate the functionality of dFdx due to the harsh
	// changes between grid lines and the rest of the grid space.
	material.colorNode = fragmentShaders[ effectController.currentShader ];

	const quad = new THREE.Mesh( geometry, material );
	scene.add( quad );

	renderer = new THREE.WebGPURenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setAnimationLoop( animate );
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
	document.body.appendChild( renderer.domElement );

	window.addEventListener( 'resize', onWindowResize );

	gui = new GUI();
	gui.add( effectController, 'currentShader', Object.keys( fragmentShaders ) ).onChange( () => {

		material.colorNode = fragmentShaders[ effectController.currentShader ];
		material.needsUpdate = true;


	} );

	// STAR PARAMETERS
	const starsFolder = gui.addFolder( 'Stars' );
	const starCellFolder = starsFolder.addFolder( 'Star Cell' );
	// Cell parameters
	starCellFolder.add( effectController.cellSize, 'value', 1.0, 500.0 ).step( 0.1 ).name( 'Cell Size' );
	starCellFolder.add( effectController.cellSizeFalloff, 'value', 0.01, 1.0 ).step( 0.01 ).name( 'Cell Size Falloff' );
	starCellFolder.add( effectController.distanceFromCellCenter, 'value', 0.5, 10.0 ).step( 0.1 ).name( 'Star Offset from Cell Edge' );
	starCellFolder.add( effectController.seedChange, 'value', 1.0, 200.0 ).step( 0.1 ).name( 'seedChange' );
	const starShapeFolder = starsFolder.addFolder( 'Star Shape' );
	// Star Shape parameters
	starShapeFolder.add( effectController.starRadius, 'value', 1.0, 20.0 ).step( 0.1 ).name( 'Star Radius' );
	starShapeFolder.add( effectController.starRadiusFalloff, 'value', 0.01, 1.0 ).step( 0.01 ).name( 'Star Radius Falloff' );
	starShapeFolder.add( effectController.distanceFromCellCenter, 'value', 0.5, 10.0 ).step( 0.1 ).name( 'starDistanceFromCellCenter' );
	const starGlowFolder = starsFolder.addFolder( 'Star Glow' );
	starGlowFolder.add( effectController.twinkleMultiplier, 'value', 1.0, 100.0 ).step( 0.1 ).name( 'Twinkle Length' );
	starGlowFolder.add( effectController.horizontalTwinkleHeight, 'value', 0.01, 1.1 ).step( 0.01 ).name( 'Horizontal Twinkle Height' );
	starGlowFolder.add( effectController.twinkleSpeed, 'value', 1.0, 20.0 ).step( 0.01 ).name( 'Twinkle Speed' );

	// PLANET PARAMETERS
	const planetFolder = gui.addFolder( 'Planet' );
	planetFolder.add( effectController.planetRadius, 'value', 20.0, 400.0 ).step( 0.1 ).name( 'Planet Radius' );


};

const onWindowResize = () => {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );

};

function animate() {

	renderer.render( scene, camera );

}

init();
