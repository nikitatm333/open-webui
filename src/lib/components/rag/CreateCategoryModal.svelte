<script lang="ts">
	import { getContext, tick } from 'svelte';

	import Modal from '$lib/components/common/Modal.svelte';

	const i18n = getContext('i18n');

	export let show = false;
	export let onCreate: (name: string) => void = () => {};

	const NAME_RE = /^[\p{L}\p{N}\-_ ]+$/u;

	let value = '';
	let error = '';
	let inputElement: HTMLInputElement;

	$: if (show) {
		value = '';
		error = '';
		tick().then(() => inputElement?.focus());
	}

	const submit = () => {
		const name = value.trim();
		if (!name) return;

		if (!NAME_RE.test(name)) {
			error = $i18n.t('Only letters, numbers, spaces, - and _ are allowed');
			return;
		}

		onCreate(name);
		show = false;
	};
</script>

<Modal bind:show size="xs">
	<div class="px-5 py-4">
		<div class="text-base font-medium dark:text-gray-200 mb-3">{$i18n.t('New category')}</div>

		<input
			bind:this={inputElement}
			bind:value
			type="text"
			class="w-full text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 outline-hidden"
			placeholder={$i18n.t('Category name')}
			on:input={() => {
				error = '';
			}}
			on:keydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					submit();
				}
			}}
		/>

		{#if error}
			<div class="text-xs text-red-600 dark:text-red-400 mt-1.5">{error}</div>
		{:else}
			<div class="text-xs text-gray-500 mt-1.5">
				{$i18n.t('Letters, numbers, spaces, - and _ only.')}
			</div>
		{/if}

		<div class="mt-4 flex justify-between gap-1.5">
			<button
				class="text-sm bg-gray-100 hover:bg-gray-100/70 text-gray-800 dark:bg-gray-850 dark:hover:bg-gray-850/60 dark:text-white font-normal w-full py-1.5 rounded-full transition"
				type="button"
				on:click={() => {
					show = false;
				}}
			>
				{$i18n.t('Cancel')}
			</button>
			<button
				class="text-sm bg-gray-900 hover:bg-gray-900/90 text-gray-100 dark:bg-gray-100 dark:hover:bg-gray-100/90 dark:text-gray-800 font-normal w-full py-1.5 rounded-full transition"
				type="button"
				on:click={submit}
			>
				{$i18n.t('Create')}
			</button>
		</div>
	</div>
</Modal>
