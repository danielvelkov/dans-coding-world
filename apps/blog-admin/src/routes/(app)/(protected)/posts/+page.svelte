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
	import { getAuth } from '$lib/shared/auth.svelte';

	const authStateManager = getAuth();
	const user = $derived(authStateManager.user);
	const isAdmin = $derived(user?.role === 'ADMIN');

	const searchParams = $derived(page.url.searchParams);
	const rawParams = $derived(parseQueryString(searchParams.toString()));

	const params: PostsManagerParams = $derived.by(() => {
		const { success, error, data } = PostQueryParamsParser(isAdmin, user?.id).safeParse(rawParams);
		if (success)
			return mergePostQueryDefaults((data as PostsManagerParams) || {}, isAdmin, user?.id);
		// TODO: handle errors
		if (error) console.error(error);
		return;
	});

	const onParamsChange = async (newParams?: PostsManagerParams) => {
		const filteredValues = omitDefaultPostQueryParams(newParams ?? {}, isAdmin);
		const query = stringifyToQueryString(filteredValues);
		await goto(resolve(query ? `/posts?${query}` : '/posts'), { keepFocus: true });
	};

	const title = $derived(user && user.role === 'ADMIN' ? 'All Posts' : 'Your Posts');
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<PostsManager {params} {onParamsChange} loggedInUser={user ?? undefined} />
