<script lang="ts">
	import { EditPost } from '@dans-coding-world/blog-admin-features-posts-editor';
	import { createPostQuery } from '@dans-coding-world/blog-admin-data-access-operations';
	import { getAuth } from '$lib/shared/auth.svelte';

	import { page } from '$app/state';
	import { Forbidden, GenericError } from '@dans-coding-world/blog-admin-ui-errors';
	import { SpinnerLoader } from '@dans-coding-world/blog-admin-ui-common';
	import { toast } from '$lib/shared/toast.svelte';

	const postId = $derived(Number(page.params.id));

	const authStateManager = getAuth();
	const user = $derived(authStateManager.user);

	const postQuery = $derived.by(() =>
		Number.isInteger(postId) ? createPostQuery(postId) : undefined
	);

	const error = $derived(postQuery?.error);
	const post = $derived(postQuery?.data?.post);

	const canEditPost = $derived(
		Number.isInteger(postId) && user && post && (user.role === 'ADMIN' || post.authorId === user.id)
	);

	function onPostEdit(editedPost: typeof post) {
		toast.info(`Post #${editedPost?.id} saved`);
	}
</script>

<svelte:head>
	<title>Edit post</title>
</svelte:head>

{#if !Number.isInteger(postId)}
	<GenericError message={`Invalid post id: ${postId}`}></GenericError>
{:else if error}
	<GenericError statusCode={error.status ?? '500'} message={error.message}></GenericError>
{:else if !user || !post}
	<div class="mt-10 flex w-full flex-col items-center gap-5">
		<SpinnerLoader class="border-(--color-accent)!" loadingMessage="Loading post..."
		></SpinnerLoader>
		<p><i>Loading post...</i></p>
	</div>
{:else if !canEditPost}
	<Forbidden message="You do not have permission to edit this post"></Forbidden>
{:else if post}
	<EditPost {onPostEdit} {post}></EditPost>
{/if}
