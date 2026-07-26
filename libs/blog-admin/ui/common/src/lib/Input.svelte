<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {}

  let { children, value = $bindable(), ...props }: Props = $props();
</script>

<input
  {...props}
  bind:value
  class="
    w-full bg-(--color-bg-elevated)
    placeholder:text-(--color-text-tertiary)
    text-(--color-text-primary) text-sm
    border border-(--color-border-default)
    rounded-md px-3 py-1.5
    transition duration-300 ease
    hover:border-(--color-border-emphasis)
    focus:outline-none focus-visible:outline-none
    focus:border-(--color-border-focus)
    shadow-xs focus:shadow-sm
    {props.class}
  "
/>
