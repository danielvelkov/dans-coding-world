<script lang="ts">
  import Select from './Select.svelte';

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

<Select
  value={currentValue}
  items={values.map((v) => ({ label: `${v} rows`, value: v }))}
  aria-label="Rows per page"
  class="px-3 py-2 border border-gray-300 rounded-sm bg-white text-sm
         focus:outline-none focus:ring-2 focus:ring-blue-500"
  onchange={handleChange}
></Select>
