import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { useFetchPosts } from '../useFetchPosts.js';

const mockPostResponse = generateMockPostsResponse({ length: 5, pageSize: 5 });
vi.mock('@dans-coding-world/shared-data-access-api');

describe('useFetchPosts', () => {
  let queryClient: QueryClient;

  const renderUseFetchPostsHook = () =>
    renderHook(() => useFetchPosts(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // IMPORTANT: Disable retries for tests
        },
      },
    });
    vi.clearAllMocks();
  });

  it('handles general errors', async () => {
    const connectionError = new Error('Connection error occurred');
    vi.mocked(api.get).mockRejectedValue(connectionError);

    const { result } = renderUseFetchPostsHook();
    // Initially loading
    expect(result.current.isPending).toBe(true);
    expect(result.current.error).toBe(null);

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe(connectionError.message);
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
        mockPostResponse.data?.items.map((i) => i.id).includes(post.id)
      ).toBe(true);
  });

  it('returns error details from API response', async () => {
    const MOCK_API_ERROR: ResponseErrorDetails = {
      message: 'Something went wrong',
      status: 500,
      errorCode: 'SER001',
    };

    vi.mocked(api.get).mockResolvedValue({
      data: null,
      success: false,
      error: MOCK_API_ERROR,
    });

    const { result } = renderUseFetchPostsHook();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    const { data, error } = result.current;

    expect(data).toBeFalsy();
    expect(error).toBe(MOCK_API_ERROR);
  });
});
