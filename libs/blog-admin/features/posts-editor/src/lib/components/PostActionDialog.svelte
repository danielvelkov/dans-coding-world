<script lang="ts">
  import {
    Button,
    Modal,
    SpinnerLoader,
  } from '@dans-coding-world/blog-admin-ui-common';

  interface Props {
    modalTitle: string;
    postTitle: string;
    leadingMessage: string;
    supportingMessage: string;
    onClose: () => void;
    onConfirm?: () => void;
    isLoading?: boolean;
  }

  let {
    modalTitle,
    postTitle,
    leadingMessage,
    supportingMessage,
    onConfirm,
    onClose,
    isLoading,
  }: Props = $props();
</script>

<Modal open {modalTitle} closedby="none" {onClose}>
  <div class="flex flex-col gap-6 max-w-sm">
    <div class="flex flex-col gap-2 text-sm text-(--color-text-secondary)">
      <p class="leading-relaxed">
        {leadingMessage}
      </p>

      <div
        class="bg-(--color-bg-surface-hover) border-l-4 border-(--color-accent)
           rounded-r-md px-3 py-2.5 my-1"
      >
        <i
          class="not-italic font-medium text-(--color-text-primary) block
             truncate line-clamp-1"
          title={postTitle}
        >
          {postTitle}
        </i>
      </div>

      <p class="text-xs text-(--color-text-tertiary)">
        {supportingMessage}
      </p>
    </div>

    <div
      class="flex justify-end items-center gap-3 border-t
         border-(--color-border-subtle) pt-4"
    >
      <button
        type="button"
        onclick={() => {
          onClose();
        }}
        class="px-4 py-2 text-sm font-medium rounded-md text-(--color-text-secondary)
           hover:bg-(--color-bg-surface-hover) active:bg-(--color-bg-surface-active)
            transition-colors"
      >
        Cancel
      </button>

      <Button
        onclick={() => {
          if (!isLoading) onConfirm?.();
        }}
        class="flex flex-col items-center bg-(--color-accent) hover:bg-(--color-accent-hover) text-(--color-text-on-accent)
           font-medium px-4 py-2 rounded-md shadow-xs transition-colors text-sm min-w-20"
      >
        {#if isLoading}
          <SpinnerLoader></SpinnerLoader>
        {:else}
          Confirm
        {/if}
      </Button>
    </div>
  </div>
</Modal>
