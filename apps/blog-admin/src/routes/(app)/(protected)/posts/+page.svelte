<script lang="ts">
	import { PostsManager } from '@dans-coding-world/blog-admin-features-posts-manager';
	import type { PostsManagerParams } from '@dans-coding-world/blog-admin-features-posts-manager';
	import { parseQueryString, stringifyToQueryString } from '@dans-coding-world/helpers';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { mergePostQueryDefaults } from '$lib/util/posts/merge-post-query-defaults';
	import PostQueryParamsParser from '$lib/util/posts/post-query-param-parser';
	import { omitDefaultPostQueryParams } from '$lib/util/posts/omit-default-post-query-params';

	// TODO
	const isAdmin = false;

	const searchParams = $derived(page.url.searchParams);
	const rawParams = $derived(parseQueryString(searchParams.toString()));

	const params: PostsManagerParams = $derived.by(() => {
		const { success, error, data } = PostQueryParamsParser().safeParse(rawParams);
		if (success) return mergePostQueryDefaults((data as PostsManagerParams) || {}, isAdmin);
		// TODO: handle errors
		if (error) console.error(error);
		return;
	});

	const onParamsChange = async (newParams?: PostsManagerParams) => {
		const filteredValues = omitDefaultPostQueryParams(newParams ?? {}, isAdmin);
		const query = stringifyToQueryString(filteredValues);
		await goto(resolve(query ? `/posts?${query}` : '/posts'), { keepFocus: true });
	};
</script>

<svelte:head>
	<title>Your Posts</title>
</svelte:head>

<PostsManager {params} {onParamsChange} />
