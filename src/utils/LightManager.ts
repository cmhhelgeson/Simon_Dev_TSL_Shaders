import { DirectionalLight } from 'three';


export class LightManager {

	constructor() {

	}

	setDirectionalLightShadowFrustrum(
		light: DirectionalLight,
		frustrumValue: number = - 1,
	) {

		light.shadow.camera.top = frustrumValue;
		light.shadow.camera.right = frustrumValue;
		light.shadow.camera.bottom = - frustrumValue;
		light.shadow.camera.left = - frustrumValue;

	}


}
