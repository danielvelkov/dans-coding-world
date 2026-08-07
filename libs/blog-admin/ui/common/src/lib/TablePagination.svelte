<script lang="ts">
  let {
    totalPages,
    currentPage,
    onPageSelect,
  }: {
    totalPages: number;
    currentPage: number;
    onPageSelect: (page: number) => void;
  } = $props();
</script>

<nav aria-label="pagination" class="flex justify-center mt-6">
  <ul class="flex gap-1.5 flex-wrap">
    <li>
      <button
        class="flex items-center justify-center w-9 h-9 rounded-md border border-(--color-border-default) text-(--color-text-secondary) bg-(--color-bg-surface) hover:bg-(--color-bg-surface-hover) hover:text-(--color-text-primary) transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-(--color-focus-ring)"
        aria-label="prev page"
        disabled={currentPage - 1 === 0}
        onclick={() => onPageSelect(currentPage - 1)}
      >
        <i class="fa fa-angle-double-left text-sm"></i>
      </button>
    </li>

    {#each Array.from({ length: totalPages }).map((_, i) => i) as i}
      <li>
        <button
          class="flex items-center justify-center w-9 h-9 rounded-md border border-(--color-border-default) text-(--color-text-secondary) bg-(--color-bg-surface) font-medium transition-all duration-200 hover:bg-(--color-bg-surface-hover) hover:text-(--color-text-primary) focus:outline-hidden focus:ring-2 focus:ring-(--color-focus-ring) aria-[current=page]:bg-(--color-accent) aria-[current=page]:text-(--color-text-on-accent) aria-[current=page]:border-(--color-border-focus) aria-[current=page]:shadow-xs"
          aria-current={i + 1 === currentPage ? 'page' : undefined}
          onclick={() => onPageSelect(i + 1)}
          aria-label={`page ${i + 1}`}
        >
          <span class="sr-only">page </span>
          {i + 1}
        </button>
      </li>
    {/each}

    <li>
      <button
        class="flex items-center justify-center w-9 h-9 rounded-md border border-(--color-border-default) text-(--color-text-secondary) bg-(--color-bg-surface) hover:bg-(--color-bg-surface-hover) hover:text-(--color-text-primary) transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-(--color-focus-ring)"
        aria-label="next page"
        disabled={currentPage === totalPages}
        onclick={() => onPageSelect(currentPage + 1)}
      >
        <i class="fa fa-angle-double-right text-sm"></i>
      </button>
    </li>
  </ul>
</nav>
