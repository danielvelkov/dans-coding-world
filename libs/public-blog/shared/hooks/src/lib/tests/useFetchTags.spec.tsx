import { waitFor } from '@testing-library/react';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { useFetchTags } from '../posts/useFetchTags.js';
import { generateMockGetTagsResponse } from '@dans-coding-world/shared-post-testing';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import {
  expectApiError,
  expectNetworkError,
} from './helper/test-fetch-hook-errors.js';
import { renderReactQueryHook } from './helper/render-react-query-hook.js';

vi.mock('@dans-coding-world/shared-data-access-api');

describe('useFetchTags', () => {
  const renderUseFetchTagsHook = () => renderReactQueryHook(useFetchTags);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches tags successfully on valid api response', async () => {
    const mockResponse = generateMockGetTagsResponse({ length: 5 });
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const { result } = renderUseFetchTagsHook();

    // wait out data fetch
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    const { data } = result.current;
    if (!data) throw new Error('Testing of data fetch failed');

    for (const tag of data.items)
      expect(mockResponse.data?.items.map((i) => i.id).includes(tag.id)).toBe(
        true
      );
  });

  it('handles general errors', async () => {
    await expectNetworkError({
      renderHook: renderUseFetchTagsHook,
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
      renderHook: renderUseFetchTagsHook,
      apiMock: vi.mocked(api.get),
      error: MOCK_API_ERROR,
    });
  });
});
