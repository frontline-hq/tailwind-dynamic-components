import { Registration } from '../../../../../../src/register';

export const icon = new Registration({
	identifier: 'icon',
	props: { size: ['xl', '2xl'], destructive: ['true', 'false'] },
	styles: (s) => ({
		c: `border-${s('size', { xl: '8', '2xl': '4' })} text-${s('destructive', 'red', {
			false: 'green'
		})}-400`
	}),
	dependencies: {},
	mappings: {},
	importPath: '$lib/components/icon'
});
