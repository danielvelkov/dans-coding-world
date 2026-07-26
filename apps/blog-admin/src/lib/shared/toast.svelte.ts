export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
	id: string;
	type: ToastType;
	message: string;
	duration: number;
};

const DEFAULT_DURATION = 3000; // 3 seconds

let items: ToastItem[] = $state([]);

export const toasts = {
	get all() {
		return items;
	}
};

const add = (toast: Omit<ToastItem, 'id'>) => {
	const id = crypto.randomUUID();
	items = [...items, { ...toast, id }];
	return id;
};

export function dismiss(id: string) {
	items = items.filter((t) => t.id !== id);
}

export function dismissAll() {
	items = [];
}

export const toast = {
	success: (message: string, duration?: number) =>
		add({ type: 'success', message, duration: duration ?? DEFAULT_DURATION }),
	error: (message: string, duration?: number) =>
		add({ type: 'error', message, duration: duration ?? DEFAULT_DURATION }),
	info: (message: string, duration?: number) =>
		add({ type: 'info', message, duration: duration ?? DEFAULT_DURATION }),
	warning: (message: string, duration?: number) =>
		add({ type: 'warning', message, duration: duration ?? DEFAULT_DURATION })
};
