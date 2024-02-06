<script lang="ts">
	import type { TdcProp } from '../../../../../../src/register';
	import type { button } from './registration.tdc';

	interface $$Props extends HTMLElement {
		tdc: TdcProp<typeof button>;
	}

	export let tdc: $$Props['tdc'];
</script>

<button class={tdc.styles.a.join(' ')}>Some button</button>
