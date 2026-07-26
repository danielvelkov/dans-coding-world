<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    checked?: boolean;
  }

  let { checked = $bindable(false), ...props }: Props = $props();
</script>

<!-- Fun fact: Clicking a label automagically toggles the input inside  -->
<label class="w-fit relative inline cursor-pointer">
  <input
    {...props}
    type="checkbox"
    bind:checked
    class="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer"
  />
  <div
    class="peer h-6 w-11 rounded-full bg-(--color-bg-surface)
     transition-colors border-2
     peer-checked:bg-(--color-accent)"
  ></div>
  <div
    class="absolute top-1 left-1 h-4 w-4 rounded-full
     bg-(--color-bg-surface-active) transition-all peer-checked:translate-x-5"
  ></div>
</label>
