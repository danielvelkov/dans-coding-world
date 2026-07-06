import type { PostsManagerParams } from '@dans-coding-world/blog-admin-features-posts-manager';

function shouldResetPageOffset(oldParams: PostsManagerParams, newParams: PostsManagerParams) {
	return (
		JSON.stringify(oldParams?.filterBy) !== JSON.stringify(newParams?.filterBy) ||
		oldParams?.searchQuery !== newParams?.searchQuery
	);
}

export function resetParams(oldParams: PostsManagerParams, newParams: PostsManagerParams) {
	if (shouldResetPageOffset(oldParams, newParams) && newParams?.pageOffset !== undefined)
		newParams.pageOffset = 0;
	return newParams;
}
