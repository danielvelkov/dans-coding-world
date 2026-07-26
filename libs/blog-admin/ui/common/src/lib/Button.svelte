<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary';
  }

  const { children, ...props }: Props = $props();
</script>

<button
  {...props}
  class="bg-(--color-accent) text-(--color-text-on-accent) transition-colors rounded-xl
   hover:bg-(--color-accent-hover) disabled:bg-(--color-accent-muted) font-bold py-2 px-4 {props.class}"
>
  {@render children?.()}
</button>
