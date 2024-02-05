import type { Config } from 'tailwindcss';
import { dynamicSafelistPlugin } from '../../src/safelisting/safelisting';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [dynamicSafelistPlugin]
} as Config;
