import { WEBUI_BASE_URL } from '$lib/constants';

export const RAG_ADMIN_BASE_URL = `${WEBUI_BASE_URL}/rag-admin`;

type RagDir = { name: string; count: number };
type RagFile = { name: string; path: string; size: number };

export type RagBrowseResult = {
	path: string;
	dirs: RagDir[];
	files: RagFile[];
};

export type RagPendingItem = {
	name: string;
	category: string;
	status: 'new' | 'changed';
};

export type RagIngestStatus = {
	running: boolean;
	paused: boolean;
	log: string[];
	last_status: 'ok' | 'error' | 'stopped' | null;
	progress: { done: number; total: number; last_file: string | null };
};

const jsonRequest = async (token: string, path: string, options: RequestInit = {}) => {
	let error = null;

	const res = await fetch(`${RAG_ADMIN_BASE_URL}${path}`, {
		...options,
		headers: {
			Accept: 'application/json',
			...(options.body ? { 'Content-Type': 'application/json' } : {}),
			authorization: `Bearer ${token}`,
			...(options.headers ?? {})
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err?.detail ?? err;
			console.error(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const browse = async (token: string, path: string = ''): Promise<RagBrowseResult> => {
	const searchParams = new URLSearchParams();
	if (path) searchParams.append('path', path);
	return jsonRequest(token, `/api/browse?${searchParams.toString()}`);
};

export const searchFiles = async (
	token: string,
	q: string
): Promise<{ results: { name: string; path: string; dir: string; size: number }[] }> => {
	const searchParams = new URLSearchParams();
	searchParams.append('q', q);
	return jsonRequest(token, `/api/search?${searchParams.toString()}`);
};

export const getPending = async (token: string): Promise<{ items: RagPendingItem[] }> => {
	return jsonRequest(token, '/api/pending');
};

export const createFolder = async (token: string, parent: string, name: string) => {
	return jsonRequest(token, '/api/create-folder', {
		method: 'POST',
		body: JSON.stringify({ parent, name })
	});
};

export const deleteItem = async (
	token: string,
	path: string
): Promise<{ status: string; removed_from_index: number }> => {
	return jsonRequest(token, `/api/delete/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
		method: 'DELETE'
	});
};

export const uploadFile = async (token: string, category: string, file: File) => {
	let error = null;

	const formData = new FormData();
	formData.append('category', category);
	formData.append('file', file);

	const res = await fetch(`${RAG_ADMIN_BASE_URL}/api/upload`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			authorization: `Bearer ${token}`
		},
		body: formData
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.json();
		})
		.catch((err) => {
			error = err?.detail ?? err;
			console.error(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return res;
};

export const clearDb = async (token: string): Promise<{ status: string; files_pending: number }> => {
	return jsonRequest(token, '/api/clear-db', { method: 'POST' });
};

export const startIngest = async (
	token: string,
	force: boolean = false,
	only_prefix: string | null = null
) => {
	return jsonRequest(token, '/api/ingest', {
		method: 'POST',
		body: JSON.stringify({ force, ...(only_prefix ? { only_prefix } : {}) })
	});
};

export const getIngestStatus = async (token: string): Promise<RagIngestStatus> => {
	return jsonRequest(token, '/api/ingest/status');
};

export const pauseIngest = async (token: string) => {
	return jsonRequest(token, '/api/ingest/pause', { method: 'POST' });
};

export const resumeIngest = async (token: string) => {
	return jsonRequest(token, '/api/ingest/resume', { method: 'POST' });
};

export const stopIngest = async (token: string) => {
	return jsonRequest(token, '/api/ingest/stop', { method: 'POST' });
};

const fetchBlob = async (token: string, path: string): Promise<Blob> => {
	let error = null;

	const blob = await fetch(`${RAG_ADMIN_BASE_URL}${path}`, {
		headers: {
			authorization: `Bearer ${token}`
		}
	})
		.then(async (res) => {
			if (!res.ok) throw await res.json();
			return res.blob();
		})
		.catch((err) => {
			error = err?.detail ?? err;
			console.error(err);
			return null;
		});

	if (error) {
		throw error;
	}

	return blob as Blob;
};

export const downloadFile = async (token: string, path: string, filename: string) => {
	const blob = await fetchBlob(token, `/api/download/${encodeURIComponent(path).replace(/%2F/g, '/')}`);

	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	window.URL.revokeObjectURL(url);
};

// `win` must come from a synchronous `window.open('', '_blank')` call made directly inside
// the click handler, otherwise the browser's popup blocker silently drops the empty-URL tab
// before this async blob fetch has a chance to point it anywhere.
export const viewFileInWindow = async (token: string, path: string, win: Window | null) => {
	const blob = await fetchBlob(token, `/api/view/${encodeURIComponent(path).replace(/%2F/g, '/')}`);
	const url = window.URL.createObjectURL(blob);

	if (win) {
		win.location.href = url;
	} else {
		window.open(url, '_blank');
	}
};
