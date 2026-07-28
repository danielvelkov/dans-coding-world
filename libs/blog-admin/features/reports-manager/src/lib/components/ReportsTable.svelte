<script lang="ts">
  import { slide, fade } from 'svelte/transition';
  import {
    OMITTED_COLUMN_NAMES,
    REPORTS_EMPTY_MESSAGE,
    REPORTS_LOADING_MESSAGE,
    REPORTS_NO_RESULTS_MESSAGE,
    SORT_OPTIONS,
    TABLE_COLUMNS,
  } from '../shared/constants.js';
  import type { ReportSorting } from '../shared/constants.js';
  import type { ReportDetail } from '@dans-coding-world/report-data-access';
  import {
    formatDateTo_DD_MM_YYYY,
    toggleValue,
  } from '@dans-coding-world/helpers';
  import type { UserDetail } from '@dans-coding-world/user-data-access';
  import { Select, Table, Pill } from '@dans-coding-world/blog-admin-ui-common';
  import type { ReportsManagerParams } from '../types/reportsManagerParams.js';
  import ReportsFilter from './ReportsFilter.svelte';
  import ReportDeleteDialog from './ReportDeleteDialog.svelte';

  const blogURL = __PUBLIC_BLOG_URL__;

  interface Props {
    reports?: ReportDetail[];
    isLoading?: boolean;
    error?: Error;
    viewer?: Omit<UserDetail, 'password'>;
    params?: ReportsManagerParams;
    onParamsChange?: (value: ReportsManagerParams) => void;
    onReportDelete?: (id: number) => void;
  }

  const {
    reports = [],
    isLoading = false,
    error,
    viewer,
    params,
    onParamsChange,
    onReportDelete,
  }: Props = $props();

  let expandedRows = $state<ReportDetail['id'][]>([]);
  let reportForDeletion: ReportDetail | null = $state(null);

  const showEmptyMessage = $derived(reports.length === 0);
</script>

<div
  class="overflow-x-auto max-h-max min-h-fit sm:min-h-[50vh] sm:w-full w-[90vw]"
>
  <Table
    data={reports.map((report, rowIndex) => ({
      report,
      rowIndex: (params?.pageOffset ?? 0) + rowIndex,
    }))}
  >
    {#snippet header()}
      <tr class="bg-(--color-bg-surface-hover)">
        {#each TABLE_COLUMNS as col (col)}
          {@render ColumnHeader(col)}
        {/each}
      </tr>

      {@render ControlRow()}
    {/snippet}

    {#if isLoading}
      {@render MessageRow(
        REPORTS_LOADING_MESSAGE,
        'text-(--color-text-secondary) italic',
      )}
    {:else if error}
      {@render MessageRow(error.message, 'text-(--color-error) italic')}
    {:else if showEmptyMessage}
      {@const showNoResults =
        params?.filterBy?.maliciousUserId || params?.filterBy?.postId}
      {@render MessageRow(
        showNoResults ? REPORTS_NO_RESULTS_MESSAGE : REPORTS_EMPTY_MESSAGE,
        'text-(--color-text-secondary) italic',
      )}
    {/if}

    {#snippet row({ report, rowIndex })}
      {@render ReportRow(report, rowIndex)}
    {/snippet}
  </Table>
</div>

{#snippet ColumnHeader(col: (typeof TABLE_COLUMNS)[number])}
  {@const isVisible = !OMITTED_COLUMN_NAMES.includes(col)}
  {@const isCenterAligned = ['Created date'].includes(col)}

  <th
    class={`px-6 py-4 text-xs font-semibold tracking-wider text-(--color-text-secondary)
       uppercase border-b border-(--color-border-subtle)  ${
         isCenterAligned ? 'text-center' : 'text-left'
       }`}
  >
    {#if isVisible}
      {col}
    {/if}
  </th>
{/snippet}

{#snippet MessageRow(message: string, classOverride: string)}
  <tr class="bg-(--color-bg-surface)">
    <td
      colspan={TABLE_COLUMNS.length}
      class="px-4 py-12 text-center border-b border-(--color-border-subtle)"
    >
      <div class={classOverride}>
        {message}
      </div>
    </td>
  </tr>
{/snippet}

{#snippet ReportRow(report: ReportDetail, rowIndex: number)}
  {@const isExpanded = expandedRows.includes(report.id)}

  <tr
    in:fade
    aria-label={`Row entry #${rowIndex + 1}`}
    class="bg-(--color-bg-surface) border-b border-(--color-border-subtle)
    hover:bg-(--color-bg-surface-hover) group transition-colors"
    aria-expanded={isExpanded}
    aria-controls={`row-details-${report.id}`}
  >
    <!-- Expand/Collapse Button -->
    <td class="px-4 py-4 text-sm text-(--color-text-secondary)">
      <button
        class="p-1 w-5 rounded hover:bg-(--color-bg-surface-active)
         text-(--color-text-secondary) focus:outline-hidden focus:ring-2
          focus:ring-(--color-accent-hover)"
        aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        onclick={() => {
          expandedRows = toggleValue(expandedRows, report.id);
        }}
      >
        <i class={`fa fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
      </button>
    </td>

    <!-- Reason -->
    <td class="px-4 py-4">
      <div class="text-sm font-medium text-(--color-text-primary) max-w-[20ch]">
        {report.reason}
      </div>
    </td>

    <!-- Status -->
    <td class="px-4 py-4">
      <div class="flex flex-col space-y-1">
        <Pill class="text-xs font-semibold w-fit">
          {report.status.toUpperCase()}
        </Pill>
      </div>
    </td>

    <!-- Created Date -->
    <td class="px-4 py-4 text-sm text-(--color-text-secondary)">
      <div class="flex flex-col space-y-1">
        <time
          class="font-medium text-(--color-text-primary)"
          datetime={new Date(report.createdAt).toISOString()}
        >
          {formatDateTo_DD_MM_YYYY(new Date(report.createdAt))}
        </time>
      </div>
    </td>

    <!-- Actions -->
    <td class="px-4 py-4 text-sm font-medium">
      {#if viewer}
        {@const actionsDisabled =
          viewer?.role === 'MOD' && viewer.id === report.reportedComment.userId}
        <div class="flex space-x-3 flex-wrap">
          <a
            role={actionsDisabled ? 'link' : undefined}
            aria-disabled={actionsDisabled}
            href={actionsDisabled
              ? undefined
              : `/reports/comments/${report.id}`}
            class="text-(--color-link) hover:text-(--color-link-hover)"
          >
            View
          </a>
          <button
            disabled={actionsDisabled}
            onclick={() => {
              reportForDeletion = report;
            }}
            class="text-(--color-error) hover:text-(--color-error-muted)
           focus:outline-hidden cursor-pointer"
            aria-label="Delete report"
          >
            Delete
          </button>
        </div>
      {/if}
    </td>
  </tr>

  <!-- Expandable Details Row -->
  {#if isExpanded}
    <tr
      id={`row-details-${report.id}`}
      data-testid={`row-details-${report.id}`}
      class="bg-(--color-bg-surface-hover)"
    >
      <td colspan={TABLE_COLUMNS.length} class="px-0 py-0 w-0 min-w-full">
        <div class="p-2" transition:slide>
          {@render RowDetails(report)}
        </div>
      </td>
    </tr>
  {/if}
{/snippet}

{#snippet RowDetails(report: ReportDetail)}
  <div
    class="p-4 bg-(--color-bg-subtle) border-l-4
     border-(--color-warning-border) rounded-r-lg space-y-4"
  >
    <div
      class="flex flex-wrap items-center justify-between
       gap-2 pb-3 border-b border-(--color-border-subtle)"
    >
      <div
        class="flex items-center gap-3 text-sm text-(--color-text-secondary)"
      >
        <span
          class="font-mono bg-(--color-bg-surface)
           px-2 py-0.5 rounded border border-(--color-border-subtle)"
        >
          ID: {report.id}
        </span>
        <span>•</span>
        <span class="flex gap-2">
          Post ID:
          <button
            onclick={() =>
              onParamsChange?.({
                ...params,
                filterBy: {
                  ...params?.filterBy,
                  postId: report.reportedComment.postId,
                },
              })}
            class="text-(--color-link) hover:underline font-medium cursor-pointer"
          >
            #{report.reportedComment.postId}
          </button>
        </span>
      </div>

      <a
        href={`${blogURL}/blog/${report.reportedComment.postId}`}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 text-xs font-medium text-(--color-link) hover:underline"
      >
        <span>View Live Post</span>
        <i class="fa fa-external-link"></i>
      </a>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="sm:col-span-2 space-y-3">
        <div>
          <span
            class="text-xs font-bold uppercase tracking-wider
             text-(--color-warning)"
          >
            Report Reason
          </span>
          <p
            class="mt-1 text-sm text-(--color-text-primary) font-medium leading-relaxed"
          >
            {report.reason}
          </p>
        </div>

        <div>
          <span
            class="text-xs font-bold uppercase tracking-wider text-(--color-text-tertiary)"
          >
            Reported Comment
          </span>
          <blockquote
            class="mt-1 p-3 text-sm text-(--color-text-secondary) bg-(--color-bg-surface)
         border-l-2 border-(--color-border-emphasis) rounded-r italic wrap-break-word w-full"
          >
            "{report.reportedComment.content}"
          </blockquote>
        </div>
      </div>

      <div
        class="space-y-3 p-3 bg-(--color-bg-surface) rounded-md border border-(--color-border-subtle) text-xs"
      >
        <h6
          class="font-semibold text-(--color-text-primary) border-b border-(--color-border-subtle) pb-1"
        >
          User Context
        </h6>

        <div class="space-y-2">
          <div class="flex items-center justify-between gap-1">
            <span class="text-(--color-text-secondary)">Reported User:</span>
            <button
              onclick={() =>
                onParamsChange?.({
                  ...params,
                  filterBy: {
                    ...params?.filterBy,
                    maliciousUserId: report.reportedComment.userId,
                  },
                })}
              class="px-2 py-0.5 rounded bg-(--color-error-bg) text-(--color-error) font-mono font-medium hover:underline cursor-pointer"
            >
              User #{report.reportedComment.userId}
            </button>
          </div>
          <div class="flex items-center justify-between gap-1">
            <span class="text-(--color-text-secondary)">Reporter:</span>
            <button
              onclick={() =>
                onParamsChange?.({
                  ...params,
                  filterBy: {
                    ...params?.filterBy,
                    maliciousUserId: report.reporterId,
                  },
                })}
              class="px-2 py-0.5 rounded bg-(--color-info-bg) text-(--color-info) font-mono font-medium hover:underline cursor-pointer"
            >
              User #{report.reporterId}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/snippet}

{#snippet ControlRow()}
  <tr class="bg-(--color-bg-surface)">
    <th colspan="2"> </th>
    <th class="text-xs font-medium" scope="col" align="left">
      <ReportsFilter
        filters={{ ...params?.filterBy }}
        onChange={(filters) =>
          onParamsChange?.({
            ...params,
            filterBy: {
              ...params?.filterBy,
              status: filters.status,
            },
          })}
      ></ReportsFilter>
    </th>

    <th class="text-xs font-medium" scope="col">
      <label class="sr-only" for="sort-reports">Sort by:</label>
      <Select
        id="sort-reports"
        class="p-2 m-2 w-max border border-(--color-border-default) rounded-md"
        value={JSON.stringify(params?.sortBy)}
        onchange={(e) => {
          const value = e.currentTarget.value;
          const reportSorting = JSON.parse(value) as ReportSorting;
          onParamsChange?.({ ...params, sortBy: reportSorting });
        }}
        items={SORT_OPTIONS}
      ></Select>
    </th>
    <th align="center">
      {#if params?.filterBy?.postId}
        <div class="block text-xs text-(--color-text-secondary)">
          <div
            class="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 font-medium rounded-md bg-(--color-accent-subtle) text-(--color-accent) border border-(--color-border-subtle)"
          >
            <span class="max-w-30 truncate">
              {`Post #${params.filterBy.postId}`}
            </span>
            <button
              type="button"
              onclick={() => {
                onParamsChange?.({
                  ...params,
                  filterBy: { ...params.filterBy, postId: undefined },
                });
              }}
              class="p-0.5 rounded-sm hover:bg-(--color-bg-surface-active) text-(--color-accent) transition-colors focus:outline-hidden"
              title="Clear post filter"
              aria-label="Clear post filter"
            >
              <i class="fa fa-times text-[10px]"></i>
            </button>
          </div>
        </div>
      {/if}
    </th>
  </tr>
{/snippet}

{#if reportForDeletion}
  <ReportDeleteDialog bind:reportForDeletion {onReportDelete}
  ></ReportDeleteDialog>
{/if}
