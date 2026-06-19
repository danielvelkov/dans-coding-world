import {
  mockAuth,
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
import { formatDateTo_Month_DD_YYYY } from '@dans-coding-world/helpers';

// TODO: somehow remove this nasty copy-paste
// mock only "useAuth" from shared hooks module
vi.mock(
  '@dans-coding-world/public-blog-shared-hooks',
  async (importOriginal) => {
    return {
      ...(await importOriginal()),
      useAuth: vi.fn(),
    };
  },
);
vi.mock('@dans-coding-world/public-blog-data-access-api');

const mockPostResponse = generateMockPostResponse({});
const testPost = mockPostResponse.data?.post as PostFull;

describe('BlogPost', () => {
  const renderFeature = (post: PostFull = testPost) => {
    return render(
      <MemoryRouter>
        <BlogPost postId={post.id} />
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
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

  it('should display author name (or username if no profile setup)', async () => {
    let authorName;
    if (testPost.author.profile)
      authorName =
        testPost.author.profile?.firstName +
        ' ' +
        testPost.author.profile?.lastName;
    else authorName = testPost.author.username;

    renderFeature();
    await waitFor(() => {
      const article = screen.getByRole('article');
      within(article).getByText(authorName);
    });
  });

  it('should display published date in "MONTH DD, YYYY" format', async () => {
    renderFeature();
    await waitFor(() => {
      const article = screen.getByRole('article');
      const publishedDate = within(article).getByLabelText(/posted on/i);
      expect(publishedDate.textContent).toBe(
        formatDateTo_Month_DD_YYYY(new Date(testPost.publishedAt as Date)),
      );
    });
  });

  it(`should display "last edited" date if published date
    is before updated date`, async () => {
    const publishedDate = '01 Mar 2025';
    const editedDate = '12 Mar 2025';

    const postWithFixedDates = {
      ...testPost,
      publishedAt: new Date(publishedDate),
      updatedAt: new Date(editedDate),
    };

    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      ...mockPostResponse,
      data: { post: postWithFixedDates },
    });

    renderFeature(postWithFixedDates);
    await waitFor(() => {
      const article = screen.getByRole('article');
      const modifiedDate = within(article).getByLabelText(/last edited on/i);
      expect(modifiedDate.textContent).toContain(
        formatDateTo_Month_DD_YYYY(new Date(editedDate)),
      );
    });
  });

  it('should display post tags', async () => {
    renderFeature();
    await waitFor(() => {
      const article = screen.getByRole('article');
      const buttons = within(article).getAllByRole('button');
      for (const tag of testPost.tags as string[]) {
        expect(buttons.some((b) => b.textContent.includes(tag))).toBe(true);
      }
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
      const content = screen.getByTestId('post-content');
      const imgs = within(content).getAllByRole('img');
      for (const img of imgs) expect(img).not.toHaveAttribute('onerror');
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
