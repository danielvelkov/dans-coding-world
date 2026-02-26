import {
  render,
  screen,
  waitFor,
  within,
} from '@dans-coding-world/public-blog-tools';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import BlogPost from '../BlogPost';
import { generateMockPostResponse } from '@dans-coding-world/shared-post-testing';
import { BaseResponse } from '@dans-coding-world/api-types';
import { MemoryRouter } from 'react-router-dom';
import { PostFull } from '@dans-coding-world/post-data-access';
import '@testing-library/jest-dom';

vi.mock('@dans-coding-world/shared-data-access-api');

const mockPostResponse = generateMockPostResponse({});
const testPost = mockPostResponse.data?.post as PostFull;

describe('BlogPost', () => {
  const renderFeature = (post: PostFull = testPost) => {
    return render(
      <MemoryRouter>
        <BlogPost postId={post.id} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get<BaseResponse>).mockResolvedValue(mockPostResponse);
  });

  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('should render post title', async () => {
    renderFeature();
    await waitFor(() => {
      const article = screen.getByRole('article');
      const heading = within(article).getByRole('heading');
      expect(heading.textContent).toBe(testPost.title);
    });
  });

  it(`should display post content as HTML`, async () => {
    const contentTitle = 'Lemme` tell you something';
    const postWithHTMLContent: PostFull = {
      ...testPost,
      content: `<h2>${contentTitle}</h2>`,
    };
    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      ...mockPostResponse,
      data: { post: postWithHTMLContent },
    });

    renderFeature(postWithHTMLContent);
    await waitFor(() => {
      const article = screen.getByRole('article');
      const content = within(article).getByTestId('post-content');
      const heading = within(content).getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe(contentTitle);
    });
  });

  it('sanitizes <img> "onerror" xss attacks from post content', async () => {
    const attackString = `<img src=x onerror="alert('xss')">`;
    const postWithMaliciousContent: PostFull = {
      ...testPost,
      content: attackString,
    };
    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      ...mockPostResponse,
      data: { post: postWithMaliciousContent },
    });

    renderFeature(postWithMaliciousContent);
    await waitFor(() => {
      const article = screen.getByRole('article');
      const img = within(article).getByRole('img');
      expect(img).not.toHaveAttribute('onerror');
    });
  });

  test.each([
    '<script>alert(123)</script>',
    '"><script>alert(document.cookie)</script>',
  ])('sanitizes script tags from post content: "%s"', async (attackString) => {
    const postWithMaliciousContent = { ...testPost, content: attackString };
    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      ...mockPostResponse,
      data: { post: postWithMaliciousContent },
    });
    const { container } = renderFeature(postWithMaliciousContent);
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('alert');
  });
});
