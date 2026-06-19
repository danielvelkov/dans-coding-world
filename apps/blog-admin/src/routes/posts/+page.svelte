<script lang="ts">
	import { PostsManager } from '@dans-coding-world/blog-admin-features-posts-manager';
	import { mergePostQueryDefaults } from './util/merge-post-query-defaults';
	import { PostQueryParamsParser } from './util/post-query-param-parser';
	import { omitDefaultPostQueryParams } from './util/omit-default-post-query-params';
	import type { PostsManagerParams } from '@dans-coding-world/blog-admin-features-posts-manager';
	import { parseQueryString, stringifyToQueryString } from '@dans-coding-world/helpers';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

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
		await goto(`?${stringifyToQueryString(filteredValues)}`, { keepFocus: true });
	};
</script>

<svelte:head>
	<title>Your Posts</title>
</svelte:head>

<PostsManager {params} {onParamsChange} />
