<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props<T> extends HTMLSelectAttributes {
    items: { label: string; value: T }[];
    option?: Snippet<[label: string, value: T]>;
  }

  const { items, class: className, option, ...restProps }: Props<T> = $props();
</script>

<select
  {...restProps}
  class="w-full font-medium text-(--color-text-primary) px-3 py-2
       disabled:cursor-not-allowed border border-(--color-border-default)
       bg-(--color-bg-elevated) shadow-xs transition-all duration-200
       focus:ring-2 focus:ring-(--color-focus-ring) focus:border-(--color-border-focus)
       focus:bg-(--color-surface-active) focus:text-(--color-text-primary)
       {className ?? ''}"
>
  {#each items as { value, label } (label)}
    {#if option}
      {@render option(label, value)}
    {:else}
      {@const valueAsString =
        typeof value === 'object' ? JSON.stringify(value) : value}
      <option
        value={valueAsString}
        class="px-4 py-2.5 my-auto cursor-pointer flex items-center justify-between text-(--color-text-primary)
                   transition-colors duration-150 checked:bg-(--color-accent-subtle) checked:text-(--color-accent)
                   "
      >
        <span>{label}</span>
      </option>
    {/if}
  {/each}
</select>

<style>
  select,
  ::picker(select) {
    appearance: base-select;
  }
</style>
