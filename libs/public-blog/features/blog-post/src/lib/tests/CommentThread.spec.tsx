import {
  mockAuth,
  render,
  screen,
  waitFor,
  within,
} from '@dans-coding-world/public-blog-tools';
import CommentThread from '../components/CommentThread';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { CommentWithReplies, Role } from '@dans-coding-world/prisma-schema';
import { generateCommentThreads } from '@dans-coding-world/shared-post-testing';
import userEvent from '@testing-library/user-event';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';
import { ReplyContextProvider } from '../providers/ReplyContextProvider';
import { mockCreateCommentHook } from './helpers/mockCreateCommentHook';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { act } from 'react';

const TEST_POST_ID = 1;
const commentsWithNoReplies = generateCommentThreads(TEST_POST_ID, 3, 0);
const commentsWithDeeplyNestedReplies = generateCommentThreads(
  TEST_POST_ID,
  2,
  2
);
const testComments: CommentWithReplies[] = [
  ...commentsWithDeeplyNestedReplies,
  ...commentsWithNoReplies,
];

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

describe('CommentThread', () => {
  const renderFeature = (comments: CommentWithReplies[] = testComments) => {
    return render(
      <MemoryRouter>
        <ReplyContextProvider postId={TEST_POST_ID}>
          <CommentThread comments={comments} />
        </ReplyContextProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    mockCreateCommentHook({});
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

  describe('Authenticated users', () => {
    const currentTestUser = generateRandomUser();
    beforeEach(() => {
      mockAuth({ isAuthenticated: true, user: currentTestUser });
    });

    describe('Replying to comments', () => {
      it('should display "Reply" button next to comments if logged in', () => {
        renderFeature();

        expect(screen.getAllByRole('button', { name: 'Reply' }).length).toBe(
          testComments.length
        );
      });

      it(`should call useCreateComment hook's createComment() action when
      valid comment set in reply textarea and submit button clicked`, async () => {
        const commentContent = 'Normal comment';
        const mockCreateComment = vi.fn();
        const user = userEvent.setup();
        mockCreateCommentHook({ result: { createComment: mockCreateComment } });
        renderFeature();
        const comment = screen.getByTestId(`comment-${testComments[0].id}`);
        const replyButton = within(comment).getByRole('button', {
          name: /reply/i,
        });
        await user.click(replyButton);
        await user.type(within(comment).getByRole('textbox'), commentContent);
        await user.click(
          within(comment).getByRole('button', { name: /submit/i })
        );
        expect(mockCreateComment).toHaveBeenLastCalledWith({
          postId: TEST_POST_ID,
          content: commentContent,
          replyToCommentId: testComments[0].id,
        });
      });

      it(`should hide expanded list of replies for comment after
      clicking the "Reply" button`, async () => {
        const user = userEvent.setup();
        renderFeature();

        const comment = screen.getByTestId(`comment-${testComments[0].id}`);
        const viewRepliesButton = within(comment).getByRole('button', {
          name: /view replies/i,
        });
        const replyButton = within(comment).getByRole('button', {
          name: /reply/i,
        });
        await user.click(viewRepliesButton);

        for (const reply of testComments[0].replies)
          expect(screen.getByText(reply.content)).toBeInTheDocument();

        await user.click(replyButton);
        for (const reply of testComments[0].replies)
          expect(screen.queryByText(reply.content)).not.toBeInTheDocument();
      });

      it(`should toggle textarea visibility within comment after
       clicking "Reply" button`, async () => {
        const user = userEvent.setup();
        renderFeature();

        const comment = screen.getByTestId(`comment-${testComments[0].id}`);
        const replyButton = within(comment).getByRole('button', {
          name: 'Reply',
        });
        expect(within(comment).queryByRole('textbox')).not.toBeInTheDocument();
        await user.click(replyButton);
        expect(within(comment).getByRole('textbox')).toBeInTheDocument();
        // Test out toggle
        await user.click(replyButton);
        expect(within(comment).queryByRole('textbox')).not.toBeInTheDocument();
      });

      it(`should hide other opened reply forms when clicking "Reply"`, async () => {
        const user = userEvent.setup();
        renderFeature();

        const firstComment = screen.getByTestId(
          `comment-${testComments[0].id}`
        );
        const secondComment = screen.getByTestId(
          `comment-${testComments[1].id}`
        );

        // Select first comment "Reply" button
        await user.click(
          within(firstComment).getByRole('button', { name: 'Reply' })
        );
        expect(within(firstComment).getByRole('textbox')).toBeInTheDocument();
        expect(
          within(secondComment).queryByRole('textbox')
        ).not.toBeInTheDocument();

        // Select second comment "Reply" button, hiding the first form
        await user.click(
          within(secondComment).getByRole('button', { name: 'Reply' })
        );
        expect(within(secondComment).getByRole('textbox')).toBeInTheDocument();
        expect(
          within(firstComment).queryByRole('textbox')
        ).not.toBeInTheDocument();
      });

      it(`should hide other comment's shown reply form
       when clicking "View replies"`, async () => {
        const user = userEvent.setup();
        renderFeature();

        const firstComment = screen.getByTestId(
          `comment-${commentsWithDeeplyNestedReplies[0].id}`
        );
        const secondComment = screen.getByTestId(
          `comment-${commentsWithDeeplyNestedReplies[1].id}`
        );

        // Select first comment "Reply" button
        await user.click(
          within(firstComment).getByRole('button', { name: 'Reply' })
        );
        expect(within(firstComment).getByRole('textbox')).toBeInTheDocument();
        expect(
          within(secondComment).queryByRole('textbox')
        ).not.toBeInTheDocument();

        // Select second comment's "View replies" button, hiding the first form
        await user.click(
          within(secondComment).getByRole('button', { name: /view replies/i })
        );
        expect(
          within(firstComment).queryByRole('textbox')
        ).not.toBeInTheDocument();
      });

      it('does not display "Reply" button on comments of max reply depth', async () => {
        const user = userEvent.setup();
        renderFeature();

        let currentComment = commentsWithDeeplyNestedReplies[0];
        for (
          let depthLevel = 0;
          depthLevel < COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH;
          depthLevel++
        ) {
          const comment = screen.getByTestId(`comment-${currentComment.id}`);
          const replyButton = within(comment).queryByRole('button', {
            name: /reply/i,
          });
          if (depthLevel === COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH - 1) {
            expect(replyButton).not.toBeInTheDocument();
            break;
          } else expect(replyButton).toBeInTheDocument();

          const viewRepliesButton = within(comment).getByRole('button', {
            name: /view replies/i,
          });
          await user.click(viewRepliesButton);

          currentComment = currentComment.replies[0];
          if (!currentComment) throw new Error('Missing comment fixture');
        }
      });
    });

    describe('Deleting comments', () => {
      it(`should display "Delete" button on user's comments`, () => {
        const userCommentForDeletion = testComments[0];
        mockAuth({
          isAuthenticated: true,
          user: {
            ...currentTestUser,
            role: 'USER',
            id: userCommentForDeletion.userId,
          },
        });
        renderFeature();
        const userComment = screen.getByTestId(
          `comment-${userCommentForDeletion.id}`
        );
        expect(
          within(userComment).getByRole('button', { name: /delete/i })
        ).toBeInTheDocument();

        // Check comments not made by user
        const commentNotMadeByUser = testComments.find(
          (c) => c.userId !== userCommentForDeletion.userId
        ) as CommentWithReplies;
        const otherUserComment = screen.getByTestId(
          `comment-${commentNotMadeByUser.id}`
        );
        expect(
          within(otherUserComment).queryByRole('button', { name: /delete/i })
        ).not.toBeInTheDocument();
      });

      test.each(['ADMIN', 'MOD'])(
        'should display "Delete" button on all comments if user is "%s"',
        (role) => {
          mockAuth({
            isAuthenticated: true,
            user: { ...currentTestUser, role: role as Role },
          });
          renderFeature();
          for (const comment of testComments) {
            const commentElement = screen.getByTestId(`comment-${comment.id}`);
            expect(
              within(commentElement).getByRole('button', { name: /delete/i })
            ).toBeInTheDocument();
          }
        }
      );

      it('should open modal on clicking "Delete" comment', async () => {
        const user = userEvent.setup();
        mockAuth({
          isAuthenticated: true,
          user: { ...currentTestUser, role: 'ADMIN' },
        });
        renderFeature();
        const commentElement = screen.getByTestId(
          `comment-${testComments[0].id}`
        );
        await act(async () => {
          await user.click(
            within(commentElement).getByRole('button', { name: /delete/i })
          );
        });
        await waitFor(() => {
          expect(screen.getByText(/delete comment/i)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Unauthenticated users', () => {
    it('should not display "Reply" button next to comments', () => {
      renderFeature();

      expect(screen.queryAllByRole('button', { name: 'Reply' }).length).toBe(0);
    });
  });
});
