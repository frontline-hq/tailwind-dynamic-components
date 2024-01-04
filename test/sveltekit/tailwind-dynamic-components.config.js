import { test01 } from './src/routes/testComponent.tdc.js';

export async function defineConfig() {
	return {
		debug: true,
		/* Styles within CompoundStyles have to be registered seperately for their detection */
		registrations: [test01]
	};
}
