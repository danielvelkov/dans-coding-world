import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import BlogList from '../blog-list.feature';
import { generateMockPostsResponse } from './mocks/posts-response.mock.js';
import { BaseResponse } from '@dans-coding-world/api-types';

vi.mock('@dans-coding-world/shared-data-access-api');

const mockPostResponse = generateMockPostsResponse({ length: 5, pageSize: 5 });

const validProps = {
  onAuthorClick: vi.fn(),
};

describe('Public-Blog feature - BlogList', () => {
  let queryClient: QueryClient;

  const renderFeature = (props = validProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BlogList {...props} />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // IMPORTANT: Disable retries for tests
        },
      },
    });
    vi.clearAllMocks();
    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      data: mockPostResponse,
      success: true,
      error: null,
    });
  });

  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('renders error message when failed to fetch posts', async () => {
    const error = new Error('Connection error');
    vi.mocked(api.get).mockRejectedValue(error);
    renderFeature();

    await waitFor(
      async () => {
        const message = screen.getByTestId('error-message');
        expect(message.textContent).toMatch(error.message);
      },
      { timeout: 3000 }
    );
  });

  it('renders the post items on successful fetch', async () => {
    renderFeature();
    const postList = await screen.findByLabelText('blog posts');
    const items = await within(postList).findAllByRole('listitem');
    expect(items.length).toBe(mockPostResponse.count);
  });
});
