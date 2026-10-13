<script lang="ts">
	import { getContext } from 'svelte';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import DropdownMenu from '$lib/components/common/DropdownMenu.svelte';
	import Eye from '$lib/components/icons/Eye.svelte';
	import Download from '$lib/components/icons/Download.svelte';
	import Refresh from '$lib/components/icons/Refresh.svelte';
	import GarbageBin from '$lib/components/icons/GarbageBin.svelte';

	const i18n = getContext('i18n');

	export let show = false;
	export let x = 0;
	export let y = 0;
	export let isDir = false;

	export let onView = () => {};
	export let onDownload = () => {};
	export let onIndexOnly = () => {};
	export let onDelete = () => {};
</script>

<Dropdown bind:show align="start" sideOffset={2}>
	<span
		style="position: fixed; left: {x}px; top: {y}px; width: 0; height: 0; display: block;"
	></span>

	<div slot="content">
		<DropdownMenu className="min-w-[180px]">
			{#if !isDir}
				<button
					class="select-none"
					on:click={() => {
						show = false;
						onView();
					}}
				>
					<Eye className="size-3.5" strokeWidth="2" />
					<div class="flex items-center">{$i18n.t('Open')}</div>
				</button>

				<button
					class="select-none"
					on:click={() => {
						show = false;
						onDownload();
					}}
				>
					<Download className="size-3.5" strokeWidth="2" />
					<div class="flex items-center">{$i18n.t('Download')}</div>
				</button>
			{/if}

			<button
				class="select-none"
				on:click={() => {
					show = false;
					onIndexOnly();
				}}
			>
				<Refresh className="size-3.5" strokeWidth="2" />
				<div class="flex items-center">{$i18n.t('Index only this')}</div>
			</button>

			<hr class="border-gray-100 dark:border-gray-800" />

			<button
				class="select-none text-red-600 dark:text-red-400"
				on:click={() => {
					show = false;
					onDelete();
				}}
			>
				<GarbageBin className="size-3.5" />
				<div class="flex items-center">{$i18n.t('Delete')}</div>
			</button>
		</DropdownMenu>
	</div>
</Dropdown>
