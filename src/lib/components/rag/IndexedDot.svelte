<script lang="ts">
	import { getContext } from 'svelte';

	import Tooltip from '$lib/components/common/Tooltip.svelte';

	const i18n = getContext('i18n');

	export let indexed = false;
</script>

<Tooltip content={indexed ? $i18n.t('Indexed') : $i18n.t('Pending indexing')}>
	<span
		class="inline-block size-1.5 rounded-full shrink-0 {indexed
			? 'bg-green-500'
			: 'bg-yellow-500'}"
	></span>
</Tooltip>
