import * as THREE from 'three';
import { TextGeometry, TextGeometryParameters } from 'three/addons/geometries/TextGeometry.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { MeshBasicNodeMaterial } from 'three/webgpu';

type CreateTextMeshParamaters = Exclude<TextGeometryParameters, 'font'>

export const createTextMesh = (
	text: string,
	font: Font,
) => {

	const textGeo = new TextGeometry( 'Hello, World!', {
		font: font,
		size: 1,
		depth: 0.5,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 0.1,
		bevelSize: 0.05,
	} );
	// Need to compute the bounding box so we can center the text
	// (Will text normally start from the left)
	textGeo.computeBoundingBox();
	const centerOffset = - 0.5 * ( textGeo.boundingBox?.max.x - textGeo.boundingBox?.min.x );
	textGeo.translate( centerOffset, 0, 0 );

	return new THREE.Mesh( textGeo, new MeshBasicNodeMaterial() );

};

