import { FetchPostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';

export const mergePostQueryDefaults = (
  params: FetchPostsQueryParams
): FetchPostsQueryParams => ({
  ...defaultFilters,
  ...params,
  filterBy: {
    ...defaultFilters.filterBy,
    ...params.filterBy,
    status: defaultFilters.filterBy?.status, // Always set
  },
});

export const defaultFilters: FetchPostsQueryParams = {
  filterBy: {
    status: ['PUBLISHED'],
    visibility: ['MEMBERS_ONLY', 'PUBLIC'],
  },
  sortBy: { publishedAt: 'desc' },
};
