import { Styles } from '../../dist/index.mjs';

export async function defineConfig() {
	return {
		debug: true,
		/* Styles within CompoundStyles have to be registered seperately for their detection */
		registrations: [new Styles('test01', { variants: ['sm', 'md'] }).staticStyles('bg-green-500')]
	};
}
