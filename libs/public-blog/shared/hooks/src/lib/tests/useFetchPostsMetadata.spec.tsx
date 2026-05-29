import { waitFor } from '@testing-library/react';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { generateMockPostMetadataResponse } from '@dans-coding-world/shared-post-testing';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { useFetchPostsMetadata } from '../posts/useFetchPostsMetadata.js';
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

const mockPostMetadataResponse = generateMockPostMetadataResponse({
  length: 5,
});
vi.mock('@dans-coding-world/public-blog-data-access-api');

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
