<script lang="ts">
	import type { test01 } from './testComponent.tdc';
	import { resolveProp } from '../../../../dist';

	export let styles: (typeof test01)['propType'];

	interface $$Props {
		styles: (typeof test01)['propType'];
	}

	const resolved = resolveProp(styles, { color: 'blue' });

	console.log(resolveProp(styles, { color: 'blue' }));
</script>

<div class={resolveProp(styles, { color: 'blue' })}>Hey There</div>
