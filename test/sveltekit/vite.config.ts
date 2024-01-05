import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import {plugin} from '../../dist/plugin'

export default defineConfig({
	plugins: [plugin(), sveltekit()],
	optimizeDeps: { exclude: ["fsevents"] }
});
