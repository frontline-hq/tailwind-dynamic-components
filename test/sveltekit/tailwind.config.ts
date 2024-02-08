import type { Config } from 'tailwindcss';
import { getDynamicSafelistPlugin } from '../../src/safelisting/safelisting';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}', '!**/*.tdc.ts', '!tdc.config.ts'],
	theme: {
		extend: {}
	},
	plugins: [getDynamicSafelistPlugin({ debug: true })]
} as Config;
