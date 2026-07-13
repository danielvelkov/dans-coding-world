import { generateRandomString } from '@dans-coding-world/helpers';
import type {
  Comment,
  CommentWithReplies,
  Post,
  Profile,
  User,
} from '@dans-coding-world/prisma-schema';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockCommentResponse } from '@dans-coding-world/shared-post-testing';
import { UserDetail } from '@dans-coding-world/user-data-access';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';
import {
  createComment,
  loadMoreCommentsIfPresent,
  mockBlogPostPage,
} from './helpers/comments.helper';

describe('Comments - editing', () => {
  let testPosts: Post[];
  let testComments: Comment[];
  const testUsers: UserDetail[] = [];

  before(() => {
    const { id, profile, ...bannedUser } = generateRandomUser();

    cy.task('db:seed-users', {
      users: [{ ...bannedUser, isBanned: true }],
      options: { useDefaults: true, clearExisting: true },
    }).then((seededUsers) => {
      const users = seededUsers as User[];
      if (!users || !users.length) throw new Error('Missing user fixtures');

      cy.task('db:seed-profiles', {
        options: { useDefaults: true, clearExisting: true },
      }).then((seededProfiles) => {
        const profiles = seededProfiles as Profile[];
        if (!profiles || !profiles.length)
          throw new Error('Missing user profile fixtures');

        for (let i = 0; i < users.length; i++)
          testUsers.push({
            ...users[i],
            profile: profiles[i],
          });
      });
    });

    cy.task('db:seed-posts', {
      options: { useDefaults: true, clearExisting: true },
    }).then((posts) => {
      testPosts = (posts as Post[]).filter(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC',
      );
      if (!testPosts || !testPosts.length)
        throw new Error('Missing post fixtures');
    });
    cy.fixture('post/comments/sorting-dataset.json').then((fixtureComments) => {
      const bannedUser = testUsers.find((u) => u.isBanned === true) as User;
      const { user, replies, replyCount, id, ...comment }: CommentWithReplies =
        {
          ...generateMockCommentResponse({
            postId: testPosts[0].id,
            comment: { userId: bannedUser.id },
          }).data.comment,
        };
      cy.task('db:seed-comments', {
        comments: [
          comment,
          ...fixtureComments.map((c: Comment) => {
            if (!testPosts.map((p) => p.id).includes(c.postId))
              c.postId = Cypress._.sample(testPosts.map((p) => p.id)) as number;
            return c;
          }),
        ],
        options: { useDefaults: true, clearExisting: true },
      }).then((comments) => {
        testComments = comments as Comment[];
        if (!testPosts || !testPosts.length)
          throw new Error('Missing comment fixtures');
      });
    });
  });

  context('Unauthenticated users', () => {
    beforeEach(() => {
      mockBlogPostPage();
    });

    it('does not show edit button to comments', () => {
      cy.contains('button', 'Edit').should('not.exist');
    });
  });

  context('Authenticated users', () => {
    let editPostId = 0;
    let ownEditableComments: Comment[] = [];
    let anotherUserComment: Comment;

    beforeEach(() => {
      const publishedPostIds = new Set(
        testPosts.filter((p) => p.status === 'PUBLISHED').map((p) => p.id),
      );
      const commentsGroupedByPostId = Object.entries(
        Object.groupBy(
          testComments.filter(
            (c) => c.depth === 0 && publishedPostIds.has(c.postId),
          ),
          ({ postId }) => postId,
        ),
      );
      const matchingEntry = commentsGroupedByPostId.find(([, group]) => {
        if (!group || group.length < 2) return false;
        const groupedByAuthor = Object.values(
          Object.groupBy(group, ({ userId }) => userId),
        );
        return groupedByAuthor.some(
          (comments) => comments && comments.length >= 2,
        );
      });

      if (!matchingEntry)
        throw new Error(
          'Missing fixtures - post with more than 2 comments by same user at depth 0',
        );
      editPostId = Number(matchingEntry[0]);
      const postComments = matchingEntry[1] as Comment[];
      ownEditableComments = Object.values(
        Object.groupBy(postComments, ({ userId }) => userId),
      ).find((group) => group && group.length >= 2) as Comment[];
      if (!ownEditableComments || ownEditableComments.length < 2)
        throw new Error('Missing fixtures');

      anotherUserComment = postComments.find(
        (c) => c.userId !== ownEditableComments[0].userId,
      ) as Comment;
      if (!anotherUserComment) throw new Error('Missing fixtures');

      const commentAuthor = testUsers.find(
        (u) => u.id === ownEditableComments[0].userId,
      ) as UserDetail;
      if (!commentAuthor) throw new Error('Missing fixtures');

      cy.visit('/login');
      cy.login(commentAuthor.email, commentAuthor.password);
      cy.checkIfLoggedIn();
      cy.visit(`/blog/${editPostId}`);
      loadMoreCommentsIfPresent();
    });

    it(`shows "Edit" action only on user's comments`, () => {
      ownEditableComments.forEach((comment) => {
        cy.getByTestId(`comment-${comment.id}`)
          .contains('button', 'Edit')
          .should('exist');
      });

      cy.getByTestId(`comment-${anotherUserComment.id}`)
        .contains('button', 'Edit')
        .should('not.exist');
    });

    it(`changes comment to edit comment form with "Save" button and
        textarea with the content on click`, () => {
      cy.getByTestId(`comment-${ownEditableComments[0].id}`)
        .contains('button', 'Edit')
        .click();

      cy.getByTestId(`comment-${ownEditableComments[0].id}`).within(() => {
        cy.get('textarea').should('have.value', ownEditableComments[0].content);
      });
      cy.contains('button', 'Submit').should('exist');
    });

    it('changes back to normal comment on clicking "Cancel" within edit comment form', () => {
      cy.getByTestId(`comment-${ownEditableComments[0].id}`)
        .contains('button', 'Edit')
        .click();

      cy.getByTestId(`comment-${ownEditableComments[0].id}`)
        .contains('button', 'Edit')
        .click();

      cy.getByTestId(`comment-${ownEditableComments[0].id}`)
        .find('[data-testid="comment-edit-textarea"]')
        .should('not.exist');
    });

    it('selecting another comment for edit closes the previously opened edit form', () => {
      cy.getByTestId(`comment-${ownEditableComments[0].id}`)
        .contains('button', 'Edit')
        .click();
      cy.getByTestId(`comment-${ownEditableComments[0].id}`)
        .find('[data-testid="comment-edit-textarea"]')
        .should('exist');
      cy.getByTestId(`comment-${ownEditableComments[1].id}`)
        .contains('button', 'Edit')
        .click();

      cy.getByTestId(`comment-${ownEditableComments[0].id}`)
        .find('[data-testid="comment-edit-textarea"]')
        .should('not.exist');
      cy.getByTestId(`comment-${ownEditableComments[1].id}`)
        .find('[data-testid="comment-edit-textarea"]')
        .should('exist');
    });

    it(`successfully editing a comment hides form and displays
         edited comment in comment section`, () => {
      const commentToEdit = ownEditableComments[0];
      const editedContent = `Edited-${generateRandomString(8)}`;
      cy.intercept(
        'PATCH',
        API_ENDPOINTS.COMMENTS.BY_ID(editPostId, commentToEdit.id),
      ).as('editComment');

      cy.getByTestId(`comment-${commentToEdit.id}`)
        .contains('button', 'Edit')
        .click();
      createComment(editedContent, 'edit');

      cy.wait('@editComment');
      cy.getByTestId(`comment-${commentToEdit.id}`).within(() => {
        cy.getByTestId('comment-edit-textarea').should('not.exist');
        cy.contains('p', editedContent).should('exist');
      });
    });

    it('shows error message if trying to edit a non-existent comment', () => {
      const commentToEdit = ownEditableComments[0];
      const editedContent = `Edited-${generateRandomString(8)}`;
      cy.intercept(
        'PATCH',
        API_ENDPOINTS.COMMENTS.BY_ID(editPostId, commentToEdit.id),
        {
          success: false,
          error: {
            status: 404,
            message: 'Resource not found',
            errorCode: 'NOT_FOUND',
          },
        },
      ).as('editComment');

      cy.getByTestId(`comment-${commentToEdit.id}`)
        .contains('button', 'Edit')
        .click();
      createComment(editedContent, 'edit');

      cy.wait('@editComment');
      cy.getByTestId(`comment-${commentToEdit.id}`)
        .find('[data-testid="comment-edit-textarea"]')
        .should('exist');
      cy.getByTestId('error-message').should(
        'contain.text',
        'Resource not found',
      );
    });

    it('disables "Edit" button if logged in user is banned', () => {
      const bannedUser = testUsers.find(
        (u) => u.isBanned === true,
      ) as UserDetail;
      const bannedUserComment = testComments.find(
        (c) =>
          c.depth === 0 &&
          c.userId === bannedUser.id &&
          testPosts
            .filter((p) => p.status === 'PUBLISHED')
            .map((p) => p.id)
            .includes(c.postId),
      );
      if (!bannedUserComment) throw new Error('Missing fixtures');

      cy.logout();
      cy.visit('/login');
      cy.login(bannedUser.email, bannedUser.password);
      cy.checkIfLoggedIn();
      cy.visit(`/blog/${bannedUserComment.postId}`);
      loadMoreCommentsIfPresent();

      cy.getByTestId(`comment-${bannedUserComment.id}`)
        .contains('button', 'Edit')
        .should('be.disabled');
    });

    it(`does not show another edit form when clicking "Edit",
         when user is currently submitting edit`, () => {
      const firstComment = ownEditableComments[0];
      const secondComment = ownEditableComments[1];
      const editedContent = `Edited-${generateRandomString(8)}`;
      cy.intercept(
        'PATCH',
        API_ENDPOINTS.COMMENTS.BY_ID(editPostId, firstComment.id),
        (req) => {
          req.on('response', (res) => {
            res.setDelay(3000);
          });
        },
      ).as('editComment');

      cy.getByTestId(`comment-${firstComment.id}`)
        .contains('button', 'Edit')
        .click();
      createComment(editedContent, 'edit');

      cy.getByTestId(`comment-${secondComment.id}`)
        .contains('button', 'Edit')
        .click();
      cy.getByTestId(`comment-${secondComment.id}`)
        .find('[data-testid="comment-edit-textarea"]')
        .should('not.exist');

      cy.wait('@editComment');
    });
  });
});
