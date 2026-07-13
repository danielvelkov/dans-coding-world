import type { PostsManagerParams } from '@dans-coding-world/blog-admin-features-posts-manager';

export const omitDefaultPostQueryParams = (
	value: NonNullable<PostsManagerParams>,
	isAdmin: boolean
) => {
	const filteredValues = {
		...value,
		sortBy: value.sortBy ? { ...value.sortBy } : undefined,
		filterBy: value.filterBy ? { ...value.filterBy } : undefined
	};

	if (filteredValues.sortBy?.publishedAt === 'desc') delete filteredValues.sortBy.publishedAt;
	if (
		filteredValues.filterBy?.status?.includes('ARCHIVED') &&
		filteredValues.filterBy?.status?.includes('DRAFT') &&
		filteredValues.filterBy?.status?.includes('PUBLISHED')
	)
		delete filteredValues.filterBy.status;
	if (
		filteredValues.filterBy?.visibility?.includes('MEMBERS_ONLY') &&
		filteredValues.filterBy?.visibility?.includes('PUBLIC')
	)
		delete filteredValues.filterBy.visibility;
	if (!isAdmin) delete filteredValues.filterBy?.userId;
	if (filteredValues.pageOffset !== undefined && filteredValues.pageOffset === 0)
		delete filteredValues.pageOffset;

	return filteredValues;
};
