import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import {plugin} from '../../src/plugin'

export default defineConfig({
	plugins: [await plugin(), sveltekit()],
	optimizeDeps: { exclude: ["fsevents"] }
});
