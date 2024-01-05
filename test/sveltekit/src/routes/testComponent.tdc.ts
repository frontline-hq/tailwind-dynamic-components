import { Styles } from '../../../../dist/index.mjs';

export const test01 = new Styles('test01', { variants: ['sm', 'md'] })
	.staticStyles('bg-green-400')
	.dynamicStyles((v) => `text-${v('xl', { sm: '2xl' })}`);
