<script>
	const sizeIcon = 'xl';
	const destructiveWorkingValue = 'false';
	const destructiveValue = { default: true, md: false };
</script>

<!-- Runtime safelisting -->
<tdc-icon tdc={{ size: sizeIcon, destructive: { default: true, md: destructiveWorkingValue } }} />
<tdc-button tdc={{ scale: 'sm', destructive: { default: true, lg: false } }} />
<!-- Will not work, because tailwind can't know which modifiers to safelist -->
<!-- <tdc-button tdc={{ scale: 'sm', destructive: destructiveValue }} /> -->
