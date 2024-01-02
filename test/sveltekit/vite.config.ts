import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import {plugin} from '../../dist/index.mjs'

export default defineConfig({
	plugins: [plugin(), sveltekit()],
	optimizeDeps: { exclude: ["fsevents"] }
});
