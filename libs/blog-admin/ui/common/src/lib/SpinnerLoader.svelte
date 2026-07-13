<script lang="ts">
  interface Props {
    loadingMessage?: string;
    class?: string;
  }
  const { class: className, loadingMessage }: Props = $props();
</script>

<div role="status">
  <div
    aria-hidden="true"
    class="aspect-square w-6 border-r-2 border-t border-(--color-text-on-accent) rounded-2xl animate-spin {className ??
      ''}"
  ></div>
  <span class="sr-only"> {loadingMessage ?? 'Loading...'}</span>
</div>
