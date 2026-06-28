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

<table class="w-full table-auto text-left border">
  {#if header}
    <thead
      class="border-b border-(--color-border-emphasis) text-(--color-text-secondary)"
    >
      {@render header()}
    </thead>
  {/if}

  {@render children()}

  <tbody class="divide-y divide-(--color-border-emphasis)">
    {#each data as d (d)}
      {@render row(d)}
    {/each}
  </tbody>
</table>
