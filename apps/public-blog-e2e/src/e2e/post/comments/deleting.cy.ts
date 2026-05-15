import { generateRandomString } from '@dans-coding-world/helpers';
import {
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

describe('Comments - commenting', () => {
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
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC'
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

    it('does not show delete button to comments', () => {
      cy.contains('button', 'Delete').should('not.exist');
    });
  });

  context('Authenticated users', () => {
    let deletePostId = 0;
    let ownDeletableComments: Comment[] = [];
    let anotherUserComment: Comment;

    beforeEach(() => {
      const publishedPostIds = new Set(
        testPosts.filter((p) => p.status === 'PUBLISHED').map((p) => p.id)
      );
      const commentsGroupedByPostId = Object.entries(
        Object.groupBy(
          testComments.filter(
            (c) =>
              c.depth === 0 &&
              publishedPostIds.has(c.postId) &&
              testUsers.map((u) => u.id).includes(c.userId)
          ),
          ({ postId }) => postId
        )
      );
      const matchingEntry = commentsGroupedByPostId.find(([, group]) => {
        if (!group || group.length < 2) return false;
        const groupedByAuthor = Object.values(
          Object.groupBy(group, ({ userId }) => userId)
        );
        return groupedByAuthor.some(
          (comments) => comments && comments.length >= 2
        );
      });

      if (!matchingEntry)
        throw new Error(
          'Missing fixtures - post with more than 2 comments by same user at depth 0'
        );
      deletePostId = Number(matchingEntry[0]);
      const postComments = matchingEntry[1] as Comment[];
      ownDeletableComments = Object.values(
        Object.groupBy(postComments, ({ userId }) => userId)
      ).find(
        (group) =>
          group &&
          group.length >= 2 &&
          testUsers
            .filter((u) => u.role === 'USER' || u.role === 'AUTHOR')
            .map((u) => u.id)
            .includes(group[0].userId)
      ) as Comment[];
      if (!ownDeletableComments || ownDeletableComments.length < 2)
        throw new Error('Missing fixtures');

      anotherUserComment = postComments.find(
        (c) => c.userId !== ownDeletableComments[0].userId
      ) as Comment;
      if (!anotherUserComment) throw new Error('Missing fixtures');

      const commentAuthor = testUsers.find(
        (u) => u.id === ownDeletableComments[0].userId
      ) as UserDetail;
      if (!commentAuthor) throw new Error('Missing fixtures');

      cy.visit('/login');
      cy.login(commentAuthor.email, commentAuthor.password);
      cy.checkIfLoggedIn();
      cy.visit(`/blog/${deletePostId}`);
      loadMoreCommentsIfPresent();
    });

    it(`shows "Delete" action only on user's comments`, () => {
      ownDeletableComments.forEach((comment) => {
        cy.getByTestId(`comment-${comment.id}`)
          .contains('button', 'Delete')
          .should('exist');
      });

      cy.getByTestId(`comment-${anotherUserComment.id}`)
        .contains('button', 'Delete')
        .should('not.exist');
    });

    it(`shows "Delete" action on every comment when logged in as admin`, () => {
      const adminUser = testUsers.find((u) => u.role === 'ADMIN') as UserDetail;
      if (!adminUser) throw new Error('Missing admin fixture');

      cy.logout();
      cy.visit('/login');
      cy.login(adminUser.email, adminUser.password);
      cy.checkIfLoggedIn();
      cy.visit(`/blog/${deletePostId}`);
      loadMoreCommentsIfPresent();

      ownDeletableComments.forEach((comment) => {
        cy.getByTestId(`comment-${comment.id}`)
          .contains('button', 'Delete')
          .should('exist');
      });
      cy.getByTestId(`comment-${anotherUserComment.id}`)
        .contains('button', 'Delete')
        .should('exist');
    });

    it('opens modal for confirming delete', () => {
      cy.getByTestId(`comment-${ownDeletableComments[0].id}`)
        .contains('button', 'Delete')
        .click();

      cy.get('dialog')
        .should('be.visible')
        .within(() => {
          cy.contains('h2', 'Confirm Delete');
          cy.contains('Are you sure you want to delete this comment?');
          cy.contains('button', 'Yes');
          cy.contains('button', 'No');
        });
    });

    it('hides delete confirmation modal on clicking "No"', () => {
      cy.getByTestId(`comment-${ownDeletableComments[0].id}`)
        .contains('button', 'Delete')
        .click();
      cy.get('dialog').should('be.visible');
      cy.get('dialog').contains('button', 'No').click();
      cy.get('dialog').should('not.exist');
      cy.getByTestId(`comment-${ownDeletableComments[0].id}`)
        .contains('button', 'Delete')
        .should('exist');
    });

    it('should display error if comment does not exist anymore', () => {
      const commentToDelete = ownDeletableComments[0];
      cy.intercept(
        'DELETE',
        API_ENDPOINTS.COMMENTS.BY_ID(deletePostId, commentToDelete.id),
        {
          success: false,
          error: {
            status: 404,
            message: 'Resource not found',
            errorCode: 'NOT_FOUND',
          },
        }
      ).as('deleteComment');

      cy.getByTestId(`comment-${commentToDelete.id}`)
        .contains('button', 'Delete')
        .click();
      cy.get('dialog').contains('button', 'Yes').click();

      cy.wait('@deleteComment');
      cy.get('dialog').within(() => {
        cy.getByTestId('error-message').should(
          'contain.text',
          'Resource not found'
        );
      });
    });

    it('should remove comment from comment section on confirming delete', () => {
      const commentToDelete = ownDeletableComments[1];
      cy.intercept(
        'DELETE',
        API_ENDPOINTS.COMMENTS.BY_ID(deletePostId, commentToDelete.id)
      ).as('deleteComment');

      cy.getByTestId(`comment-${commentToDelete.id}`)
        .contains('button', 'Delete')
        .click();
      cy.get('dialog').contains('button', 'Yes').click();

      cy.wait('@deleteComment');
      cy.getByTestId(`comment-${commentToDelete.id}`).should('not.exist');
    });

    it('should delete replies related to deleted comment on confirming delete', () => {
      const parentComment = ownDeletableComments[0];
      const replyContent = `Reply-${generateRandomString(8)}`;

      cy.getByTestId(`comment-${parentComment.id}`)
        .contains('button', 'Reply')
        .click();
      createComment(replyContent, 'reply');

      cy.getByTestId(`comment-${parentComment.id}`)
        .contains('p', replyContent)
        .should('exist');

      cy.intercept(
        'DELETE',
        API_ENDPOINTS.COMMENTS.BY_ID(deletePostId, parentComment.id)
      ).as('deleteParentComment');

      cy.getByTestId(`comment-${parentComment.id}`)
        .contains('button', 'Delete')
        .click();
      cy.get('dialog').contains('button', 'Yes').click();

      cy.wait('@deleteParentComment');
      cy.getByTestId(`comment-${parentComment.id}`).should('not.exist');
      cy.contains('p', replyContent).should('not.exist');
    });
  });
});
