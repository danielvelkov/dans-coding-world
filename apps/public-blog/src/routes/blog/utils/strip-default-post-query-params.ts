import { FetchPostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';

export const stripDefaultPostQueryParams = (
  value: NonNullable<FetchPostsQueryParams>
) => {
  const filteredValues = {
    ...value,
    sortBy: value.sortBy ? { ...value.sortBy } : undefined,
    filterBy: value.filterBy ? { ...value.filterBy } : undefined,
  };

  if (filteredValues.sortBy?.publishedAt === 'desc')
    delete filteredValues.sortBy.publishedAt;
  if (filteredValues.filterBy?.status) delete filteredValues.filterBy.status;
  if (
    filteredValues.filterBy?.visibility?.includes('MEMBERS_ONLY') &&
    filteredValues.filterBy?.visibility?.includes('PUBLIC')
  )
    delete filteredValues.filterBy.visibility;
  return filteredValues;
};
