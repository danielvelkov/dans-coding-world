<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {}

  let { children, value = $bindable(), ...props }: Props = $props();
</script>

<input
  {...props}
  bind:value
  class="w-full bg-transparent placeholder:text-(--color-text-tertiary)
   text-(--color-text-primary) text-sm border border-(--color-border-default) rounded-md
   px-3 py-2 transition duration-300 ease focus:outline-hidden
   focus:border-(--color-border-emphasis) hover:border-(--color-border-emphasis)
   shadow-xs focus:shadow-sm {props.class}"
/>
