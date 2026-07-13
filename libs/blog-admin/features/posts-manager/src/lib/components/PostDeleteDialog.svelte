<script lang="ts">
  import { Button, Modal } from '@dans-coding-world/blog-admin-ui-common';
  import type { PostFull } from '@dans-coding-world/post-data-access';

  interface Props {
    postForDeletion: PostFull | null;
    onPostDelete?: (id: number) => void;
  }

  let { postForDeletion = $bindable(), onPostDelete }: Props = $props();
</script>

<Modal
  modalTitle={'Confirm Delete'}
  onClose={() => {
    postForDeletion = null;
  }}
>
  <div class="flex flex-col gap-6 max-w-sm">
    <div class="flex flex-col gap-2 text-sm text-(--color-text-secondary)">
      <p class="leading-relaxed">
        You are about to permanently delete this post:
      </p>

      <div
        class="bg-(--color-bg-surface-hover) border-l-4 border-(--color-error)
           rounded-r-md px-3 py-2.5 my-1"
      >
        <i
          class="not-italic font-medium text-(--color-text-primary) block
             truncate line-clamp-1"
          title={postForDeletion?.title}
        >
          {postForDeletion?.title}
        </i>
      </div>

      <p class="text-xs text-(--color-text-tertiary)">
        This action cannot be undone.
      </p>
    </div>

    <div
      class="flex justify-end items-center gap-3 border-t
         border-(--color-border-subtle) pt-4"
    >
      <button
        type="button"
        onclick={() => {
          postForDeletion = null;
        }}
        class="px-4 py-2 text-sm font-medium rounded-md text-(--color-text-secondary)
           hover:bg-(--color-bg-surface-hover) active:bg-(--color-bg-surface-active)
            transition-colors"
      >
        Cancel
      </button>

      <Button
        onclick={() => {
          if (postForDeletion) onPostDelete?.(postForDeletion.id);
          postForDeletion = null;
        }}
        class="bg-(--color-error) hover:bg-(--color-error-hover) text-(--color-text-primary)
           font-medium px-4 py-2 rounded-md shadow-xs transition-colors text-sm"
      >
        Delete Post
      </Button>
    </div>
  </div>
</Modal>
