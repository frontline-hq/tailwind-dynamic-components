import type { Config } from 'tailwindcss';
import { getDynamicSafelist } from '../../src/safelisting/safelisting';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}', '!**/*.tdc.ts', '!tdc.config.ts'],
	theme: {
		extend: {}
	},
	plugins: [],
	safelist: [...getDynamicSafelist({ debug: true })]
} as Config;
