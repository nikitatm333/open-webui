<script lang="ts">
	import { onMount, onDestroy, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	const i18n = getContext('i18n');

	import {
		browse,
		searchFiles,
		getPending,
		createFolder,
		deleteItem,
		uploadFile,
		clearDb,
		startIngest,
		getIngestStatus,
		pauseIngest,
		resumeIngest,
		stopIngest,
		downloadFile,
		viewFileInWindow,
		type RagBrowseResult,
		type RagPendingItem,
		type RagIngestStatus
	} from '$lib/apis/rag';

	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import FilesOverlay from '$lib/components/chat/MessageInput/FilesOverlay.svelte';
	import RagContextMenu from './RagContextMenu.svelte';
	import IngestModal from './IngestModal.svelte';
	import IngestPanel from './IngestPanel.svelte';

	import Search from '$lib/components/icons/Search.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import ChevronLeft from '$lib/components/icons/ChevronLeft.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';
	import NewFolderAlt from '$lib/components/icons/NewFolderAlt.svelte';
	import ArrowUpTray from '$lib/components/icons/ArrowUpTray.svelte';
	import Database from '$lib/components/icons/Database.svelte';

	let loaded = false;

	let currentPath = '';
	let browseData: RagBrowseResult | null = null;
	let browseLoading = false;

	let query = '';
	let searchResults: { name: string; path: string; dir: string; size: number }[] | null = null;
	let searchDebounceTimer: ReturnType<typeof setTimeout>;
	let highlightedFile: string | null = null;

	let pending: RagPendingItem[] = [];

	let showIngestModal = false;
	let showIngestPanel = false;
	let ingestStatus: RagIngestStatus | null = null;
	let ingestPollTimer: ReturnType<typeof setInterval> | null = null;

	let dragged = false;

	let showDeleteConfirm = false;
	let deleteTarget: { name: string; path: string; isDir: boolean } | null = null;

	let showCreateFolder = false;

	let showContextMenu = false;
	let contextMenuX = 0;
	let contextMenuY = 0;
	let contextMenuItem: { name: string; path: string; isDir: boolean } | null = null;

	let fileInputElement: HTMLInputElement;

	$: depth = currentPath === '' ? 0 : currentPath.split('/').filter(Boolean).length;
	$: canCreateFolder = depth < 2;

	const joinPath = (parent: string, name: string) => (parent ? `${parent}/${name}` : name);

	const loadBrowse = async (path: string) => {
		browseLoading = true;
		const res = await browse(localStorage.token, path).catch((error) => {
			toast.error(`${error}`);
			return null;
		});
		browseLoading = false;

		if (res) {
			currentPath = res.path;
			browseData = res;
		}
	};

	const refreshPending = async () => {
		const res = await getPending(localStorage.token).catch(() => null);
		if (res) {
			pending = res.items;
		}
	};

	const enterFolder = (name: string) => {
		query = '';
		searchResults = null;
		loadBrowse(joinPath(currentPath, name));
	};

	const goUp = () => {
		const parts = currentPath.split('/').filter(Boolean);
		parts.pop();
		loadBrowse(parts.join('/'));
	};

	const goToPath = (path: string) => {
		query = '';
		searchResults = null;
		loadBrowse(path);
	};

	const handleSearchInput = () => {
		clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(async () => {
			if (!query) {
				searchResults = null;
				return;
			}
			const res = await searchFiles(localStorage.token, query).catch((error) => {
				toast.error(`${error}`);
				return null;
			});
			searchResults = res?.results ?? [];
		}, 300);
	};

	const openSearchResult = async (result: { dir: string; name: string }) => {
		query = '';
		searchResults = null;
		highlightedFile = result.name;
		await loadBrowse(result.dir);
		setTimeout(() => {
			highlightedFile = null;
		}, 2000);
	};

	const createFolderHandler = async (rawName: string) => {
		const name = rawName.trim();
		if (!/^[\p{L}\p{N}\-_ ]+$/u.test(name)) {
			toast.error($i18n.t('Category name can only contain letters, numbers, spaces, - and _'));
			return;
		}

		const res = await createFolder(localStorage.token, currentPath, name).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			loadBrowse(currentPath);
		}
	};

	const deleteHandler = async () => {
		if (!deleteTarget) return;

		const res = await deleteItem(localStorage.token, deleteTarget.path).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			toast.success($i18n.t('Deleted'));
			loadBrowse(currentPath);
			refreshPending();
		}
	};

	const inputFilesHandler = async (files: File[]) => {
		let uploaded = false;

		for (const file of files) {
			const res = await uploadFile(localStorage.token, currentPath, file).catch((error) => {
				toast.error(`${error}`);
				return null;
			});
			if (res) uploaded = true;
		}

		if (uploaded) {
			loadBrowse(currentPath);
			refreshPending();
		}
	};

	const onDragOver = (e: DragEvent) => {
		e.preventDefault();
		dragged = !!e.dataTransfer?.types?.includes('Files');
	};
	const onDragLeave = () => {
		dragged = false;
	};
	const onDrop = async (e: DragEvent) => {
		e.preventDefault();
		dragged = false;
		if (e.dataTransfer?.files) {
			await inputFilesHandler(Array.from(e.dataTransfer.files));
		}
	};

	const viewHandler = async (item: { path: string }) => {
		const win = window.open('', '_blank');
		await viewFileInWindow(localStorage.token, item.path, win).catch((error) => {
			toast.error(`${error}`);
			win?.close();
		});
	};

	const downloadHandler = async (item: { path: string; name: string }) => {
		await downloadFile(localStorage.token, item.path, item.name).catch((error) => {
			toast.error(`${error}`);
		});
	};

	const openContextMenu = (e: MouseEvent, item: { name: string; path: string; isDir: boolean }) => {
		e.preventDefault();
		contextMenuItem = item;
		contextMenuX = e.clientX;
		contextMenuY = e.clientY;
		showContextMenu = true;
	};

	const stopIngestPoll = () => {
		if (ingestPollTimer) {
			clearInterval(ingestPollTimer);
			ingestPollTimer = null;
		}
	};

	const pollIngestStatus = async () => {
		const res = await getIngestStatus(localStorage.token).catch(() => null);
		if (!res) return;

		ingestStatus = res;

		if (!res.running) {
			stopIngestPoll();
			loadBrowse(currentPath);
			refreshPending();
		}
	};

	const startIngestPoll = () => {
		showIngestPanel = true;
		stopIngestPoll();
		pollIngestStatus();
		ingestPollTimer = setInterval(pollIngestStatus, 1500);
	};

	const indexHandler = async (force: boolean, onlyPrefix: string | null = null) => {
		const res = await startIngest(localStorage.token, force, onlyPrefix).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			showIngestModal = false;
			startIngestPoll();
		}
	};

	const clearDbHandler = async () => {
		const res = await clearDb(localStorage.token).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			toast.success($i18n.t('Database cleared'));
			showIngestModal = false;
			refreshPending();
			loadBrowse(currentPath);
		}
	};

	const pauseHandler = async () => {
		await pauseIngest(localStorage.token).catch((error) => toast.error(`${error}`));
		pollIngestStatus();
	};
	const resumeHandler = async () => {
		await resumeIngest(localStorage.token).catch((error) => toast.error(`${error}`));
		pollIngestStatus();
	};
	const stopHandler = async () => {
		await stopIngest(localStorage.token).catch((error) => toast.error(`${error}`));
		pollIngestStatus();
	};

	onMount(async () => {
		loaded = true;

		await loadBrowse('');
		await refreshPending();

		const status = await getIngestStatus(localStorage.token).catch(() => null);
		if (status?.running) {
			ingestStatus = status;
			startIngestPoll();
		}

		const dropzoneElement = document.getElementById('rag-container');
		dropzoneElement?.addEventListener('dragover', onDragOver);
		dropzoneElement?.addEventListener('drop', onDrop);
		dropzoneElement?.addEventListener('dragleave', onDragLeave);
	});

	onDestroy(() => {
		stopIngestPoll();
		clearTimeout(searchDebounceTimer);

		const dropzoneElement = document.getElementById('rag-container');
		dropzoneElement?.removeEventListener('dragover', onDragOver);
		dropzoneElement?.removeEventListener('drop', onDrop);
		dropzoneElement?.removeEventListener('dragleave', onDragLeave);
	});
</script>

<FilesOverlay show={dragged} />

<ConfirmDialog
	bind:show={showDeleteConfirm}
	title={$i18n.t('Delete?')}
	on:confirm={() => {
		deleteHandler();
		showDeleteConfirm = false;
	}}
>
	<div class="text-sm text-gray-500">
		{$i18n.t('This will delete')}
		<span class="font-normal">{deleteTarget?.name}</span>
		{$i18n.t('from disk and from the search index.')}
	</div>
</ConfirmDialog>

<ConfirmDialog
	bind:show={showCreateFolder}
	title={$i18n.t('New category')}
	confirmLabel={$i18n.t('Create')}
	input={true}
	inputPlaceholder={$i18n.t('Category name')}
	on:confirm={(e) => {
		if (e.detail) {
			createFolderHandler(e.detail);
		}
		showCreateFolder = false;
	}}
>
	<div class="text-sm text-gray-500">{$i18n.t('Letters, numbers, spaces, - and _ only.')}</div>
</ConfirmDialog>

<RagContextMenu
	bind:show={showContextMenu}
	x={contextMenuX}
	y={contextMenuY}
	isDir={contextMenuItem?.isDir ?? false}
	onView={() => contextMenuItem && viewHandler(contextMenuItem)}
	onDownload={() => contextMenuItem && downloadHandler(contextMenuItem)}
	onIndexOnly={() => contextMenuItem && indexHandler(false, contextMenuItem.path)}
	onDelete={() => {
		if (!contextMenuItem) return;
		deleteTarget = contextMenuItem;
		showDeleteConfirm = true;
	}}
/>

<IngestModal
	bind:show={showIngestModal}
	{pending}
	onIndex={(force) => indexHandler(force)}
	onClearDb={clearDbHandler}
/>

<input
	bind:this={fileInputElement}
	type="file"
	multiple
	hidden
	on:change={async () => {
		if (fileInputElement.files && fileInputElement.files.length > 0) {
			await inputFilesHandler(Array.from(fileInputElement.files));
		}
		fileInputElement.value = '';
	}}
/>

<div id="rag-container" class="w-full min-h-full h-full">
	{#if loaded}
		<div class="flex items-center gap-1 mb-1">
			<div class="flex items-center gap-1 py-1 min-w-0">
				<span class="min-w-fit px-1 text-sm select-none">{$i18n.t('RAG')}</span>
			</div>

			<div class="ml-auto flex items-center gap-2">
				<button
					class="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-100/70 text-gray-800 dark:bg-gray-850 dark:hover:bg-gray-850/60 dark:text-white font-normal py-1.5 px-3 rounded-full transition"
					type="button"
					on:click={() => fileInputElement.click()}
				>
					<ArrowUpTray className="size-3.5" />
					{$i18n.t('Upload')}
				</button>

				<button
					class="relative flex items-center gap-1.5 text-sm bg-gray-900 hover:bg-gray-900/90 text-gray-100 dark:bg-gray-100 dark:hover:bg-gray-100/90 dark:text-gray-800 font-normal py-1.5 px-3 rounded-full transition"
					type="button"
					on:click={() => (showIngestModal = true)}
				>
					<Database className="size-3.5" />
					{$i18n.t('Indexing')}
					{#if pending.length > 0}
						<Badge type="warning" content={`${pending.length}`} />
					{/if}
				</button>
			</div>
		</div>

		{#if showIngestPanel}
			<IngestPanel
				status={ingestStatus}
				onPause={pauseHandler}
				onResume={resumeHandler}
				onStop={stopHandler}
				onClose={() => (showIngestPanel = false)}
			/>
		{/if}

		<div class="flex h-8 flex-1 items-center w-full gap-2 mb-2">
			<div class="flex min-w-0 flex-1 items-center">
				<div class="self-center ml-1 mr-3">
					<Search className="size-3.5" />
				</div>
				<input
					class="w-full text-sm py-1 rounded-r-xl outline-hidden bg-transparent"
					bind:value={query}
					on:input={handleSearchInput}
					placeholder={$i18n.t('Search files')}
				/>
				{#if query}
					<button
						class="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition"
						on:click={() => {
							query = '';
							searchResults = null;
						}}
					>
						<XMark className="size-3" strokeWidth="2" />
					</button>
				{/if}
			</div>
		</div>

		{#if searchResults !== null}
			<div class="space-y-0.5">
				{#if searchResults.length === 0}
					<div class="text-sm text-gray-500 text-center py-6">{$i18n.t('No results')}</div>
				{:else}
					{#each searchResults as result (result.path)}
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition"
							on:click={() => openSearchResult(result)}
						>
							<div class="min-w-0 flex-1 truncate">{result.name}</div>
							<div class="shrink-0 text-xs text-gray-500 truncate max-w-[40%]">{result.dir}</div>
						</button>
					{/each}
				{/if}
			</div>
		{:else}
			<div class="flex items-center gap-1 mb-2 text-sm text-gray-500 flex-wrap">
				<button
					class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition disabled:opacity-30"
					type="button"
					disabled={currentPath === ''}
					on:click={goUp}
				>
					<ChevronLeft className="size-3.5" />
				</button>

				<button
					class="hover:underline"
					type="button"
					on:click={() => goToPath('')}
				>
					{$i18n.t('Categories')}
				</button>

				{#each currentPath.split('/').filter(Boolean) as segment, idx}
					{@const segPath = currentPath
						.split('/')
						.filter(Boolean)
						.slice(0, idx + 1)
						.join('/')}
					<span>/</span>
					<button class="hover:underline" type="button" on:click={() => goToPath(segPath)}>
						{segment}
					</button>
				{/each}

				{#if canCreateFolder}
					<button
						class="ml-2 flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 px-2 py-0.5 rounded-full transition"
						type="button"
						on:click={() => (showCreateFolder = true)}
					>
						<NewFolderAlt className="size-3" />
						{$i18n.t('New category')}
					</button>
				{/if}
			</div>

			{#if browseLoading && !browseData}
				<div class="w-full h-full flex justify-center items-center py-10">
					<Spinner className="size-4" />
				</div>
			{:else if browseData}
				{#if browseData.dirs.length > 0}
					<div
						class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 mb-4"
					>
						{#each browseData.dirs as dir (dir.name)}
							<button
								type="button"
								class="group flex items-center gap-2 rounded-xl bg-gray-50/40 dark:bg-gray-900/30 hover:bg-gray-100/60 dark:hover:bg-gray-900 transition p-2.5 text-left"
								on:click={() => enterFolder(dir.name)}
								on:contextmenu={(e) =>
									openContextMenu(e, {
										name: dir.name,
										path: joinPath(currentPath, dir.name),
										isDir: true
									})}
							>
								<Folder className="size-4 shrink-0 text-gray-500" />
								<div class="min-w-0 flex-1">
									<div class="truncate text-[13px]">{dir.name}</div>
									<div class="text-[11px] text-gray-500">
										{dir.count} {$i18n.t('files')}
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}

				{#if browseData.files.length > 0}
					<div class="flex flex-col gap-0.5">
						{#each browseData.files as file (file.path)}
							<!-- svelte-ignore a11y-no-static-element-interactions -->
							<div
								class="group flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition {highlightedFile ===
								file.name
									? 'bg-yellow-100/60 dark:bg-yellow-900/30'
									: ''}"
								on:contextmenu={(e) =>
									openContextMenu(e, { name: file.name, path: file.path, isDir: false })}
							>
								<button
									type="button"
									class="min-w-0 flex-1 text-left truncate"
									on:click={() => viewHandler(file)}
								>
									{file.name}
								</button>
								<div class="shrink-0 text-xs text-gray-500">
									{(file.size / 1024).toFixed(1)} KB
								</div>
							</div>
						{/each}
					</div>
				{/if}

				{#if browseData.dirs.length === 0 && browseData.files.length === 0}
					<div class="flex min-h-[calc(100dvh-20rem)] w-full flex-col items-center justify-center">
						<div class="text-sm text-gray-500">{$i18n.t('Empty category')}</div>
					</div>
				{/if}
			{/if}
		{/if}
	{:else}
		<div class="w-full h-full flex justify-center items-center">
			<Spinner className="size-4" />
		</div>
	{/if}
</div>
