<script lang="ts">
  import { createPostsQuery } from '@dans-coding-world/blog-admin-data-access-operations';
  import PostsTable from './components/PostsTable.svelte';

  const postsQuery = createPostsQuery();

  const isLoading = $derived(postsQuery.isLoading);
  const posts = $derived(postsQuery.data?.items ?? []);
  const error = $derived(postsQuery.error);
  //   const total = $derived(postsQuery.data?.pagination.total ?? 0);
  //   const currentPage = $derived(postsQuery.data?.pagination.page ?? 1);
  //   const itemsPerPage = $derived(postsQuery.data?.pagination.limit ?? 10);
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h2 class="text-3xl font-bold">Your Posts</h2>
    <!-- <CreatePostButton /> -->
  </div>

  <PostsTable {posts} {isLoading} error={error ?? undefined} />

  <!-- {#if total > itemsPerPage}
   //TODO
    <Pagination
      {currentPage}
      totalPages={Math.ceil(total / itemsPerPage)}
      onPageChange={goToPage}
    />
  {/if} -->
</div>
