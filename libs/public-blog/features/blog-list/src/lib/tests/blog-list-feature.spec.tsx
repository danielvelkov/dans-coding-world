import { render, screen, within } from '@testing-library/react';

import BlogListFeature from '../blog-list.feature';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockPostsResponse } from './mocks/posts-response.mock.js';

const fetchPostsFn = vi.fn((params) => Promise.resolve(mockPostsResponse));
const validProps = {
  fetchPostsFn,
  onAuthorClick: vi.fn(),
  params: {},
  onParamsChange: vi.fn(),
};
const renderFeature = (props = validProps) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <BlogListFeature {...props} />
    </QueryClientProvider>
  );
};

describe('Public-Blog feature - BlogList', () => {
  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('renders the post items on successful fetch', async () => {
    renderFeature();
    const postList = await screen.findByLabelText('blog posts');
    const items = await within(postList).findAllByRole('listitem');
    expect(items.length).toBe(mockPostsResponse.count);
  });
});
