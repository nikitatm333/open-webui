<script lang="ts">
	import { onMount } from 'svelte';
	import { showSidebar } from '$lib/stores';

	import Rag from '$lib/components/rag/Rag.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	let loaded = false;

	onMount(() => {
		loaded = true;
	});
</script>

<div
	class="flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out {$showSidebar
		? 'md:max-w-[calc(100%-var(--sidebar-width))]'
		: ''} max-w-full"
>
	<div class="flex-1 max-h-full overflow-y-auto">
		{#if loaded}
			<div class="pb-1 px-2.5 pt-2">
				<Rag />
			</div>
		{:else}
			<div class="w-full h-full flex justify-center items-center">
				<Spinner className="size-5" />
			</div>
		{/if}
	</div>
</div>
