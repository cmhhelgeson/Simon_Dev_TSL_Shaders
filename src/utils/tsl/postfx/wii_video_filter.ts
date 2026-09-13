import { float, floor, fract, screenUV, vec2, vec4 } from 'three/tsl';
import { Node } from 'three/webgpu';

/**
 * Anything that can be sampled at an arbitrary uv - a PassNode's texture node,
 * or a plain texture(). Typed structurally so this file does not need to care
 * which one it was handed.
 */
type SampleableNode = {
	sample( uv: Node<'vec2'> ): Node<'vec4'>;
};

/**
 * libogc exposes the VI's vertical filter as GXRModeObj.vfilter[ 7 ]. The seven
 * taps are weights out of 64 spread across three scanlines - two taps from the
 * line above, three from the current line, two from the line below - and they
 * are applied during the EFB -> XFB copy.
 *
 * The progressive "soft" modes are the ones No-AA-Patcher swaps out: their taps
 * bleed a quarter of each neighbouring scanline into every line, which is the
 * vertical smear people see over component/HDMI. The plain progressive modes put
 * every tap on the current line, so they resolve to an identity filter.
 */
export const VFILTER_PROGRESSIVE: VFilter = [ 0, 0, 21, 22, 21, 0, 0 ];
export const VFILTER_PROGRESSIVE_SOFT: VFilter = [ 8, 8, 10, 12, 10, 8, 8 ];

export type VFilter = [ number, number, number, number, number, number, number ];

export type WiiVideoFilterOptions = {
	/** GXRModeObj.vfilter[ 7 ]. Defaults to the "soft" progressive taps. */
	vfilter?: VFilter;
	/** Scanlines the filter runs at. 480 for 480p/480i, 576 for PAL. */
	sourceHeight?: number;
	/** Pixels per scanline. 640 for the standard modes. */
	sourceWidth?: number;
	/**
	 * Snap to the console's pixel grid before filtering. The vertical filter is
	 * defined in scanlines, so without this the blur spans the right distance
	 * but the source never had the console's line structure to smear.
	 */
	quantize?: boolean;
	/** Ordered dither to the EFB's 6-bits-per-channel RGBA6 precision. */
	dither?: boolean;
};

/**
 * Classic 2x2 Bayer threshold, arithmetic only: [ [ 0, 2 ], [ 3, 1 ] ] / 4.
 */
const bayer2 = ( coord: Node<'vec2'> ) => {

	const p = floor( coord );
	return fract( p.x.div( 2.0 ).add( p.y.mul( p.y ).mul( 0.75 ) ) );

};

/**
 * 4x4 Bayer built from the standard recursion, giving thresholds in [ 0, 1 ).
 */
const bayer4 = ( coord: Node<'vec2'> ) => {

	return bayer2( coord.mul( 0.5 ) ).mul( 0.25 ).add( bayer2( coord ) );

};

/**
 * Emulates the GameCube / Wii video path that No-AA-Patcher strips out.
 *
 * Hardware order is reproduced deliberately: the EFB dithers to 6 bits first,
 * and only then does the copy filter blur across scanlines. That is why console
 * dithering reads as soft texture rather than as visible crosshatch - the
 * vertical filter smears the pattern on its way to the framebuffer.
 *
 * @param source - the rendered scene, e.g. scenePass.getTextureNode().
 * @param options - see {@link WiiVideoFilterOptions}.
 * @returns a vec4 node suitable for a RenderPipeline's outputNode.
 */
export const wiiVideoFilter = ( source: SampleableNode, options: WiiVideoFilterOptions = {} ) => {

	const {
		vfilter = VFILTER_PROGRESSIVE_SOFT,
		sourceWidth = 640,
		sourceHeight = 480,
		quantize = true,
		dither = true,
	} = options;

	// Collapse the seven taps onto the three scanlines they actually read.
	const total = vfilter.reduce( ( sum, tap ) => sum + tap, 0 );
	const weightAbove = ( vfilter[ 0 ] + vfilter[ 1 ] ) / total;
	const weightCenter = ( vfilter[ 2 ] + vfilter[ 3 ] + vfilter[ 4 ] ) / total;
	const weightBelow = ( vfilter[ 5 ] + vfilter[ 6 ] ) / total;

	const resolution = vec2( sourceWidth, sourceHeight );
	// One scanline in uv space. Deliberately not one output texel: the filter is
	// defined against 480 lines no matter what the display is running at.
	const lineHeight = 1.0 / sourceHeight;

	const tap = ( offset: number ) => {

		const uvNode = screenUV.add( vec2( 0.0, offset ) );

		// Snapping to texel centres is what gives the smear something with the
		// console's line structure to work on.
		const coord = quantize
			? floor( uvNode.mul( resolution ) ).add( 0.5 ).div( resolution )
			: uvNode;

		const sampled = source.sample( coord );

		if ( dither === false ) return sampled;

		// RGBA6: 64 levels per channel, so 63 steps between them. The threshold
		// is placed on the console's pixel grid rather than the display's, or the
		// pattern would shrink to 4 output pixels at any modern resolution.
		const levels = float( 63.0 );
		const threshold = bayer4( coord.mul( resolution ) );
		const quantized = floor( sampled.rgb.mul( levels ).add( threshold ) ).div( levels );

		return vec4( quantized, sampled.a );

	};

	return tap( - lineHeight ).mul( weightAbove )
		.add( tap( 0.0 ).mul( weightCenter ) )
		.add( tap( lineHeight ).mul( weightBelow ) );

};
