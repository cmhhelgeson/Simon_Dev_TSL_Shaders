import { wgslFn } from 'three/tsl';

export const murmurHash34WGSL = wgslFn( `
	fn murmurHash34( src_in: vec4u ) -> vec3u {

		var src: vec4u = src_in;
		const M: u32 = 0x5bd1e995;
		var h: vec3u = vec3u( 1190494759, 2147483647, 3559788179 );
		src *= M;
		src ^= src >> 24;
		src *= M;
		h *= M;
		h ^= src.x;
		h *= M;
		h ^= src.y;
		h *= M;
		h ^= src.z;
		h *= M;
		h ^= src.w;
		h ^= h >> 13;
		h *= M;
		h ^= h >> 15;

		return h;

	}
` );

// 3 outputs, 4 inputs

export const hash34 = wgslFn( `
	fn hash34( src: vec4f ) -> vec3f {

		let h: vec3u = murmurHash34( bitcast<vec4<u32>>( src ) );
		let v: vec3f = bitcast<vec3<f32>>( ( h & 0x007fffff ) | 0x3f800000 ) - 1.0;

		return ( v * 2.0 ) - 1.0;

	}
` );

export const noise34 = wgslFn( `
	fn noise34( x: vec4f ) -> vec3f {

		let i: vec4f = floor( x );
		let f: vec4f = fract( x );

		// f = f*f*(3.0-2.0*f);

		let v1: vec3f = mix( mix( mix( hash34( i + vec4f( 0.0, 0.0, 0.0, 0.0 ) ), hash34( i + vec4f( 1.0, 0.0, 0.0, 0.0 ) ), f.x ), mix( hash34( i + vec4f( 0.0, 1.0, 0.0, 0.0 ) ), hash34( i + vec4f( 1.0, 1.0, 0.0, 0.0 ) ), f.x ), f.y ), mix( mix( hash34( i + vec4f( 0.0, 0.0, 1.0, 0.0 ) ), hash34( i + vec4f( 1.0, 0.0, 1.0, 0.0 ) ), f.x ), mix( hash34( i + vec4f( 0.0, 1.0, 1.0, 0.0 ) ), hash34( i + vec4f( 1.0, 1.0, 1.0, 0.0 ) ), f.x ), f.y ), f.z );
		let v2: vec3f = mix( mix( mix( hash34( i + vec4f( 0.0, 0.0, 0.0, 1.0 ) ), hash34( i + vec4f( 1.0, 0.0, 0.0, 1.0 ) ), f.x ), mix( hash34( i + vec4f( 0.0, 1.0, 0.0, 1.0 ) ), hash34( i + vec4f( 1.0, 1.0, 0.0, 1.0 ) ), f.x ), f.y ), mix( mix( hash34( i + vec4f( 0.0, 0.0, 1.0, 1.0 ) ), hash34( i + vec4f( 1.0, 0.0, 1.0, 1.0 ) ), f.x ), mix( hash34( i + vec4f( 0.0, 1.0, 1.0, 1.0 ) ), hash34( i + vec4f( 1.0, 1.0, 1.0, 1.0 ) ), f.x ), f.y ), f.z );

		return mix( v1, v2, f.w );

	}

	fn andWithVec3(h: vec3<u32>, x: u32) -> vec3<u32> {

		return vec3<u32>(h.x & x, h.y & x, h.z & x);
	
	}

	fn orWithVec3(h: vec3<u32>, x: u32) -> vec3<u32> {

		return vec3<u32>(h.x | x, h.y | x, h.z | x);
	
	}

	fn hash34( src: vec4f ) -> vec3f {

		let h: vec3u = murmurHash34( bitcast<vec4<u32>>( src ) );
		let v: vec3f = bitcast<vec3<f32>>( orWithVec3(andWithVec3(h, 0x007fffff), 0x3f800000 )) - 1.0;

		return ( v * 2.0 ) - 1.0;

	}

	fn shiftVec4Right(v: vec4<u32>, s: u32) -> vec4<u32> {
  	return vec4<u32>(v.x >> s, v.y >> s, v.z >> s, v.w >> s);
	}

	fn shiftVec3Right(v: vec3<u32>, s: u32) -> vec3<u32> {
		return vec3<u32>(v.x >> s, v.y >> s, v.z >> s);
	}

	fn bitwiseVec4WithVec4(a: vec4<u32>, b: vec4<u32>) -> vec4<u32> {

		return vec4<u32>(a.x ^ b.x, a.y ^ b.y, a.z ^ b.z, a.w ^ b.w);
	
	}

	fn bitwiseVec3WithVec3(a: vec3<u32>, b: vec3<u32>) -> vec3<u32> {

		return vec3<u32>(a.x ^ b.x, a.y ^ b.y, a.z ^ b.z);
	
	}

	fn bitwiseVec3WithUint(a: vec3<u32>, b: u32) -> vec3<u32> {

		return vec3<u32>(a.x ^ b, a.y ^ b, a.z ^ b);
	
	}

	fn murmurHash34( src_in: vec4u ) -> vec3u {

		var src: vec4u = src_in;
		const M: u32 = 0x5bd1e995;
		var h: vec3u = vec3u( 1190494759, 2147483647, 3559788179 );
		src *= M;
		src = bitwiseVec4WithVec4( src, shiftVec4Right(src, 24) );
		src *= M;
		h *= M;
		h = bitwiseVec3WithUint(h, src.x);
		h *= M;
		h = bitwiseVec3WithUint(h, src.y);
		h *= M;
		h = bitwiseVec3WithUint(h, src.z);
		h *= M;
		h = bitwiseVec3WithUint(h, src.w);
		h = bitwiseVec3WithVec3(h, shiftVec3Right(h, 13));
		h *= M;
		h = bitwiseVec3WithVec3(h, shiftVec3Right(h, 15));

		return h;

	}
` );

export const curlNoiseWGSL = wgslFn( `

	fn curlNoise( p: vec4f ) -> vec3f {

		const e: f32 = 0.1;
		let dx: vec4f = vec4f( e, 0.0, 0.0, 0.0 );
		let dy: vec4f = vec4f( 0.0, e, 0.0, 0.0 );
		let dz: vec4f = vec4f( 0.0, 0.0, e, 0.0 );
		let dx0: vec3f = noise34( p - dx );
		let dx1: vec3f = noise34( p + dx );
		let dy0: vec3f = noise34( p - dy );
		let dy1: vec3f = noise34( p + dy );
		let dz0: vec3f = noise34( p - dz );
		let dz1: vec3f = noise34( p + dz );
		let x: f32 = ( ( dy1.z - dy0.z ) - dz1.y ) + dz0.y;
		let y: f32 = ( ( dz1.x - dz0.x ) - dx1.z ) + dx0.z;
		let z: f32 = ( ( dx1.y - dx0.y ) - dy1.x ) + dy0.x;

		return normalize( vec3f( x, y, z ) / ( 2.0 * e ) );

	}

		fn noise34( x: vec4f ) -> vec3f {

		let i: vec4f = floor( x );
		let f: vec4f = fract( x );

		// f = f*f*(3.0-2.0*f);

		let v1: vec3f = mix( mix( mix( hash34( i + vec4f( 0.0, 0.0, 0.0, 0.0 ) ), hash34( i + vec4f( 1.0, 0.0, 0.0, 0.0 ) ), f.x ), mix( hash34( i + vec4f( 0.0, 1.0, 0.0, 0.0 ) ), hash34( i + vec4f( 1.0, 1.0, 0.0, 0.0 ) ), f.x ), f.y ), mix( mix( hash34( i + vec4f( 0.0, 0.0, 1.0, 0.0 ) ), hash34( i + vec4f( 1.0, 0.0, 1.0, 0.0 ) ), f.x ), mix( hash34( i + vec4f( 0.0, 1.0, 1.0, 0.0 ) ), hash34( i + vec4f( 1.0, 1.0, 1.0, 0.0 ) ), f.x ), f.y ), f.z );
		let v2: vec3f = mix( mix( mix( hash34( i + vec4f( 0.0, 0.0, 0.0, 1.0 ) ), hash34( i + vec4f( 1.0, 0.0, 0.0, 1.0 ) ), f.x ), mix( hash34( i + vec4f( 0.0, 1.0, 0.0, 1.0 ) ), hash34( i + vec4f( 1.0, 1.0, 0.0, 1.0 ) ), f.x ), f.y ), mix( mix( hash34( i + vec4f( 0.0, 0.0, 1.0, 1.0 ) ), hash34( i + vec4f( 1.0, 0.0, 1.0, 1.0 ) ), f.x ), mix( hash34( i + vec4f( 0.0, 1.0, 1.0, 1.0 ) ), hash34( i + vec4f( 1.0, 1.0, 1.0, 1.0 ) ), f.x ), f.y ), f.z );

		return mix( v1, v2, f.w );

	}

	fn andWithVec3(h: vec3<u32>, x: u32) -> vec3<u32> {

		return vec3<u32>(h.x & x, h.y & x, h.z & x);
	
	}

	fn orWithVec3(h: vec3<u32>, x: u32) -> vec3<u32> {

		return vec3<u32>(h.x | x, h.y | x, h.z | x);
	
	}

	fn hash34( src: vec4f ) -> vec3f {

		let h: vec3u = murmurHash34( bitcast<vec4<u32>>( src ) );
		let v: vec3f = bitcast<vec3<f32>>( orWithVec3(andWithVec3(h, 0x007fffff), 0x3f800000 )) - 1.0;

		return ( v * 2.0 ) - 1.0;

	}

	fn shiftVec4Right(v: vec4<u32>, s: u32) -> vec4<u32> {
  	return vec4<u32>(v.x >> s, v.y >> s, v.z >> s, v.w >> s);
	}

	fn shiftVec3Right(v: vec3<u32>, s: u32) -> vec3<u32> {
		return vec3<u32>(v.x >> s, v.y >> s, v.z >> s);
	}

	fn bitwiseVec4WithVec4(a: vec4<u32>, b: vec4<u32>) -> vec4<u32> {

		return vec4<u32>(a.x ^ b.x, a.y ^ b.y, a.z ^ b.z, a.w ^ b.w);
	
	}

	fn bitwiseVec3WithVec3(a: vec3<u32>, b: vec3<u32>) -> vec3<u32> {

		return vec3<u32>(a.x ^ b.x, a.y ^ b.y, a.z ^ b.z);
	
	}

	fn bitwiseVec3WithUint(a: vec3<u32>, b: u32) -> vec3<u32> {

		return vec3<u32>(a.x ^ b, a.y ^ b, a.z ^ b);
	
	}

	fn murmurHash34( src_in: vec4u ) -> vec3u {

		var src: vec4u = src_in;
		const M: u32 = 0x5bd1e995;
		var h: vec3u = vec3u( 1190494759, 2147483647, 3559788179 );
		src *= M;
		src = bitwiseVec4WithVec4( src, shiftVec4Right(src, 24) );
		src *= M;
		h *= M;
		h = bitwiseVec3WithUint(h, src.x);
		h *= M;
		h = bitwiseVec3WithUint(h, src.y);
		h *= M;
		h = bitwiseVec3WithUint(h, src.z);
		h *= M;
		h = bitwiseVec3WithUint(h, src.w);
		h = bitwiseVec3WithVec3(h, shiftVec3Right(h, 13));
		h *= M;
		h = bitwiseVec3WithVec3(h, shiftVec3Right(h, 15));

		return h;

	}

	
` );

