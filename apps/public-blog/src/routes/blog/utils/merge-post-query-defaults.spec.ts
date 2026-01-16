import { FetchPostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';
import { mergePostQueryDefaults } from './merge-post-query-defaults';
describe('mergePostQueryDefaults()', () => {
  test.each([
    {},
    { filterBy: undefined },
    {
      filterBy: {
        status: ['ARCHIVED'],
      },
    },
    {
      filterBy: {
        status: ['DRAFT', 'ARCHIVED'],
      },
    },
    {
      sortBy: {
        publishedAt: 'desc',
      },
    },
  ] as FetchPostsQueryParams[])(
    'sets status filter to "PUBLISHED", even if params are "%s"',
    (params: FetchPostsQueryParams) => {
      const queryParams = mergePostQueryDefaults(params);
      expect(queryParams.filterBy?.status).toHaveLength(1);
      expect(queryParams.filterBy?.status).toEqual(
        expect.arrayContaining(['PUBLISHED'])
      );
    }
  );

  test.each([
    [{}, true],
    [{ filterBy: { status: ['ARCHIVED'] } }, true],
    [{ sortBy: undefined }, false],
    [
      {
        sortBy: {
          publishedAt: 'asc',
        },
      },
      false,
    ],
    [
      {
        sortBy: {
          publishedAt: 'desc',
          updatedAt: 'asc',
        },
      },
      false,
    ],
  ] as [FetchPostsQueryParams, boolean][])(
    'sets sorting by desc publishedDate, if params are "%s" (%s)',
    (params: FetchPostsQueryParams, isDefault: boolean) => {
      const queryParams = mergePostQueryDefaults(params);
      if (isDefault) expect(queryParams.sortBy?.publishedAt).toBe('desc');
      else expect(queryParams.sortBy).toBe(params.sortBy);
    }
  );

  test.each([
    [{}, true],
    [{ filterBy: { status: ['ARCHIVED'] } }, true],
    [{ filterBy: undefined }, true],
    [
      {
        sortBy: {
          publishedAt: 'asc',
        },
      },
      true,
    ],
    [
      {
        filterBy: {
          visibility: ['MEMBERS_ONLY'],
        },
      },
      false,
    ],
  ] as [FetchPostsQueryParams, boolean][])(
    'sets visibility filter to ["MEMBERS_ONLY", "PUBLIC"], if params are "%s" (%s)',
    (params: FetchPostsQueryParams, isDefault: boolean) => {
      const queryParams = mergePostQueryDefaults(params);
      if (isDefault)
        expect(queryParams.filterBy?.visibility).toEqual(
          expect.arrayContaining(['MEMBERS_ONLY', 'PUBLIC'])
        );
      else
        expect(queryParams.filterBy?.visibility).toBe(
          params.filterBy?.visibility
        );
    }
  );
});
