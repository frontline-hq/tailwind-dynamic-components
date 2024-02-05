<script lang="ts">
	import type { TdcProp } from '../../../../../../src/register';
	import type { icon } from './registration.tdc';

	interface $$Props extends HTMLElement {
		tdc: TdcProp<typeof icon>;
	}

	export let tdc: $$Props['tdc'];

	console.log($$props.blue);
</script>

<div class={tdc.styles.c.join(' ')}>Hey there</div>
0
