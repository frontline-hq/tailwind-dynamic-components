import { Styles } from '../../dist/index.mjs';

export const test01 = new Styles('test01', { variants: ['sm', 'md'] })
	.staticStyles('bg-green-500')
	.dynamicStyles((v) => `text-${v('xl', { sm: '2xl' })}`);

export async function defineConfig() {
	return {
		debug: true,
		/* Styles within CompoundStyles have to be registered seperately for their detection */
		registrations: [test01]
	};
}
