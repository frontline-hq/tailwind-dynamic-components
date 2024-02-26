import { Registration } from '../../../../../../src/register';
import { icon } from '../Icon/registration.tdc';

export const button = new Registration({
	identifier: 'button',
	props: { scale: ['sm', 'md'], destructive: ['true', 'false'] },
	styles: (s) => ({
		a: `h-${s('scale', {
			sm: '4',
			md: '8'
		})} bg-${s('destructive', 'red', { false: 'green' })}-400`,
		b: `w-${s('scale', { sm: '12', md: '16' })}`,
		manipulatedB: `w-${s('scale', { sm: '12', md: '16' })}`
	}),
	dependencies: {
		icon: icon
	},
	mappings: {
		icon: {
			destructive: (m) => m('destructive', { true: 'true', false: 'false' }),
			size: (m) => m('scale', { md: '2xl', sm: 'xl' })
		}
	},
	importPath: '$lib/components/button'
});
