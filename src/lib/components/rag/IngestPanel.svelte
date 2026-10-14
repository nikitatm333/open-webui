<script lang="ts">
	import { getContext } from 'svelte';

	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import Play from '$lib/components/icons/Play.svelte';
	import type { RagIngestStatus } from '$lib/apis/rag';

	const i18n = getContext('i18n');

	export let status: RagIngestStatus | null = null;

	export let onPause: () => void = () => {};
	export let onResume: () => void = () => {};
	export let onStop: () => void = () => {};
	export let onClose: () => void = () => {};

	let activeTab: 'progress' | 'logs' = 'progress';
	let showStopConfirm = false;

	$: percent =
		status && status.progress.total > 0
			? Math.min(100, Math.round((status.progress.done / status.progress.total) * 100))
			: 0;

	$: statusLabel = (() => {
		if (!status) return '';
		if (status.running && status.paused) return $i18n.t('Paused');
		if (status.running) return $i18n.t('Running');
		if (status.last_status === 'error') return $i18n.t('Error');
		if (status.last_status === 'stopped') return $i18n.t('Stopped');
		if (status.last_status === 'ok') return $i18n.t('Completed');
		return '';
	})();
</script>

<ConfirmDialog
	bind:show={showStopConfirm}
	title={$i18n.t('Stop indexing?')}
	on:confirm={() => {
		onStop();
		showStopConfirm = false;
	}}
>
	<div class="text-sm text-gray-500">
		{$i18n.t('The running indexing job will be stopped. Already indexed files keep their status.')}
	</div>
</ConfirmDialog>

<div
	class="w-full rounded-2xl border border-gray-100 dark:border-gray-800 p-3 mb-2 bg-gray-50/40 dark:bg-gray-900/30"
>
	<div class="flex items-center gap-3 mb-2">
		<div class="flex gap-1 text-xs">
			<button
				class="px-2 py-0.5 rounded-full {activeTab === 'progress'
					? 'bg-gray-900 text-gray-100 dark:bg-gray-100 dark:text-gray-800'
					: 'text-gray-500'}"
				type="button"
				on:click={() => (activeTab = 'progress')}
			>
				{$i18n.t('Progress')}
			</button>
			<button
				class="px-2 py-0.5 rounded-full {activeTab === 'logs'
					? 'bg-gray-900 text-gray-100 dark:bg-gray-100 dark:text-gray-800'
					: 'text-gray-500'}"
				type="button"
				on:click={() => (activeTab = 'logs')}
			>
				{$i18n.t('Logs')}
			</button>
		</div>

		<div class="ml-auto text-xs text-gray-500">{statusLabel}</div>

		{#if status?.running}
			<button
				class="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 px-2 py-0.5 rounded-full transition"
				type="button"
				on:click={() => (status?.paused ? onResume() : onPause())}
			>
				{#if status?.paused}
					<span class="flex items-center gap-1"><Play className="size-3" />{$i18n.t('Resume')}</span
					>
				{:else}
					{$i18n.t('Pause')}
				{/if}
			</button>

			<button
				class="text-xs bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full transition"
				type="button"
				on:click={() => {
					showStopConfirm = true;
				}}
			>
				{$i18n.t('Stop')}
			</button>
		{:else}
			<button class="text-xs text-gray-400 hover:text-gray-700" type="button" on:click={onClose}>
				{$i18n.t('Close')}
			</button>
		{/if}
	</div>

	{#if activeTab === 'progress'}
		<div class="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
			<div
				class="h-full bg-gray-900 dark:bg-gray-100 transition-all"
				style="width: {percent}%"
			></div>
		</div>
		<div class="flex justify-between text-[11px] text-gray-500 mt-1">
			<div>{status?.progress.done ?? 0} / {status?.progress.total ?? 0}</div>
			<div>{percent}%</div>
		</div>
		{#if status?.progress.last_file}
			<div class="text-[11px] text-gray-500 truncate mt-1">
				{$i18n.t('Last file: {{FILE}}', { FILE: status.progress.last_file })}
			</div>
		{/if}
	{:else}
		<div
			class="max-h-48 overflow-y-auto rounded-lg bg-black/90 text-green-400 text-[11px] font-mono p-2 whitespace-pre-wrap break-all"
		>
			{#each status?.log ?? [] as line}
				<div>{line}</div>
			{/each}
		</div>
	{/if}
</div>
