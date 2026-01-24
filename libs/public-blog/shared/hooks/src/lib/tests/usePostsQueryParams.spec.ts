import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  generateRandomString,
  stringifyToQueryString,
} from '@dans-coding-world/helpers';
import usePostsQueryParams from '../posts/usePostsQueryParams';
import { FetchPostsQueryParams } from '../types/fetchPostsQueryParams';
import {
  renderReactRouterHook,
  currentLocation,
  navigate,
} from './helper/render-react-router-hook';
import { defaultFilters } from '../posts/utils/merge-post-query-defaults';
import { POST_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { act } from '@testing-library/react';

describe('usePostsQueryParams()', () => {
  const renderPostsQueryParamsHook = (initialEntries?: string[]) =>
    renderReactRouterHook(usePostsQueryParams, initialEntries);

  const renderHookWithParamsInURL = (params?: object) => {
    const initialEntries = [
      `${API_ENDPOINTS.POSTS.LIST}?${stringifyToQueryString(params)}`,
    ];
    const {
      result: {
        current: { queryParams, setQueryParams },
      },
    } = renderPostsQueryParamsHook(initialEntries);
    return { queryParams, setQueryParams };
  };

  test.each([
    {
      pageOffset: 50,
      pageSize: 25,
    },
    {
      pageOffset: 30,
      pageSize: 10,
    },
    {
      filterBy: {
        year: 2001,
        tags: ['tag-1'],
      },
    },
    {
      sortBy: {
        publishedAt: 'asc',
      },
    },
    {
      searchQuery: 'Lorem',
    },
  ] as FetchPostsQueryParams[])(
    'returns query params from the current page URL (non-default) "%s"',
    (params: FetchPostsQueryParams) => {
      const { queryParams } = renderHookWithParamsInURL(params);
      // !!! toMatchObject is partial matching -
      // !!! meaning object matches a subset of the properties of an object
      expect(queryParams).toMatchObject(params);
      expect(currentLocation.search).toContain(stringifyToQueryString(params));
    }
  );

  test.each([
    [
      'wrong filterBy[visibility] option',
      {
        filterBy: {
          visibility: ['PUBLISHED'],
        },
      },
    ],
    [
      'repeating filterBy[visibility] option',
      {
        filterBy: {
          visibility: ['PUBLIC', 'PUBLIC'],
        },
      },
    ],
    [
      'option filterBy[status] is present with incorrect values',
      {
        filterBy: {
          status: ['PRIVATE'],
        },
      },
    ],
    [
      'option sortBy[publishedAt] has wrong value',
      {
        sortBy: {
          publishedAt: 'descending',
        },
      },
    ],
    [
      'pageSize has different value from the allowed options',
      {
        pageSize: 3,
      },
    ],
    [
      'page offset is not divisible by pageSize',
      {
        pageOffset: 23,
        pageSize: 10,
      },
    ],
    [
      'search query exceeds max allowed length',
      {
        searchQuery: generateRandomString(
          POST_CONSTRAINTS.MAX_TITLE_LENGTH + 1
        ),
      },
    ],
  ])(
    'returns to default query params and sanitizes URL when %s',
    (_, params) => {
      const { queryParams } = renderHookWithParamsInURL(params);
      expect(queryParams).toEqual(defaultFilters);
      expect(currentLocation.search).toBe('');
    }
  );

  it(`updates current URL after calling setQueryParams`, async () => {
    const params: FetchPostsQueryParams = {
      pageSize: 10,
      filterBy: { year: 200 },
    };
    const { setQueryParams } = renderHookWithParamsInURL();
    // act() makes sure all updates related to component have been processed
    //  and applied to the DOM before you make any assertions.
    await act(async () => {
      setQueryParams(params);
    });
    expect(currentLocation.search).toMatch(stringifyToQueryString(params));
  });

  it('sanitizes query params set by setQueryParams', async () => {
    const invalidParams: FetchPostsQueryParams = {
      filterBy: { visibility: ['PUBLIC', 'PUBLIC'] },
    };
    const { setQueryParams } = renderHookWithParamsInURL();
    await act(async () => {
      setQueryParams(invalidParams);
    });
    expect(currentLocation.search).toBe('');
  });

  it('renders correct query params and URL when navigating backwards', async () => {
    const params: FetchPostsQueryParams = {
      searchQuery: 'What Happened in 1975',
    };
    const { queryParams, setQueryParams } = renderHookWithParamsInURL(params);
    expect(queryParams).toMatchObject(params);
    await act(async () => {
      setQueryParams({ searchQuery: 'Ancient Aliens' });
    });
    expect(currentLocation.search).toContain('Ancient+Aliens');
    await act(async () => {
      navigate(-1);
    });
    expect(currentLocation.search).toContain(stringifyToQueryString(params));
  });

  it(`does not return the previously entered unsanitized URL on
     navigating backwards in the history stack`, async () => {
    const invalidParams: FetchPostsQueryParams = {
      filterBy: { visibility: ['PUBLIC', 'PUBLIC'] },
    };
    renderHookWithParamsInURL(invalidParams);
    await act(async () => {
      navigate(-1);
    });
    expect(currentLocation.search).toBe('');
  });
});
