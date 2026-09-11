import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig( {
	resolve: {
		alias: {
			'three/addons': 'three/examples/jsm',
			'three/webgpu': 'three/webgpu',
			'three/tsl': 'three/tsl',
			'three': 'three',
		}
	},
	plugins: [
		glsl()
	],
	server: {
		port: 5173,
		watch: {
			// The project lives on /mnt/c, and WSL2 emits no inotify events for
			// Windows-mounted drives — without polling the watcher never fires
			// and HMR silently does nothing.
			usePolling: true,
			interval: 300,
		},
	}
} );
