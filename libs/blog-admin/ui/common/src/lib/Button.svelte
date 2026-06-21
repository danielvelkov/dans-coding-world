<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary';
  }

  const { children, ...props }: Props = $props();
</script>

<button
  {...props}
  class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded {props.class}"
>
  {@render children?.()}
</button>
