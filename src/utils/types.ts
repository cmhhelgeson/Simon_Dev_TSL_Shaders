import { WebGLRenderer, Scene, Camera } from 'three';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import { nodeObject } from 'three/tsl';
import { PostProcessing, WebGPURenderer } from 'three/webgpu';

export type FnReturn = ReturnType<typeof nodeObject>;
export type ThreeRenderer = WebGPURenderer
export type RenderCallback = ( renderer: ThreeRenderer, scene: Scene, camera: Camera ) => void;

export type PostProcessingComposition<R> =
    R extends WebGLRenderer ? EffectComposer :
    R extends WebGPURenderer ? PostProcessing :
    never;
