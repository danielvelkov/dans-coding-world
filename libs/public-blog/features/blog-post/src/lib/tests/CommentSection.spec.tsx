import {
  mockAuth,
  render,
  screen,
  waitFor,
} from '@dans-coding-world/public-blog-tools';
import userEvent from '@testing-library/user-event';
import CommentSection from '../components/CommentSection';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { generateMockPostCommentsResponse } from '@dans-coding-world/shared-post-testing';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { CommentWithReplies } from '@dans-coding-world/prisma-schema';
import { mockCreateCommentHook } from './helpers/mockCreateCommentHook';

vi.mock('@dans-coding-world/shared-data-access-api');
// TODO: somehow remove this nasty copy-paste
// mock only "useAuth" from shared hooks module
vi.mock(
  '@dans-coding-world/public-blog-shared-hooks',
  async (importOriginal) => {
    return {
      ...(await importOriginal()),
      useAuth: vi.fn(),
      useCreateComment: vi.fn(),
    };
  }
);

const TEST_POST_ID = 1;
const mockCommentsResponse = generateMockPostCommentsResponse({
  postId: TEST_POST_ID,
  replyLevels: 2,
  pageSize: 10,
  length: 3,
});

describe('CommentSection', () => {
  const renderFeature = () =>
    render(
      <MemoryRouter>
        <CommentSection postId={TEST_POST_ID} />
      </MemoryRouter>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    vi.mocked(api.get<BaseResponse>).mockResolvedValue(mockCommentsResponse);
    mockCreateCommentHook({});
  });

  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('should display total comment count', async () => {
    renderFeature();
    await waitFor(() => {
      expect(
        screen.getByText(
          new RegExp(
            `Comments \\(${mockCommentsResponse.data?.pagination.total}\\)`
          )
        )
      ).toBeInTheDocument();
    });
  });

  it('should render direct post comments', async () => {
    renderFeature();
    await waitFor(() => {
      const commentList = screen.getByRole('list', { name: 'Post comments' });
      expect(commentList).toBeInTheDocument();

      const commentItems = Array.from(commentList.children);

      const topLevelComments = mockCommentsResponse.data?.items.map(
        (c) => c.content
      );
      if (!topLevelComments) throw new Error('Missing test data');

      commentItems.forEach((listItemElement) => {
        const firstParagraphInListItem =
          listItemElement.querySelectorAll('p')[0];
        expect(
          topLevelComments.includes(firstParagraphInListItem.textContent)
        ).toBe(true);
      });
    });
  });

  it(`should show comment replies as expandable tree view structure`, async () => {
    renderFeature();
    const comments = mockCommentsResponse.data?.items;
    if (!comments) throw new Error('Missing test data');

    const topLevelList = await screen.findByRole('list', {
      name: 'Post comments',
    });

    const topLevelItems = Array.from(
      topLevelList.querySelectorAll(':scope > li')
    );
    expect(topLevelItems.length).toBe(comments.length);

    for (let i = 0; i < comments.length; i++) {
      await checkRepliesForComment(topLevelItems[i], comments[i]);
    }
  });

  it(`should show "load more" button if post-comments response
    has more comments available`, async () => {
    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      ...mockCommentsResponse,
      data: {
        ...mockCommentsResponse.data,
        pagination: {
          ...mockCommentsResponse.data?.pagination,
          hasNext: true,
        },
      },
    });

    renderFeature();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /load more/i })
      ).toBeInTheDocument();
    });
  });

  it(`should not show "load more" button if no more comments can be loaded`, async () => {
    vi.mocked(api.get<BaseResponse>).mockResolvedValue({
      ...mockCommentsResponse,
      data: {
        ...mockCommentsResponse.data,
        pagination: {
          ...mockCommentsResponse.data?.pagination,
          hasNext: false,
        },
      },
    });

    renderFeature();

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /load more/i })
      ).not.toBeInTheDocument();
    });
  });

  it(`renders loading message while fetching comments`, async () => {
    vi.mocked(api.get).mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({}), 5000));
    });

    renderFeature();
    expect(screen.getByText(/Loading comments/)).toBeTruthy();
  });

  describe('based on user auth state', () => {
    describe('if user logged-in', () => {
      beforeEach(() => {
        mockAuth({ isAuthenticated: true });
      });

      it('enables comment form textarea', async () => {
        renderFeature();
        await waitFor(() => {
          expect(screen.getByRole('textbox')).not.toBeDisabled();
        });
      });

      it(`calls createComment() action from usePostComment hook on
        entering a valid comment and clicking 'submit'`, async () => {
        const testComment = 'An awesome comment';
        const user = userEvent.setup();
        const mockCreateComment = vi.fn();
        mockCreateCommentHook({
          result: { createComment: mockCreateComment },
        });
        renderFeature();
        await waitFor(async () => {
          const commentTextbox = screen.getByRole('textbox');
          expect(commentTextbox).not.toBeDisabled();
          await user.type(commentTextbox, testComment);
        });
        expect(mockCreateComment).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Submit' }));

        expect(mockCreateComment).toHaveBeenCalledWith({
          postId: TEST_POST_ID,
          content: testComment,
        });
      });
    });

    describe('if user logged-out', () => {
      beforeEach(() => {
        mockAuth({ isAuthenticated: false });
      });
      it('disables comment form textarea', async () => {
        renderFeature();
        await waitFor(() => {
          expect(screen.getByRole('textbox')).toBeDisabled();
        });
      });
    });
  });
});

async function checkRepliesForComment(
  listItemElement: Element,
  comment: CommentWithReplies
) {
  if (!comment.replyCount) return;

  const viewReplies = listItemElement.querySelector('button');
  if (!viewReplies) throw new Error('"View replies" button should be present');

  await userEvent.click(viewReplies);

  await waitFor(() => {
    expect(viewReplies).toHaveAttribute('aria-label', 'Hide replies');
  });

  const escapedUsername = comment.user.username.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const replyList = await screen.findByRole(
    'list',
    {
      name: new RegExp(`Replies to ${escapedUsername}`),
    },
    { timeout: 5000 }
  );

  // wait for all items to render before asserting count
  await waitFor(() => {
    const replyItems = Array.from(replyList.querySelectorAll(':scope > li'));
    expect(replyItems.length).toBe(comment.replies.length);
  });

  const replyItems = Array.from(replyList.querySelectorAll(':scope > li'));

  for (let i = 0; i < comment.replies.length; i++) {
    await checkRepliesForComment(replyItems[i], comment.replies[i]);
  }
}
