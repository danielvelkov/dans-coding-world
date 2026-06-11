<script lang="ts" generics="T">
  import type { HTMLSelectAttributes } from 'svelte/elements';

  interface Props<T> extends HTMLSelectAttributes {
    items: { label: string; value: T }[];
  }

  const { items, class: className, ...restProps }: Props<T> = $props();
</script>

<select
  {...restProps}
  class="group max-w-xs
         disabled:cursor-not-allowed
         {className ?? ''}"
>
  <button class="flex items-center justify-between w-full">
    <selectedcontent class="block truncate text-left"></selectedcontent>
  </button>

  {#each items as { value, label }}
    <option
      value={typeof value === 'object' ? JSON.stringify(value) : value}
      class="px-3 py-2 cursor-pointer text-gray-700
             hover:bg-gray-100
             focus:bg-blue-600 focus:text-white
             checked:bg-blue-50 checked:text-blue-700
             transition-colors duration-150"
    >
      <span>{label}</span>
    </option>
  {/each}
</select>

<style>
  select,
  ::picker(select) {
    appearance: base-select;
  }
</style>
