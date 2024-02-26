import type { LibraryConfig } from '../../src/config/config';
import { icon } from './src/lib/components/Icon/registration.tdc';
import { button } from './src/lib/components/Button/registration.tdc';
import { Manipulation } from '../../src/register';

export default {
	debug: false,
	registrations: [icon, button],
	tagNameDelimiter: '-',
	tailwindConfigPath: './tailwind.config.ts',
	manipulations: [
		new Manipulation(button, {
			styles: () => ({ manipulatedB: `w-24` })
		})
	]
} satisfies LibraryConfig;
