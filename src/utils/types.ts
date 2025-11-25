import { WebGLRenderer } from 'three';
import { nodeObject } from 'three/tsl';
import { WebGPURenderer } from 'three/webgpu';

export type FnReturn = ReturnType<typeof nodeObject>;
export type ThreeRenderer = WebGPURenderer | WebGLRenderer
