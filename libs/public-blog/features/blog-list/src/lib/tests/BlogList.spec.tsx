import {
  render,
  screen,
  waitFor,
  within,
  mockAuth,
} from '@dans-coding-world/public-blog-tools';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import BlogList from '../BlogList';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { BaseResponse } from '@dans-coding-world/api-types';
import { MemoryRouter } from 'react-router-dom';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';

// mock only "useAuth" from shared hooks module
vi.mock(
  '@dans-coding-world/public-blog-shared-hooks',
  async (importOriginal) => {
    return {
      ...(await importOriginal()),
      useAuth: vi.fn(),
    };
  }
);

vi.mock('@dans-coding-world/shared-data-access-api');

const mockPostResponse = generateMockPostsResponse({
  length: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
  pageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
});

describe('BlogList', () => {
  const renderFeature = () => {
    return render(
      <MemoryRouter>
        <BlogList />
      </MemoryRouter>
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

  it('renders error message when api call fails to fetch posts', async () => {
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
    expect(items.length).toBe(mockPostResponse.data?.count);
  });

  it('renders page nav if total pages in response are more than 1', async () => {
    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      ...mockPostResponse,
      data: {
        ...mockPostResponse.data,
        pagination: {
          ...mockPostResponse.data?.pagination,
          totalPages: 2,
        },
      } as GetPostsResponseDto,
    });
    renderFeature();
    await waitFor(() => {
      expect(
        screen.queryByRole('navigation', { name: 'pagination' })
      ).toBeTruthy();
    });
  });

  it('does not render page nav if total pages is <= 1', async () => {
    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      ...mockPostResponse,
      data: {
        ...mockPostResponse.data,
        pagination: {
          ...mockPostResponse.data?.pagination,
          totalPages: 1,
        },
      } as GetPostsResponseDto,
    });
    renderFeature();
    await waitFor(() => {
      expect(
        screen.queryByRole('navigation', { name: 'pagination' })
      ).toBeFalsy();
    });
  });

  it(`does not render loading message if loading is faster than 200ms`, async () => {
    vi.mocked(api.get).mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({}), 100));
    });

    renderFeature();
    await waitFor(() => {
      expect(screen.queryByText(/Loading posts/)).toBeFalsy();
      expect(screen.queryByLabelText('Sort by')).toBeTruthy();
    });
  });

  it(`renders loading message if loading takes more than 200ms`, async () => {
    vi.mocked(api.get).mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({}), 300));
    });

    renderFeature();
    await waitFor(() => {
      expect(screen.getByText(/Loading posts/)).toBeTruthy();
    });
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

  describe('based on user authentication state', () => {
    beforeEach(() => {
      // make all posts members-only
      vi.mocked(api.get<BaseResponse<GetPostsResponseDto>>).mockResolvedValue({
        ...mockPostResponse,
        data: {
          ...mockPostResponse.data,
          items: mockPostResponse.data?.items.map((p) => ({
            ...p,
            visibility: 'MEMBERS_ONLY',
          })),
        } as GetPostsResponseDto,
      });
    });

    describe('if logged-in', () => {
      beforeEach(() => {
        mockAuth({
          isAuthenticated: true,
          user: generateRandomUser(),
        });
      });

      it('shows content of members-only posts', async () => {
        renderFeature();
        await waitFor(() => {
          const posts = screen.getAllByRole('article');
          const lockedPosts = screen.queryAllByLabelText(
            'This post is members only'
          );
          expect(posts.length).not.toEqual(lockedPosts.length);
          expect(lockedPosts.length).toBe(0);
        });
      });

      it('allows selecting posts that are members-only', async () => {
        renderFeature();
        await waitFor(() => {
          const posts = screen.getAllByRole('article');
          for (const post of posts) {
            const postLinks = post.querySelectorAll('a');
            expect(
              Array.from(postLinks)
                .map((link) => link.textContent)
                .includes('Continue reading')
            ).toBeTruthy();
          }
        });
      });
    });

    describe('if logged-out', () => {
      beforeEach(() => {
        mockAuth({
          isAuthenticated: false,
        });
      });

      it('hides content of members-only posts', async () => {
        renderFeature();
        await waitFor(() => {
          const posts = screen.getAllByRole('article');
          const lockedPosts = screen.queryAllByLabelText(
            'This post is members only'
          );
          expect(posts.length).toEqual(lockedPosts.length);
        });
      });

      it('"locks" members-only posts from user selection', async () => {
        renderFeature();
        await waitFor(() => {
          const posts = screen.getAllByRole('article');
          for (const post of posts) {
            const postLinks = post.querySelectorAll('a');
            expect(
              Array.from(postLinks)
                .map((link) => link.textContent)
                .includes('Continue reading')
            ).toBeFalsy();
          }
        });
      });
    });
  });
});
