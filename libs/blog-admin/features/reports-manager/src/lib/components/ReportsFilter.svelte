<script lang="ts">
  import type { GetReportsDto } from '@dans-coding-world/shared-report-dto';
  import type { ReportStatus } from '../shared/report-table.constants.js';
  import { MultiSelect } from '@dans-coding-world/blog-admin-ui-common';
  import { FILTER_OPTIONS } from '../shared/report-table.constants.js';

  interface Props {
    filters: Pick<NonNullable<GetReportsDto['filterBy']>, 'status'>;
    onChange: (filters: Props['filters']) => void;
  }

  const STATUS_VALUES = [
    'PENDING',
    'DISMISSED',
    'RESOLVED',
    'REVIEWING',
  ] as ReportStatus[];

  const { filters, onChange }: Props = $props();
  const { status: selectedStatus } = $derived(filters);
</script>

<label class="sr-only" for="filter-reports">Filter by:</label>
<MultiSelect
  id="filter-reports"
  placeholder="Select filtering by report status"
  class="shadow rounded-md w-full ml-1"
  items={FILTER_OPTIONS}
  onchange={(e) => {
    const selected = Array.from(e.currentTarget.selectedOptions).map(
      (o) => o.value,
    );

    const statusFilters = selected.filter((v) =>
      STATUS_VALUES.includes(v as ReportStatus),
    ) as ReportStatus[];

    // Guard: if a group would become empty,
    // restore previous selection for that group
    const finalStatus: ReportStatus[] =
      statusFilters.length === 0
        ? (selectedStatus ?? STATUS_VALUES)
        : statusFilters;

    // If we had to restore, re-sync the <select> element's DOM state
    if (statusFilters.length === 0) {
      Array.from(e.currentTarget.options).forEach((opt) => {
        opt.selected = finalStatus.includes(opt.value as ReportStatus);
      });
    }

    onChange({ status: finalStatus });
  }}
  data-testid="filter-reports"
  collapsedHeight="2.7em"
>
  {#snippet option(label, value)}
    {@const currentStatus = selectedStatus ?? []}

    {@const isLastInGroup =
      currentStatus.length === 1 &&
      currentStatus.includes(value as ReportStatus)}

    {@const selected = currentStatus.includes(value as ReportStatus)}

    <option
      class="p-[.8em] cursor-pointer bg-(--color-bg-surface)
        text-(--color-text-primary) checked:text-(--color-accent)
        checked:bg-(--color-accent-subtle)
        {isLastInGroup
        ? 'opacity-50 cursor-not-allowed'
        : 'hover:bg-(--color-bg-surface-hover)'}"
      title={isLastInGroup ? 'At least one must remain selected' : undefined}
      disabled={isLastInGroup}
      {selected}
      {value}
    >
      {label}
      {isLastInGroup ? ' *' : ''}
    </option>
  {/snippet}
</MultiSelect>
