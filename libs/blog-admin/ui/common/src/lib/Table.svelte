<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';

  let {
    data,
    header,
    row,
    children,
  }: {
    data: T[];
    header: Snippet;
    row: Snippet<[T]>;
    children: Snippet<[]>;
  } = $props();
</script>

<table class="w-full table-auto text-left border border-gray-300">
  {#if header}
    <thead class="border-b border-gray-200 bg-gray-50 text-gray-700">
      <tr>
        {@render header()}
      </tr>
    </thead>
  {/if}

  {@render children()}

  <tbody class="divide-y divide-gray-200">
    {#each data as d (d)}
      {@render row(d)}
    {/each}
  </tbody>
</table>
