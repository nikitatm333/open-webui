<script lang="ts">
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	import Modal from '$lib/components/common/Modal.svelte';
	import Checkbox from '$lib/components/common/Checkbox.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import type { RagPendingItem } from '$lib/apis/rag';

	const i18n = getContext('i18n');

	export let show = false;
	export let pending: RagPendingItem[] = [];

	export let onIndex: (force: boolean) => void = () => {};
	export let onClearDb: () => void = () => {};

	let force = false;
	let showClearDbConfirm = false;
</script>

<ConfirmDialog
	bind:show={showClearDbConfirm}
	title={$i18n.t('Clear database?')}
	confirmLabel={$i18n.t('Clear database')}
	message={$i18n.t(
		'This permanently deletes the entire vector index. All files will become pending again. Type CLEAR to confirm.'
	)}
	input={true}
	inputPlaceholder={$i18n.t('Type CLEAR to confirm')}
	on:confirm={(e) => {
		if ((e.detail ?? '').trim() === 'CLEAR') {
			onClearDb();
			showClearDbConfirm = false;
		} else {
			toast.error($i18n.t('Confirmation text did not match'));
		}
	}}
/>

<Modal bind:show size="sm">
	<div class="px-5 py-4">
		<div class="flex items-center justify-between mb-3">
			<div class="text-base font-medium dark:text-gray-200">{$i18n.t('Indexing')}</div>
			<button
				on:click={() => {
					show = false;
				}}
			>
				<XMark className="size-4" />
			</button>
		</div>

		<div class="text-xs text-gray-500 dark:text-gray-500 mb-2">
			{$i18n.t('Pending files')} — {pending.length}
		</div>

		<div class="max-h-64 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800 mb-3">
			{#if pending.length === 0}
				<div class="p-3 text-sm text-gray-500 text-center">{$i18n.t('Nothing to index')}</div>
			{:else}
				{#each pending as item (item.category + '/' + item.name)}
					<div
						class="flex items-center justify-between gap-2 px-3 py-1.5 text-xs border-b border-gray-50 dark:border-gray-900 last:border-b-0"
					>
						<div class="min-w-0 flex-1 truncate">
							<span class="text-gray-400 dark:text-gray-600">{item.category}/</span>{item.name}
						</div>
						<div
							class="shrink-0 {item.status === 'new'
								? 'text-green-600 dark:text-green-400'
								: 'text-yellow-600 dark:text-yellow-400'}"
						>
							{item.status === 'new' ? $i18n.t('new') : $i18n.t('changed')}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<button
			class="flex items-center gap-2 text-sm mb-4"
			type="button"
			on:click={() => {
				force = !force;
			}}
		>
			<Checkbox state={force ? 'checked' : 'unchecked'} />
			<div>{$i18n.t('Full reindex')}</div>
		</button>

		<div class="flex gap-2">
			<button
				class="text-sm bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 font-normal py-1.5 px-3 rounded-full transition"
				type="button"
				on:click={() => {
					showClearDbConfirm = true;
				}}
			>
				{$i18n.t('Clear database')}
			</button>

			<button
				class="ml-auto text-sm bg-gray-900 hover:bg-gray-900/90 text-gray-100 dark:bg-gray-100 dark:hover:bg-gray-100/90 dark:text-gray-800 font-normal py-1.5 px-4 rounded-full transition"
				type="button"
				on:click={() => {
					onIndex(force);
				}}
			>
				{$i18n.t('Index')}
			</button>
		</div>
	</div>
</Modal>
