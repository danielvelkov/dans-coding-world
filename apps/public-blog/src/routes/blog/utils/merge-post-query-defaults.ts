import { FetchPostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';

export const mergePostQueryDefaults = (
  params: FetchPostsQueryParams
): FetchPostsQueryParams => ({
  sortBy: { publishedAt: 'desc' },
  ...params,
  filterBy: {
    visibility: ['MEMBERS_ONLY', 'PUBLIC'],
    ...params.filterBy,
    status: ['PUBLISHED'],
  },
});
