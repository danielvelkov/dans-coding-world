import { waitFor } from '@testing-library/react';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { generateMockPostCommentsResponse } from '@dans-coding-world/shared-post-testing';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { useFetchPostComments } from '../posts/useFetchPostComments.js';
import { renderReactQueryHook } from './helper/render-react-query-hook.js';
import {
  expectApiError,
  expectNetworkError,
} from './helper/test-fetch-hook-errors.js';

const mockPostCommentsResponse = generateMockPostCommentsResponse({
  postId: 1,
  length: 2,
  pageSize: 5,
  depth: 0,
});
vi.mock('@dans-coding-world/shared-data-access-api');

describe('useFetchPostsComments', () => {
  const renderUseFetchPostCommentsHook = () =>
    renderReactQueryHook(() => {
      if (!mockPostCommentsResponse.data) throw new Error('Missing data');
      return useFetchPostComments(1);
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(`returns post's comments and pagination details on valid response from api`, async () => {
    vi.mocked(api.get).mockResolvedValue(mockPostCommentsResponse);

    const { result } = renderUseFetchPostCommentsHook();

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    const { data } = result.current;

    if (!data) throw new Error('Testing of data fetch failed');

    expect(data.pagination).toBe(mockPostCommentsResponse.data?.pagination);
    expect(data.items.length).toBe(mockPostCommentsResponse.data?.count);

    for (const comment of data.items)
      expect(
        mockPostCommentsResponse.data?.items.map((i) => i.id).includes(comment.id)
      ).toBe(true);
  });

  it('handles general errors', async () => {
    await expectNetworkError({
      renderHook: renderUseFetchPostCommentsHook,
      apiMock: vi.mocked(api.get),
    });
  });

  it('returns error details from API response', async () => {
    const MOCK_API_ERROR: ResponseErrorDetails = {
      message: 'Something went wrong',
      status: 500,
      errorCode: 'SER001',
    };

    await expectApiError({
      renderHook: renderUseFetchPostCommentsHook,
      apiMock: vi.mocked(api.get),
      error: MOCK_API_ERROR,
    });
  });
});
