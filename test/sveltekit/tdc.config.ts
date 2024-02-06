import type { LibraryConfig } from '../../src/config/config';
import { icon } from './src/lib/components/Icon/registration.tdc';
import { button } from './src/lib/components/Button/registration.tdc';

export default {
	debug: false,
	registrations: [icon, button],
	tagNameDelimiter: '-',
	tailwindConfigPath: './tailwind.config.ts'
} satisfies LibraryConfig;
