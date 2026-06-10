import { defaultParams } from './get-post-query-params-parser.js';
import type { PostsManagerParams } from '@dans-coding-world/blog-admin-features-posts-manager';

export function mergePostQueryDefaults(
	params: PostsManagerParams,
	isAdmin?: boolean,
	userId?: number
) {
	return {
		...defaultParams,
		...params,
		filterBy: {
			...defaultParams?.filterBy,
			...params?.filterBy,
			...(isAdmin !== undefined && !isAdmin && { userId: userId })
		}
	};
}
