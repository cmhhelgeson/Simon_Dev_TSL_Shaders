import { Box3, Triangle, Vector3 } from 'three';

const MAX_DEPTH = 8;

interface BVHNode {
	box3: Box3
	triangles: Triangle[];
	childOne: BVHNode | null;
	childTwo: BVHNode | null
}

const bvhSplit = ( parent: BVHNode, depth = 0, parentName = 'D0 -> ' ) => {

	if ( depth === MAX_DEPTH ) {

		return;

	}

	if ( parent.triangles.length === 0 ) {

		return;

	}

	const _parentSize = new Vector3();
	const _parentCenter = new Vector3();
	parent.box3.getSize( _parentSize );
	parent.box3.getCenter( _parentCenter );

	const axis: 'x' | 'y' | 'z' = _parentSize.x > Math.max( _parentSize.y, _parentSize.z ) ? 'x' : _parentSize.y > _parentSize.z ? 'y' : 'z';
	const centerValue = _parentCenter[ axis ];

	const _midpoint = new Vector3();

	parent.childOne = {
		box3: new Box3(),
		triangles: [],
		childOne: null,
		childTwo: null
	};

	parent.childTwo = {
		box3: new Box3(),
		triangles: [],
		childOne: null,
		childTwo: null
	};

	for ( const triangle of parent.triangles ) {

		const triangleMidpoint = triangle.getMidpoint( _midpoint )[ axis ];

		const child = triangleMidpoint < centerValue ? parent.childOne : parent.childTwo;
		child.triangles.push( triangle );
		child.box3.expandByPoint( triangle.a );
		child.box3.expandByPoint( triangle.b );
		child.box3.expandByPoint( triangle.c );

	}

	/* depthArray.push( {
		name: `${parentName} D${depth + 1}C1 -> `,
		depth: depth + 1
	} );

	depthArray.push( {
		name: `${parentName} D${depth + 1}C2 -> `,
		depth: depth + 1
	} ); */

	bvhSplit( parent.childOne, depth + 1 );
	bvhSplit( parent.childTwo, depth + 1 );

};

// Indices may be Uint16Array or Uint32Array depending on vertex count
const bvh = ( vertices: Float32Array, indices: Uint16Array | Uint32Array ) => {

	const bvh: BVHNode = {
		box3: new Box3(),
		triangles: [],
		childOne: null,
		childTwo: null
	};

	// Three indices for each triangle
	const triangleCount = indices.length / 3;

	for ( let i = 0; i < indices.length; i += 3 ) {

		const vertOne = new Vector3().fromArray( vertices, indices[ i ] * 3 );
		const vertTwo = new Vector3().fromArray( vertices, indices[ i + 1 ] * 3 );
		const vertThree = new Vector3().fromArray( vertices, indices[ i + 2 ] * 3 );

		bvh.box3.expandByPoint( vertOne );
		bvh.box3.expandByPoint( vertTwo );
		bvh.box3.expandByPoint( vertThree );

		bvh.triangles.push( new Triangle(
			vertOne,
			vertTwo,
			vertThree
		) );

	}

	/*depthArray.push( {
		name: 'D0 ->',
		depth: 0
	} ); */

	bvhSplit( bvh );

	return bvh;

};
