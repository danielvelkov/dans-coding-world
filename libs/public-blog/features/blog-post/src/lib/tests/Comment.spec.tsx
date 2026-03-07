import {
  render,
  screen,
  waitFor,
  within,
} from '@dans-coding-world/public-blog-tools';
import Comment from '../components/Comment';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { formatToRelativeTimeFromNow } from '@dans-coding-world/helpers';
import { CommentWithReplies } from '@dans-coding-world/prisma-schema';
import {
  generateRandomComments,
  generateRandomUserPreview,
} from '@dans-coding-world/shared-post-testing';

const testComment: CommentWithReplies = generateRandomComments(1, 1)[0];
testComment.user = generateRandomUserPreview();

describe('Comment', () => {
  const renderFeature = (comment: CommentWithReplies = testComment) => {
    return render(
      <MemoryRouter>
        <Comment comment={comment} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render successfully', () => {
    const { baseElement } = renderFeature();
    expect(baseElement).toBeTruthy();
  });

  it('should render comment author name', async () => {
    let authorName;
    if (testComment.user.profile)
      authorName =
        testComment.user.profile?.firstName +
        ' ' +
        testComment.user.profile?.lastName;
    else authorName = testComment.user.username;

    const { baseElement } = renderFeature();
    await waitFor(() => {
      within(baseElement).getByText(authorName);
    });
  });

  it('should render comment content', async () => {
    renderFeature();
    await waitFor(() => {
      const paragraph = screen.getByRole('paragraph');
      expect(paragraph.textContent).toBe(testComment.content);
    });
  });

  it('should render the time passed from when the comment was posted', async () => {
    renderFeature();
    await waitFor(() => {
      const time = screen.getByRole('time');
      expect(time.textContent).toBe(
        formatToRelativeTimeFromNow(new Date(testComment.createdAt))
      );
    });
  });
});
