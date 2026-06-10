<script lang="ts">
  let {
    currentPage,
    itemsPerPage,
    total,
  }: {
    currentPage: number;
    itemsPerPage: number;
    total: number;
  } = $props();

  const start = $derived(
    currentPage > 0 ? (currentPage - 1) * itemsPerPage + 1 : 1,
  );
  const end = $derived(Math.min(currentPage * itemsPerPage, total));
</script>

<span class="text-gray-600">
  {`Showing ${start} - ${end} of ${total} entries`}
</span>
