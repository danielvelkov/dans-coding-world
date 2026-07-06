<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLDialogAttributes } from 'svelte/elements';
  import { fade } from 'svelte/transition';

  interface Props extends HTMLDialogAttributes {
    modalTitle?: string;
    showCloseButton?: boolean;
    onClose?: () => void;
    children?: Snippet;
  }

  let {
    modalTitle = 'Modal Window',
    showCloseButton = true,
    onClose,
    children,
    ...restProps
  }: Props = $props();

  let dialogRef = $state<HTMLDialogElement | null>(null);

  function closeModal() {
    dialogRef?.close();
    onClose?.();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }
</script>

<dialog
  bind:this={dialogRef}
  {...restProps}
  aria-modal="true"
  class="fixed inset-0 z-99 m-0 grid h-full w-full place-items-center border-none bg-transparent p-0 backdrop:hidden"
>
  <div
    onclick={handleBackdropClick}
    aria-hidden="true"
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 bg-black/50"
  ></div>

  <div
    class="bg-(--color-bg-surface) text-(--color-text-primary) relative z-10 grid place-content-center rounded-xl"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      role="document"
      onclick={(e) => e.stopPropagation()}
      class="relative w-full p-6 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
    >
      <h2 class="mb-6 text-[1.4rem] font-bold leading-none">{modalTitle}</h2>

      {#if showCloseButton}
        <button
          onclick={closeModal}
          class="bg-(--color-bg-surface-hover) hover:text-(--color-accent) absolute top-4 right-4
           inline-flex h-8 w-8 items-center justify-center rounded-full border-none
            text-base cursor-pointer transition-colors duration-200"
          aria-label="Close dialog"
        >
          <i class="fa fa-close"></i>
        </button>
      {/if}

      {@render children?.()}
    </div>
  </div>
</dialog>
