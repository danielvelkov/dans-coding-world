<script lang="ts" generics="T extends Record<string, unknown>">
  import Button from './Button.svelte';
  import Modal from './Modal.svelte';

  type Props = {
    entityLabel: string;
    entity: (T & { id: number }) | null;
    displayKey: keyof T & string;
    onDelete?: (id: number) => void;
    onClose?: () => void;
  };

  let {
    entityLabel,
    entity = $bindable(),
    displayKey,
    onDelete,
    onClose,
  }: Props = $props();

  function handleClose() {
    entity = null;
    onClose?.();
  }

  function handleDelete() {
    if (entity) onDelete?.(entity.id);
    entity = null;
  }
</script>

<Modal open modalTitle="Confirm Delete" closedby="none" onClose={handleClose}>
  <div class="flex flex-col gap-6 max-w-sm">
    <div class="flex flex-col gap-2 text-sm text-(--color-text-secondary)">
      <p class="leading-relaxed">
        You are about to permanently delete this {entityLabel}:
      </p>

      <div
        class="bg-(--color-bg-surface-hover) border-l-4 border-(--color-error)
           rounded-r-md px-3 py-2.5 my-1"
      >
        <i
          class="not-italic font-medium text-(--color-text-primary) block
             truncate line-clamp-1"
          title={String(entity?.[displayKey])}
        >
          {entity?.[displayKey]}
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
        onclick={handleClose}
        class="px-4 py-2 text-sm font-medium rounded-md text-(--color-text-secondary)
           hover:bg-(--color-bg-surface-hover) active:bg-(--color-bg-surface-active)
            transition-colors"
      >
        Cancel
      </button>

      <Button
        onclick={handleDelete}
        class="disabled:bg-(--color-error-muted) hover:bg-(--color-error-muted) text-white
           font-medium px-4 py-2 rounded-md shadow-xs transition-colors text-sm"
      >
        Delete {entityLabel}
      </Button>
    </div>
  </div>
</Modal>
