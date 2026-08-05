<script lang="ts">
  import {
    createDeleteReportMutation,
    createReportsQuery,
    createUsersQueryInfinite,
    debounceCallback,
  } from '@dans-coding-world/blog-admin-data-access-operations';
  import {
    TablePaginationInfo,
    TablePagination,
    TableItemsPerPageSelect,
  } from '@dans-coding-world/blog-admin-ui-common';
  import { createPaginationHandlers } from '@dans-coding-world/helpers';
  import { PAGINATION } from '@dans-coding-world/shared-constants';
  import type { UserDetail } from '@dans-coding-world/user-data-access';
  import type { ReportsManagerParams } from './types/reportsManagerParams.js';
  import ReportedUserFilter from './components/ReportedUserFilter.svelte';
  import ReportsTable from './components/ReportsTable.svelte';

  const {
    params,
    onParamsChange = () => {},
    loggedInUser,
    onReportDelete,
  }: {
    params?: ReportsManagerParams;
    onParamsChange?: (value: ReportsManagerParams) => void;
    loggedInUser?: Omit<UserDetail, 'password'>;
    onReportDelete: (report: { id: number }) => void;
  } = $props();

  let searchedUser = $state('');

  const reportsQueryResult = $derived(createReportsQuery(params));
  const usersQueryResult = $derived(
    createUsersQueryInfinite({
      sortBy: { username: 'asc' },
      searchQuery: searchedUser.length > 0 ? searchedUser : undefined,
    }),
  );
  const deleteReportMutation = $derived(
    createDeleteReportMutation({ throwOnError: false }),
  );
  const deleteReportMutate = $derived(deleteReportMutation.mutate);
  const deleteReportError = $derived(deleteReportMutation.error);
  const reset = $derived(deleteReportMutation.reset);

  const isLoading = $derived(reportsQueryResult.isLoading);
  const reports = $derived(reportsQueryResult.data?.items ?? []);
  const getReportsError = $derived(reportsQueryResult.error);
  const total = $derived(reportsQueryResult.data?.pagination.total ?? 0);
  const currentPage = $derived(reportsQueryResult.data?.pagination.page ?? 1);
  const itemsPerPage = $derived(
    reportsQueryResult.data?.pagination.limit ??
      PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
  );
  const totalPages = $derived(Math.ceil(total / itemsPerPage));

  const { handlePageSelect, handleItemsPerPageSelect } = $derived.by(() => {
    return createPaginationHandlers(params ?? {}, onParamsChange, {
      defaultPageSize: PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
    });
  });

  const isSearchingAuthor = $derived(
    usersQueryResult.isFetching && searchedUser.length > 0,
  );

  const handleSearchDebounced = debounceCallback(async (value: string) => {
    searchedUser = value;
  }, 300);

  const handleReportDelete = (id: number) => {
    reset();
    if (loggedInUser) {
      deleteReportMutate(
        { reportId: id },
        {
          onSuccess: () => {
            onReportDelete({ id });
          },
        },
      );
      // Go to previous page if deleting last report on current page
      const isLastReport =
        reports.at(-1)?.id === id && reports.length === 1 && total > 1;
      if (isLastReport && params?.pageOffset && params.pageOffset > 0)
        onParamsChange({
          ...params,
          pageOffset:
            params.pageOffset -
            (params.pageSize ?? PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE),
        });
    }
  };
</script>

<div class="space-y-6 flex flex-col items-stretch mx-auto lg:px-20 w-full">
  <div class="flex flex-col gap-5">
    <h2 class="text-3xl font-bold">Reports</h2>
    {#if loggedInUser}
      {#if deleteReportError}
        <div
          data-testid="deletion-error-message"
          class="p-2 self-start text-sm text-center text-(--color-error) bg-(--color-error-bg) rounded-md m-1"
        >
          <i class="fa fa-exclamation-circle mr-2"></i>
          {deleteReportError.message}
        </div>
      {/if}
      {#if loggedInUser.role === 'ADMIN'}
        <ReportedUserFilter
          handleSearch={(val) => {
            handleSearchDebounced(val);
          }}
          filters={{ maliciousUserId: params?.filterBy?.maliciousUserId }}
          onChange={(val) =>
            onParamsChange({
              ...params,
              filterBy: { ...params?.filterBy, ...val },
            })}
          queryData={usersQueryResult}
          loadNext={async () => {
            await usersQueryResult.fetchNextPage();
          }}
          isSearching={isSearchingAuthor}
        ></ReportedUserFilter>
      {:else if params?.filterBy?.maliciousUserId}
        <div
          class="flex items-center gap-2 mt-1.5 text-xs text-(--color-text-secondary)"
        >
          <span>Show reports for:</span>
          <div
            class="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 font-medium rounded-md bg-(--color-accent-subtle) text-(--color-accent) border border-(--color-border-subtle)"
          >
            <span class="max-w-30 truncate">
              {`User #${params.filterBy.maliciousUserId}`}
            </span>
            <button
              type="button"
              onclick={() =>
                onParamsChange({
                  ...params,
                  filterBy: { ...params.filterBy, maliciousUserId: undefined },
                })}
              class="p-0.5 rounded-sm hover:bg-(--color-bg-surface-active) text-(--color-accent) transition-colors focus:outline-hidden"
              title="Clear user filter"
              aria-label="Clear user filter"
            >
              <i class="fa fa-times text-[10px]"></i>
            </button>
          </div>
        </div>
      {/if}
      {#if params?.filterBy?.postId}
        <div
          class="flex gap-2 items-center text-xs text-(--color-text-secondary)"
        >
          <span>For post:</span>
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
    {/if}
  </div>

  <ReportsTable
    {reports}
    {isLoading}
    {params}
    {onParamsChange}
    error={getReportsError ?? undefined}
    viewer={loggedInUser}
    onReportDelete={handleReportDelete}
  />

  {#if total > itemsPerPage}
    <div class="flex justify-between items-center-safe flex-wrap gap-5">
      <div class="flex flex-col gap-2">
        <TablePaginationInfo {currentPage} {total} {itemsPerPage}
        ></TablePaginationInfo>

        <TableItemsPerPageSelect
          currentValue={params?.pageSize ??
            PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE}
          values={[...PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS]}
          onChange={handleItemsPerPageSelect}
        ></TableItemsPerPageSelect>
      </div>

      <TablePagination
        {currentPage}
        {totalPages}
        onPageSelect={handlePageSelect}
      />
    </div>
  {/if}
</div>
