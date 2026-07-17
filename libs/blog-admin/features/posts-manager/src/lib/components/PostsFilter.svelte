<script lang="ts">
  import type { GetPostsDto } from '@dans-coding-world/shared-post-dto';
  import type { PostStatus, PostVisibility } from '../shared/constants.js';
  import { MultiSelect } from '@dans-coding-world/blog-admin-ui-common';
  import { FILTER_OPTIONS } from '../shared/constants.js';

  interface Props {
    filters: Pick<
      NonNullable<GetPostsDto['filterBy']>,
      'status' | 'visibility'
    >;
    onChange: (filters: Props['filters']) => void;
  }

  const STATUS_VALUES = ['ARCHIVED', 'DRAFT', 'PUBLISHED'] as PostStatus[];
  const VISIBILITY_VALUES = ['PUBLIC', 'MEMBERS_ONLY'] as PostVisibility[];

  const { filters, onChange }: Props = $props();
  const { status: selectedStatus, visibility: selectedVisibility } =
    $derived(filters);
</script>

<label class="sr-only" for="filter-posts">Filter by:</label>
<MultiSelect
  id="filter-posts"
  placeholder="Select filtering by post status/visibility"
  class="shadow rounded-md w-full ml-1"
  items={FILTER_OPTIONS}
  onchange={(e) => {
    const selected = Array.from(e.currentTarget.selectedOptions).map(
      (o) => o.value,
    );

    const statusFilters = selected.filter((v) =>
      STATUS_VALUES.includes(v as PostStatus),
    ) as PostStatus[];

    const visibilityFilters = selected.filter((v) =>
      VISIBILITY_VALUES.includes(v as PostVisibility),
    ) as PostVisibility[];

    // Guard: if a group would become empty,
    // restore previous selection for that group
    const finalStatus: PostStatus[] =
      statusFilters.length === 0
        ? (selectedStatus ?? STATUS_VALUES)
        : statusFilters;

    const finalVisibility: PostVisibility[] =
      visibilityFilters.length === 0
        ? (selectedVisibility ?? VISIBILITY_VALUES)
        : visibilityFilters;

    // If we had to restore, re-sync the <select> element's DOM state
    const allFinal = [...finalStatus, ...finalVisibility];
    if (statusFilters.length === 0 || visibilityFilters.length === 0) {
      Array.from(e.currentTarget.options).forEach((opt) => {
        opt.selected = allFinal.includes(
          opt.value as PostVisibility | PostStatus,
        );
      });
    }

    onChange({ status: finalStatus, visibility: finalVisibility });
  }}
  data-testid="filter-posts"
  collapsedHeight="2.7em"
>
  {#snippet option(label, value)}
    {@const isStatus = STATUS_VALUES.includes(value as PostStatus)}
    {@const isVisibility = VISIBILITY_VALUES.includes(value as PostVisibility)}

    {@const currentStatus = selectedStatus ?? []}
    {@const currentVisibility = selectedVisibility ?? []}

    {@const isLastInGroup =
      (isStatus &&
        currentStatus.length === 1 &&
        currentStatus.includes(value as PostStatus)) ||
      (isVisibility &&
        currentVisibility.length === 1 &&
        currentVisibility.includes(value as PostVisibility))}

    {@const selected =
      currentStatus.includes(value as PostStatus) ||
      currentVisibility.includes(value as PostVisibility)}

    <option
      class="p-[.8em] cursor-pointer bg-(--color-bg-surface)
        {isStatus ? 'border-l-3 border-(--color-info) pl-3' : ''}
        {isVisibility ? 'border-l-3 border-(--color-link) pl-3' : ''}
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
