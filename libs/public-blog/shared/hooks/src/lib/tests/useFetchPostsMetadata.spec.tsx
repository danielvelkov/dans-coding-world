import { waitFor } from '@testing-library/react';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { generatePostMetadataResponse } from '@dans-coding-world/shared-post-testing';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { useFetchPostsMetadata } from '../posts/useFetchPostsMetadata.js';
import { renderReactQueryHook } from './helper/render-react-query-hook.js';
import {
  expectApiError,
  expectNetworkError,
} from './helper/test-fetch-hook-errors.js';

const mockPostMetadataResponse = generatePostMetadataResponse({ length: 5 });
vi.mock('@dans-coding-world/shared-data-access-api');

describe('useFetchPostsMetadata', () => {
  const renderUseFetchPostsHook = () =>
    renderReactQueryHook(useFetchPostsMetadata);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns array of years valid response from api', async () => {
    vi.mocked(api.get).mockResolvedValue(mockPostMetadataResponse);

    const { result } = renderUseFetchPostsHook();

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
    const { data } = result.current;

    if (!data) throw new Error('Testing of data fetch failed');

    expect(data.years).toBe(mockPostMetadataResponse.data?.years);
  });

  it('handles general errors', async () => {
    await expectNetworkError({
      renderHook: renderUseFetchPostsHook,
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
      renderHook: renderUseFetchPostsHook,
      apiMock: vi.mocked(api.get),
      error: MOCK_API_ERROR,
    });
  });
});
