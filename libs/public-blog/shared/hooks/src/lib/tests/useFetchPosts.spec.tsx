import { waitFor } from '@testing-library/react';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { useFetchPosts } from '../posts/useFetchPosts.js';
import { renderReactQueryHook } from './helper/render-react-query-hook.js';
import {
  expectApiError,
  expectNetworkError,
} from './helper/test-fetch-hook-errors.js';
import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  ERROR_MESSAGES,
} from '@dans-coding-world/shared-constants';

const mockPostResponse = generateMockPostsResponse({ length: 5, pageSize: 5 });
vi.mock('@dans-coding-world/public-blog-data-access-api');

describe('useFetchPosts', () => {
  const renderUseFetchPostsHook = () => renderReactQueryHook(useFetchPosts);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns posts and pagination details on valid response from api', async () => {
    vi.mocked(api.get).mockResolvedValue(mockPostResponse);

    const { result } = renderUseFetchPostsHook();

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    const { data } = result.current;

    if (!data) throw new Error('Testing of data fetch failed');

    expect(data.pagination).toBe(mockPostResponse.data?.pagination);
    expect(data.items.length).toBe(mockPostResponse.data?.count);

    for (const post of data.items)
      expect(
        mockPostResponse.data?.items.map((i) => i.id).includes(post.id),
      ).toBe(true);
  });

  it('handles general errors', async () => {
    await expectNetworkError({
      renderHook: renderUseFetchPostsHook,
      apiMock: vi.mocked(api.get),
    });
  });

  it('returns error details from API response', async () => {
    const mockResponseErrorDetails: ResponseErrorDetails = {
      message: ERROR_MESSAGES[ERROR_CODES['SERVER'].INTERNAL_ERROR],
      status: ERROR_HTTP_STATUS[ERROR_CODES['SERVER'].INTERNAL_ERROR],
      errorCode: ERROR_CODES['SERVER'].INTERNAL_ERROR,
    };

    await expectApiError({
      renderHook: renderUseFetchPostsHook,
      apiMock: vi.mocked(api.get),
      error: mockResponseErrorDetails,
    });
  });
});
