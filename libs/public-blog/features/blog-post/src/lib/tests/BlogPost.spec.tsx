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

vi.mock('@dans-coding-world/shared-data-access-api');

const mockPostResponse = generateMockPostResponse({});
const testPost = mockPostResponse.data?.post as PostFull;

describe('BlogPost', () => {
  const renderFeature = () => {
    if (!mockPostResponse.data?.post) throw new Error('Missing data');
    return render(
      <MemoryRouter>
        <BlogPost postId={testPost.id} />
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
});
