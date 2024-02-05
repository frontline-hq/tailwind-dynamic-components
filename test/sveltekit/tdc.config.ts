import type { LibraryConfig } from '../../src/config/config';
import { icon } from './src/lib/components/Icon/registration.tdc';

export default {
	debug: false,
	registrations: [icon],
	tagNameDelimiter: '-',
	tailwindConfigPath: './tailwind.config.ts'
} satisfies LibraryConfig;
