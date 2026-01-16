import { FetchPostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';
import { stripDefaultPostQueryParams } from './strip-default-post-query-params';
import { PostVisibility } from '@dans-coding-world/prisma-schema';

describe('stripDefaultPostQueryParams()', () => {
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
    'removes default param filterBy.status always',
    (params) => {
      const filteredQueryParams = stripDefaultPostQueryParams(params);
      expect(filteredQueryParams.filterBy?.status).toBeUndefined();
    }
  );

  test.each(['MEMBERS_ONLY', 'PUBLIC'])(
    'keeps visibility filter when only %s',
    (visibility) => {
      const filteredQueryParams = stripDefaultPostQueryParams({
        filterBy: {
          visibility: [visibility] as PostVisibility[],
        },
      });
      expect(filteredQueryParams.filterBy?.visibility).toStrictEqual([
        visibility,
      ]);
    }
  );

  it('removes visibility filter when both MEMBERS_ONLY and PUBLIC', () => {
    const filteredQueryParams = stripDefaultPostQueryParams({
      filterBy: {
        visibility: ['MEMBERS_ONLY', 'PUBLIC'],
      },
    });
    expect(filteredQueryParams.filterBy?.visibility).toBeUndefined();
  });

  test.each([
    {
      sortBy: {
        updatedAt: 'asc',
      },
    },
    {
      sortBy: {
        updatedAt: 'desc',
      },
    },
    {
      sortBy: {
        publishedAt: 'asc',
      },
    },
  ] as FetchPostsQueryParams[])(
    `keeps any other sort aside from publishedAt desc sort`,
    (params) => {
      const filteredQueryParams = stripDefaultPostQueryParams(params);
      expect(filteredQueryParams.sortBy).toStrictEqual(params.sortBy);
    }
  );

  it(`removes publishedAt desc sort`, () => {
    const filteredQueryParams = stripDefaultPostQueryParams({
      sortBy: {
        publishedAt: 'desc',
      },
    });
    expect(filteredQueryParams.sortBy?.publishedAt).toBeUndefined();
  });
});
