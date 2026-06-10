<script lang="ts">
  let {
    values = [10, 20, 50, 100],
    currentValue,
    onChange,
  }: {
    values: number[];
    currentValue: number;
    onChange: (value: number) => void;
  } = $props();

  function handleChange(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    onChange(value);
  }
</script>

<select
  aria-label="Rows per page"
  class="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm
         focus:outline-none focus:ring-2 focus:ring-blue-500"
  onchange={handleChange}
>
  {#each values as v}
    <option value={v} selected={v === currentValue}>
      {v} rows
    </option>
  {/each}
</select>
