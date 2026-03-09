import { render, screen, waitFor } from '@dans-coding-world/public-blog-tools';
import userEvent from '@testing-library/user-event';
import CommentSection from '../components/CommentSection';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { generateMockPostCommentsResponse } from '@dans-coding-world/shared-post-testing';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { CommentWithReplies } from '@dans-coding-world/prisma-schema';

vi.mock('@dans-coding-world/shared-data-access-api');

const TEST_POST_ID = 1;
const mockCommentsResponse = generateMockPostCommentsResponse({
  postId: TEST_POST_ID,
  replyLevels: 2,
  pageSize: 10,
  length: 7,
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
    vi.mocked(api.get<BaseResponse>).mockResolvedValue(mockCommentsResponse);
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
});

async function checkRepliesForComment(
  listItemElement: Element,
  comment: CommentWithReplies
) {
  if (!comment.replyCount) return;

  const viewReplies = listItemElement.querySelector('button');
  if (!viewReplies) throw new Error('"View replies" button should be present');

  await userEvent.click(viewReplies);

  const replyList = await screen.findByRole('list', {
    name: new RegExp(`Replies to ${comment.user.username}`, 'i'),
  });

  const replyItems = Array.from(replyList.querySelectorAll(':scope > li'));
  expect(replyItems.length).toBe(comment.replies.length);

  for (let i = 0; i < comment.replies.length; i++) {
    const reply = comment.replies[i];
    const replyItem = replyItems[i];

    const paragraph = replyItem.querySelector('p');
    expect(paragraph?.textContent).toBe(reply.content);

    await checkRepliesForComment(replyItem, reply);
  }
}
