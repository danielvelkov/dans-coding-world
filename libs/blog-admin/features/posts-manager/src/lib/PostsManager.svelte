<script lang="ts">
  import {
    createDeletePostMutation,
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
  const deletePostMutation = $derived(
    createDeletePostMutation({ throwOnError: false }),
  );
  const deletePostMutate = $derived(deletePostMutation.mutate);
  const deletePostError = $derived(deletePostMutation.error);
  const reset = $derived(deletePostMutation.reset);

  const isLoading = $derived(postsQueryResult.isLoading);
  const posts = $derived(postsQueryResult.data?.items ?? []);
  const getPostsError = $derived(postsQueryResult.error);
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

  const handlePostDelete = (id: number) => {
    reset();
    if (loggedInUser) {
      deletePostMutate({ authorId: loggedInUser?.id, postId: id });

      // Go to previous page if deleting last post on current page
      const isLastPost =
        posts.at(-1)?.id === id && posts.length === 1 && total > 1;
      if (isLastPost && params?.pageOffset && params.pageOffset > 0)
        onParamsChange({
          ...params,
          pageOffset:
            params.pageOffset -
            (params.pageSize ?? PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE),
        });
    }
  };
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
      {#if deletePostError}
        <div
          data-testid="deletion-error-message"
          class="p-2 self-start text-sm text-center text-(--color-error) bg-(--color-error-bg) rounded-md m-1"
        >
          <i class="fa fa-exclamation-circle mr-2"></i>
          {deletePostError.message}
        </div>
      {/if}
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
    {params}
    {onParamsChange}
    error={getPostsError ?? undefined}
    viewer={loggedInUser}
    onPostDelete={handlePostDelete}
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
