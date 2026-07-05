<script lang="ts">
  import {
    createPostsQuery,
    createUsersQueryInfinite,
    debounceCallback,
  } from '@dans-coding-world/blog-admin-data-access-operations';
  import PostsTable from './components/PostsTable.svelte';
  import {
    TablePaginationInfo,
    TablePagination,
    TableItemsPerPageSelect,
  } from '@dans-coding-world/blog-admin-ui-common';
  import { createPaginationHandlers } from '@dans-coding-world/helpers';
  import { PAGINATION } from '@dans-coding-world/shared-constants';
  import type { UserDetail } from '@dans-coding-world/user-data-access';
  import type { PostsManagerParams } from './types/postsManagerParams.js';
  import AuthorFilter from './components/AuthorFilter.svelte';

  const {
    params,
    onParamsChange = () => {},
    loggedInUser,
  }: {
    params?: PostsManagerParams;
    onParamsChange?: (value: PostsManagerParams) => void;
    loggedInUser?: Omit<UserDetail, 'password'>;
  } = $props();

  let searchedUser = $state('');

  const postsQueryResult = $derived(createPostsQuery(params)); // closure needed for the query to update
  const usersQueryResult = $derived(
    createUsersQueryInfinite({
      sortBy: { username: 'asc' },
      searchQuery: searchedUser.length > 0 ? searchedUser : undefined,
    }),
  );

  const isLoading = $derived(postsQueryResult.isLoading);
  const posts = $derived(postsQueryResult.data?.items ?? []);
  const error = $derived(postsQueryResult.error);
  const total = $derived(postsQueryResult.data?.pagination.total ?? 0);
  const currentPage = $derived(postsQueryResult.data?.pagination.page ?? 1);
  const itemsPerPage = $derived(
    postsQueryResult.data?.pagination.limit ??
      PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
  );
  const totalPages = $derived(Math.ceil(total / itemsPerPage));

  const { handlePageSelect, handleItemsPerPageSelect } = $derived.by(() => {
    return createPaginationHandlers(params ?? {}, onParamsChange, {
      defaultPageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
    });
  });

  const isSearchingAuthor = $derived(
    usersQueryResult.isFetching && searchedUser.length > 0,
  );

  const handleSearchDebounced = debounceCallback(async (value: string) => {
    searchedUser = value;
  }, 300);
</script>

<div class="space-y-6 flex flex-col items-stretch mx-auto">
  <div class="flex flex-col gap-5">
    <h2 class="text-3xl font-bold">
      {#if loggedInUser && loggedInUser.role === 'ADMIN'}
        All
      {:else}Your
      {/if}
      Posts
    </h2>
    {#if loggedInUser}
      <!-- <CreatePostButton /> -->
      {#if loggedInUser.role === 'ADMIN'}
        <AuthorFilter
          handleSearch={(val) => {
            handleSearchDebounced(val);
          }}
          filters={{ userId: params?.filterBy?.userId }}
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
        ></AuthorFilter>
      {/if}
    {/if}
  </div>

  <PostsTable
    {posts}
    {isLoading}
    error={error ?? undefined}
    {params}
    {onParamsChange}
    viewer={loggedInUser}
  />

  {#if total > itemsPerPage}
    <div class="flex justify-between items-center-safe flex-wrap gap-5">
      <div class="flex flex-col gap-2">
        <TablePaginationInfo {currentPage} {total} {itemsPerPage}
        ></TablePaginationInfo>

        <TableItemsPerPageSelect
          currentValue={params?.pageSize ??
            PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE}
          values={[...PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS]}
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
