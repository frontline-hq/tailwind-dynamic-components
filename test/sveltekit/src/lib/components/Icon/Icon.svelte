<script lang="ts">
	import type { TdcProp } from '../../../../../../src/register';
	import type { icon } from './registration.tdc';

	interface $$Props extends HTMLElement {
		tdc: TdcProp<typeof icon>;
	}

	export let tdc: $$Props['tdc'];
</script>

<div class={tdc.styles.c.join(' ')}>Hey there</div>
