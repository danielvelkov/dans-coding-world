import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import BlogList from '../BlogList';
import { generateMockPostsResponse } from './mocks/posts-response.mock.js';
import { BaseResponse } from '@dans-coding-world/api-types';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@dans-coding-world/shared-data-access-api');

const mockPostResponse = generateMockPostsResponse({ length: 5, pageSize: 5 });

describe('Public-Blog feature - BlogList', () => {
  let queryClient: QueryClient;

  const renderFeature = () => {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <BlogList />
        </QueryClientProvider>
      </MemoryRouter>
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

  it(`renders loading message while loading`, async () => {
    vi.mocked(api.get).mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({}), 5000));
    });

    renderFeature();
    expect(screen.getByText(/Loading posts/)).toBeTruthy();
  });

  it(`does not render pagination while loading`, () => {
    vi.mocked(api.get).mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({}), 5000));
    });

    renderFeature();
    expect(
      screen.queryByRole('navigation', { name: 'pagination' })
    ).toBeFalsy();
  });
});
