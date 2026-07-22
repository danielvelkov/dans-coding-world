<script lang="ts">
  import {
    createPostEditMutation,
    createTagsQuery,
  } from '@dans-coding-world/blog-admin-data-access-operations';
  import PostForm from './components/PostForm.svelte';
  import type { PostFull } from '@dans-coding-world/post-data-access';
  import type { EditSubmitData } from './types/submit-data.type.js';

  let postFormRef: ReturnType<typeof PostForm> | undefined = $state();

  const {
    post,
    onPostEdit,
  }: {
    post: PostFull;
    onPostEdit: (post: NonNullable<typeof editedPost>) => void;
  } = $props();

  const tagsQuery = $derived(createTagsQuery());
  const availableTags = $derived(tagsQuery.data?.items ?? []);
  const isLoadingTags = $derived(tagsQuery.isLoading);
  const tagsQueryError = $derived(tagsQuery.error);

  const createEditPostMutation = $derived(
    createPostEditMutation(post.id, { throwOnError: false }),
  );
  const reset = $derived(createEditPostMutation.reset);
  const mutate = $derived(createEditPostMutation.mutate);
  const editPostError = $derived(createEditPostMutation.error);
  const isSubmitting = $derived(createEditPostMutation.isPending);
  const editedPost = $derived(createEditPostMutation.data?.post);
</script>

<div class="flex items-center gap-3 mb-6">
  <h2 class="text-3xl font-bold">Edit post</h2>
  <span class="text-sm text-(--color-text-tertiary)">ID: {post.id}</span>
</div>

<PostForm
  bind:this={postFormRef}
  mode="edit"
  handleSubmit={(data) => {
    mutate(
      {
        ...data,
        title: data.title?.trim(),
        content: data.content?.replaceAll('&nbsp;', ' ').trim(),
        tags: (data.tags?.length ?? 0) > 0 ? data.tags : undefined,
        clearTags: data.tags?.length === 0,
      } as EditSubmitData,
      {
        onSuccess: (data) => {
          if (data?.post) {
            onPostEdit(data.post);
            reset();
          }
        },
        onSettled: () => {
          postFormRef?.reset();
        },
      },
    );
  }}
  isLoading={isSubmitting}
  apiError={editPostError ?? tagsQueryError ?? undefined}
  tagOptions={availableTags}
  postData={post}
  {isLoadingTags}
></PostForm>
