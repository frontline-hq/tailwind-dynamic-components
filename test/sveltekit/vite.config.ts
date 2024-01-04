import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import {plugin} from '../../dist/plugin.mjs'

export default defineConfig({
	plugins: [plugin(), sveltekit()],
	optimizeDeps: { exclude: ["fsevents"] }
});
