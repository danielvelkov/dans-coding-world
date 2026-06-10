<script lang="ts">
  import { createPostsQuery } from '@dans-coding-world/blog-admin-data-access-operations';
  import PostsTable from './components/PostsTable.svelte';
  import {
    TablePaginationInfo,
    TablePagination,
  } from '@dans-coding-world/blog-admin-ui-common';
  import { createPaginationHandlers } from '@dans-coding-world/helpers';
  import { PAGINATION } from '@dans-coding-world/shared-constants';
  import type { UserDetail } from '@dans-coding-world/user-data-access';

  export type PostsManagerParams = Parameters<typeof createPostsQuery>[0];

  const {
    params,
    onParamsChange = () => {},
  }: {
    params?: PostsManagerParams;
    onParamsChange?: (value: PostsManagerParams) => void;
    loggedInUser?: UserDetail;
  } = $props();

  const postsQuery = $derived(createPostsQuery(params)); // closure needed for the query to update

  const isLoading = $derived(postsQuery.isLoading);
  const posts = $derived(postsQuery.data?.items ?? []);
  const error = $derived(postsQuery.error);
  const total = $derived(postsQuery.data?.pagination.total ?? 0);
  const currentPage = $derived(postsQuery.data?.pagination.page ?? 1);
  const itemsPerPage = $derived(
    postsQuery.data?.pagination.limit ??
      PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
  );
  const totalPages = $derived(Math.ceil(total / itemsPerPage));

  const { handlePageSelect } = $derived.by(() => {
    return createPaginationHandlers(params ?? {}, onParamsChange, {
      defaultPageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
    });
  });
</script>

<div class="space-y-6 p-4">
  <div class="flex justify-between items-center">
    <h2 class="text-3xl font-bold">Your Posts</h2>
    <!-- <CreatePostButton /> -->
  </div>

  <PostsTable {posts} {isLoading} error={error ?? undefined} />

  {#if total > itemsPerPage}
    <div class="flex justify-between items-center flex-wrap">
      <TablePaginationInfo {currentPage} {total} {itemsPerPage}
      ></TablePaginationInfo>
      <TablePagination
        {currentPage}
        {totalPages}
        onPageSelect={handlePageSelect}
      />
    </div>
  {/if}
</div>
