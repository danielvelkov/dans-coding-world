<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  interface Props extends HTMLAttributes<HTMLSpanElement> {}

  const { children, ...props }: Props = $props();
</script>

<span
  {...props}
  class="inline-flex items-center px-2.5 py-0.5 rounded-full
            bg-(--color-info-bg) text-(--color-info)
            border border-(--color-info-border) {props.class}"
>
  {@render children?.()}
</span>
