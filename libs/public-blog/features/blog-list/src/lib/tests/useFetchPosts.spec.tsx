import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFetchPosts } from '../hooks/useFetchPosts.js';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';

const mockPostResponse = generateMockPostsResponse({ length: 5, pageSize: 5 });
vi.mock('@dans-coding-world/shared-data-access-api');

describe('Custom hook - useFetchPosts', () => {
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

  it('handles connection errors', async () => {
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
    vi.mocked(api.get).mockResolvedValue({
      data: mockPostResponse,
      success: true,
      error: null,
    });

    const { result } = renderUseFetchPostsHook();

    // wait out data fetch
    await waitFor(
      () => {
        expect(result.current.isPending).toBe(false);
      },
      { timeout: 3000 }
    );
    const { data } = result.current;

    if (!data) throw new Error('Testing of data fetch failed');

    expect(data.pagination).toBe(mockPostResponse.pagination);
    expect(data.posts.length).toBe(mockPostResponse.count);

    for (const post of data.posts)
      expect(mockPostResponse.items.map((i) => i.id).includes(post.id)).toBe(
        true
      );
  });

  it('returns error details from API response', async () => {
    const MOCK_API_ERROR = {
      message: 'Something went wrong',
      status: 500,
      errorCode: 'SER001',
    } as ResponseErrorDetails;
    vi.mocked(api.get).mockResolvedValue({
      data: null,
      success: false,
      error: MOCK_API_ERROR,
    });

    const { result } = renderUseFetchPostsHook();

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 3000 }
    );
    const { data, error } = result.current;

    expect(data).toBeFalsy();
    expect(error).toBe(MOCK_API_ERROR);
  });
});
