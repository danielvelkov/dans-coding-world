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
  class="w-full font-medium text-gray-700
       disabled:cursor-not-allowed border border-gray-200
        bg-white shadow-sm transition-all duration-200 focus:ring-2
         focus:ring-blue-500 focus:outline-none
             {className ?? ''}"
>
  {#each items as { value, label }}
    {#if option}
      {@render option(label, value)}
    {:else}
      {@const valueAsString =
        typeof value === 'object' ? JSON.stringify(value) : value}
      <option
        value={valueAsString}
        class="px-4 py-2.5 my-auto cursor-pointer text-gray-700 flex items-center justify-between
                   hover:bg-gray-100
                   focus:bg-blue-600 focus:text-white
                   checked:bg-blue-50 checked:text-blue-700
                   transition-colors duration-150"
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
