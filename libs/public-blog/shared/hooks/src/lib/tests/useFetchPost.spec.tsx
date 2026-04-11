import { waitFor } from '@testing-library/react';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { generateMockPostResponse } from '@dans-coding-world/shared-post-testing';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { useFetchPost } from '../posts/useFetchPost.js';
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

const mockPostResponse = generateMockPostResponse({});
vi.mock('@dans-coding-world/shared-data-access-api');

describe('useFetchPost', () => {
  const renderUseFetchPostsHook = () =>
    renderReactQueryHook(() => {
      if (!mockPostResponse.data) throw new Error('Missing data');
      return useFetchPost(mockPostResponse.data.post.id);
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns post details on valid response from api', async () => {
    vi.mocked(api.get).mockResolvedValue(mockPostResponse);

    const { result } = renderUseFetchPostsHook();

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    const { data } = result.current;

    if (!data) throw new Error('Testing of data fetch failed');

    expect(data.post).toBe(mockPostResponse.data?.post);
    expect(data.post.author).toBe(mockPostResponse.data?.post.author);
  });

  it('handles general errors', async () => {
    await expectNetworkError({
      renderHook: renderUseFetchPostsHook,
      apiMock: vi.mocked(api.get),
    });
  });

  it('returns error details from API response', async () => {
    const mockResponseErrorDetails: ResponseErrorDetails = {
      message: ERROR_MESSAGES[ERROR_CODES['SERVER'].NOT_FOUND],
      status: ERROR_HTTP_STATUS[ERROR_CODES['SERVER'].NOT_FOUND],
      errorCode: ERROR_CODES['SERVER'].NOT_FOUND,
    };

    await expectApiError({
      renderHook: renderUseFetchPostsHook,
      apiMock: vi.mocked(api.get),
      error: mockResponseErrorDetails,
    });
  });
});
