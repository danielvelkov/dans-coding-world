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

<nav aria-label="pagination" class="flex justify-center">
  <ul class="flex gap-1">
    <li>
      <button
        class="flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="prev page"
        disabled={currentPage - 1 === 0}
        onclick={() => onPageSelect(currentPage - 1)}
      >
        <i class="fa fa-angle-double-left"></i>
      </button>
    </li>

    {#each Array.from({ length: totalPages }).map((_, i) => i) as i}
      <li>
        <button
          class="flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 aria-[current=page]:bg-blue-500 aria-[current=page]:text-white aria-[current=page]:border-cyan-500 font-medium"
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
        class="flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="next page"
        disabled={currentPage === totalPages}
        onclick={() => onPageSelect(currentPage + 1)}
      >
        <i class="fa fa-angle-double-right"></i>
      </button>
    </li>
  </ul>
</nav>
