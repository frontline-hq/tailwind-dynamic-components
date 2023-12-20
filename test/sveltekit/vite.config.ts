import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import {plugin} from '../../src/index.ts'

export default defineConfig({
	plugins: [plugin(), sveltekit()]
});
