<script lang="ts">
	import type TestComponent from './testComponent.tdc';
	import { resolveProp } from '../../../../src';

	export let styles: (typeof TestComponent)['propType'];

	interface $$Props {
		styles: (typeof TestComponent)['propType'];
	}

	const resolved = resolveProp(styles, { color: 'blue' });

	console.log(resolveProp(styles, { color: 'blue' }));
</script>

<div class={resolveProp(styles, { color: 'blue' })}>Hey There</div>
