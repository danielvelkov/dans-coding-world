import { render, screen } from '@dans-coding-world/public-blog-tools';
import CommentTree from '../components/CommentTree';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { CommentWithReplies } from '@dans-coding-world/prisma-schema';
import { generateCommentThreads } from '@dans-coding-world/shared-post-testing';
import userEvent from '@testing-library/user-event';

const commentsWithNoReplies = generateCommentThreads(1, 3, 0);
const commentsWithDeeplyNestedReplies = generateCommentThreads(1, 2, 2);
const testComments: CommentWithReplies[] = [
  ...commentsWithDeeplyNestedReplies,
  ...commentsWithNoReplies,
];

describe('CommentTree', () => {
  const renderFeature = (comments: CommentWithReplies[] = testComments) => {
    return render(
      <MemoryRouter>
        <CommentTree comments={comments} />
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

  it('should render "view replies" button for each comment with replies', async () => {
    renderFeature();
    const commentsWithReplies = testComments.filter((c) => c.replies.length);
    const buttons = screen.getAllByRole('button', { name: /view replies/i });

    expect(buttons.length).toBe(commentsWithReplies.length);

    for (let i = 0; i < commentsWithReplies.length; i++)
      expect(buttons[i].textContent).toMatch(
        new RegExp(
          `view replies \\(${commentsWithReplies[i].replyCount}\\)`,
          'i'
        )
      );
  });

  it('should show direct replies to comment when clicking on "view replies"', async () => {
    renderFeature();
    const user = userEvent.setup();

    const commentsWithReplies = testComments.filter((c) => c.replies.length);
    const buttons = screen.getAllByRole('button', { name: /view replies/i });

    for (let i = 0; i < commentsWithReplies.length; i++) {
      for (const reply of commentsWithReplies[i].replies) {
        expect(screen.queryByText(reply.content)).toBeNull();
        await user.click(buttons[i]); // view replies
        expect(screen.getByText(reply.content)).toBeInTheDocument();
        await user.click(buttons[i]); // hide replies
      }
    }
  });

  it('should hide comments when selecting "hide replies"', async () => {
    renderFeature();
    const user = userEvent.setup();

    const commentsWithReplies = testComments.filter((c) => c.replies.length);
    const buttons = screen.getAllByRole('button', { name: /view replies/i });

    for (let i = 0; i < commentsWithReplies.length; i++) {
      for (const reply of commentsWithReplies[i].replies) {
        expect(screen.queryByText(reply.content)).toBeNull();
        await user.click(buttons[i]); // view replies
        expect(screen.getByText(reply.content)).toBeInTheDocument();
        await user.click(buttons[i]); // hide replies
        expect(screen.queryByText(reply.content)).toBeNull();
      }
    }
  });
});
