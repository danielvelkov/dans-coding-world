<script lang="ts">
  import {
    createPostCreationMutation,
    createTagsQuery,
  } from '@dans-coding-world/blog-admin-data-access-operations';
  import PostForm from './components/PostForm.svelte';
  import type { CreateSubmitData } from './types/submit-data.type.js';

  let postFormRef: ReturnType<typeof PostForm> | undefined = $state();

  const {
    onPostCreated,
  }: { onPostCreated: (post: NonNullable<typeof createdPost>) => void } =
    $props();

  const tagsQuery = $derived(createTagsQuery());
  const availableTags = $derived(tagsQuery.data?.items ?? []);
  const isLoadingTags = $derived(tagsQuery.isLoading);
  const tagsQueryError = $derived(tagsQuery.error);

  const createPostMutation = $derived(
    createPostCreationMutation({ throwOnError: false }),
  );
  const reset = $derived(createPostMutation.reset);
  const mutate = $derived(createPostMutation.mutate);
  const createPostError = $derived(createPostMutation.error);
  const isSubmitting = $derived(createPostMutation.isPending);
  const createdPost = $derived(createPostMutation.data?.post);
</script>

<h2 class="text-3xl font-bold mb-5">Create post</h2>
<PostForm
  bind:this={postFormRef}
  mode="create"
  handleSubmit={(data) => {
    mutate(
      {
        ...data,
        title: data.title?.trim(),
        content: data.content?.trim(),
        tags: (data.tags?.length ?? 0) > 0 ? data.tags : undefined,
      } as CreateSubmitData,
      {
        onSuccess: (data) => {
          if (data?.post) {
            onPostCreated(data.post);
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
  apiError={tagsQueryError ?? createPostError ?? undefined}
  tagOptions={availableTags}
  {isLoadingTags}
></PostForm>
