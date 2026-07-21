<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  interface Props extends HTMLAttributes<HTMLSpanElement> {
    deletable?: boolean;
    onDelete?: () => void;
  }

  const { children, deletable, onDelete, ...props }: Props = $props();
</script>

<span
  {...props}
  class="inline-flex gap-1.5 items-baseline px-2.5 py-0.5 rounded-md
    bg-(--color-info-bg) text-(--color-info)
    {props.class} text-sm"
>
  {@render children?.()}
  {#if deletable}
    <button
      onclick={onDelete}
      class="text-sm inline-flex h-fit aspect-square items-center
      justify-center border-none cursor-pointer"
      aria-label="Remove"
    >
      <i class="fa fa-close hover:text-(--color-error)"></i>
    </button>
  {/if}
</span>
