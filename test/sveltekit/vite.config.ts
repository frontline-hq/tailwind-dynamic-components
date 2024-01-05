import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import {plugin} from '../../dist/plugin.mjs'
import { test01 } from './src/routes/testComponent.tdc';

export default defineConfig({
	plugins: [plugin({
		debug: false,
		/* Styles within CompoundStyles have to be registered seperately for their detection */
		registrations: [test01]
	}), sveltekit()],
	optimizeDeps: { exclude: ["fsevents"] }
});
