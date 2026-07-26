<script lang="ts">
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { toasts, dismiss, type ToastType, type ToastItem } from './toast.svelte.js';
	import { SvelteMap } from 'svelte/reactivity';

	const ICONS: Record<ToastType, string> = {
		success: 'fa fa-check',
		error: 'fa fa-close',
		info: 'fa fa-info',
		warning: 'fa fa-exclamation'
	};

	const LABELS: Record<ToastType, string> = {
		success: 'Success',
		error: 'Error',
		info: 'Info',
		warning: 'Warning'
	};

	const TOAST_THEMES: Record<ToastType, { container: string; iconBg: string; text: string }> = {
		success: {
			container: 'border-l-(--color-success) bg-(--color-success-bg)',
			iconBg: 'bg-(--color-success)',
			text: 'text-(--color-success-muted)'
		},
		error: {
			container: 'border-l-(--color-error) bg-(--color-error-bg)',
			iconBg: 'bg-(--color-error)',
			text: 'text-(--color-error-muted)'
		},
		info: {
			container: 'border-l-(--color-info) bg-(--color-info-bg)',
			iconBg: 'bg-(--color-info)',
			text: 'text-(--color-info-muted)'
		},
		warning: {
			container: 'border-l-(--color-warning) bg-(--color-warning-bg)',
			iconBg: 'bg-(--color-warning)',
			text: 'text-(--color-warning-muted)'
		}
	};

	const timers = new SvelteMap<
		string,
		{ timeoutId: ReturnType<typeof setTimeout>; remaining: number; startedAt: number }
	>();

	function scheduleDismiss(item: ToastItem) {
		if (!item.duration || item.duration === Infinity) return;
		const timeoutId = setTimeout(() => {
			timers.delete(item.id);
			dismiss(item.id);
		}, item.duration);
		timers.set(item.id, { timeoutId, remaining: item.duration, startedAt: Date.now() });
	}

	$effect(() => {
		for (const item of toasts.all) {
			if (!timers.has(item.id)) scheduleDismiss(item);
		}
		const activeIds = new Set(toasts.all.map((t) => t.id));
		for (const [id, timer] of timers) {
			if (!activeIds.has(id)) {
				clearTimeout(timer.timeoutId);
				timers.delete(id);
			}
		}
	});
</script>

<div
	class="pointer-events-none fixed right-5 bottom-5 z-50 flex
	 w-full max-w-[min(90vw,250px)] flex-col gap-2.5 sm:max-w-sm md:max-w-md"
	role="status"
	aria-live="polite"
	aria-atomic="false"
>
	{#each toasts.all as item (item.id)}
		{@const theme = TOAST_THEMES[item.type]}
		<div
			class="w-fill pointer-events-auto flex items-center gap-3 rounded-xl border
			 border-l-4 border-(--color-border-subtle) p-3 shadow-lg backdrop-brightness-10
			  transition-all sm:p-4 md:gap-4 md:p-4.5 {theme.container}"
			in:fly={{ x: 110, easing: cubicOut }}
			out:fly
		>
			<span
				class="flex aspect-square h-5 shrink-0 items-center justify-center rounded-full
				 text-[10px] font-bold text-(--color-text-on-accent) sm:h-6 sm:w-6 sm:text-xs
				  md:h-7 md:w-7 md:text-sm {theme.iconBg}"
				aria-hidden="true"
			>
				<i class={ICONS[item.type]}></i>
			</span>

			<span
				class="sm:text-md min-w-0 flex-1 text-sm
				 font-semibold text-(--color-text-primary)"
			>
				{item.message}
			</span>

			<button
				type="button"
				class="flex shrink-0 items-center justify-center rounded-md p-1.5
				 text-(--color-text-secondary) transition-colors
				  hover:bg-(--color-bg-surface-hover) hover:text-(--color-text-primary)
				   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
				aria-label="Dismiss {LABELS[item.type].toLowerCase()} notification"
				onclick={() => dismiss(item.id)}
			>
				<i class="fa fa-close text-xs sm:text-sm md:text-base"></i>
			</button>
		</div>
	{/each}
</div>
