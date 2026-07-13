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
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';

context('Comments - replying', () => {
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

    it('does not show reply button to comments', () => {
      cy.contains('button', 'Reply').should('not.exist');
    });
  });

  context('Authenticated users', () => {
    let POST_UAT_ID = 0;

    beforeEach(() => {
      const randomUser = Cypress._.sample(
        testUsers.filter((u) => u.isBanned === false),
      ) as UserDetail;

      cy.visit('/login');
      cy.login(randomUser.email, randomUser.password);
      cy.url().should('match', /\/blog$/);
      cy.checkIfLoggedIn();
      cy.contains(randomUser.email).should('exist');
      const publicPost = testPosts.find(
        (p) =>
          p.status === 'PUBLISHED' &&
          testComments.map((c) => c.postId).includes(p.id),
      );
      if (!publicPost) throw new Error('Missing fixtures');
      POST_UAT_ID = publicPost.id;
      cy.visit(`/blog/${POST_UAT_ID}`);
      loadMoreCommentsIfPresent();
    });

    it('displays "Reply" button for existing comments', () => {
      cy.contains('button', 'Reply').should('exist');
    });

    it('displays reply textarea after clicking "Reply" button', () => {
      cy.contains('button', 'Reply').first().click();
      cy.getByTestId('comment-reply-textarea').should('be.visible');
    });

    it('does not display "Reply" button for comments which are nested at max depth', () => {
      const publicPosts = testPosts.filter((p) => p.status === 'PUBLISHED');
      const deeplyNestedComment = testComments.find(
        (c) =>
          c.depth === COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH - 1 &&
          publicPosts.map((p) => p.id).includes(c.postId),
      );

      if (!deeplyNestedComment) throw new Error('Missing test comment');

      const rootComment = getRootCommentFromReply(deeplyNestedComment);
      cy.visit(`/blog/${rootComment.postId}`);
      cy.get(`ul[aria-label="Post comments"]`).within(() => {
        cy.contains('p', rootComment.content)
          .closest('li')
          .within(() => {
            let count = 1;
            while (count++ < COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH)
              cy.contains('button', /View Replies/i).click({
                multiple: true,
              });
          });
      });
      cy.getByTestId(`comment-${deeplyNestedComment.id}`)
        .should('exist')
        .contains('button', 'Reply')
        .should('not.exist');
    });

    it('shows added comment after replying and hides reply textarea form', () => {
      const commentToReplyTo = testComments.find(
        (c) => c.postId === POST_UAT_ID && c.depth === 0,
      ) as Comment;

      const content = `Comment-${generateRandomString(8)}`;

      cy.getByTestId(`comment-${commentToReplyTo.id}`)
        .should('exist')
        .contains('button', 'Reply')
        .click();

      cy.getByTestId('comment-reply-textarea').should('exist');
      createComment(content, 'reply');

      cy.getByTestId('comment-reply-textarea').should('not.exist');
      cy.get(`[data-testid^="comment-${commentToReplyTo.id}"]`)
        .contains('p', content)
        .should('exist');
    });

    it('shows error message if trying to reply on a non-existent comment', () => {
      const commentToReplyTo = testComments.find(
        (c) => c.postId === POST_UAT_ID && c.depth === 0,
      ) as Comment;
      cy.intercept('POST', API_ENDPOINTS.COMMENTS.LIST(POST_UAT_ID), {
        success: false,
        error: {
          status: 404,
          message: 'Resource not found',
          errorCode: 'NOT_FOUND',
        },
      }).as('createReply');

      const content = `Comment-${generateRandomString(8)}`;

      cy.getByTestId(`comment-${commentToReplyTo.id}`)
        .contains('button', 'Reply')
        .click();

      createComment(content, 'reply');

      cy.wait('@createReply');
      cy.getByTestId('comment-reply-textarea').should('exist');
      cy.get(`[data-testid^="comment-${commentToReplyTo.id}"]`)
        .contains('p', content)
        .should('not.exist');

      cy.getByTestId('error-message').should(
        'contain.text',
        'Resource not found',
      );
    });

    it('disables "Reply" button if logged in user is banned', () => {
      const bannedUser = testUsers.find(
        (u) => u.isBanned === true,
      ) as UserDetail;
      cy.logout();
      cy.visit('/login');
      cy.login(bannedUser.email, bannedUser.password);
      cy.checkIfLoggedIn();

      const publicPosts = testPosts.filter((p) => p.status === 'PUBLISHED');
      const deeplyNestedComment = testComments.find(
        (c) =>
          c.depth === COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH - 1 &&
          publicPosts.map((p) => p.id).includes(c.postId),
      );

      if (!deeplyNestedComment) throw new Error('Missing test comment');

      const rootComment = getRootCommentFromReply(deeplyNestedComment);
      cy.visit(`/blog/${rootComment.postId}`);

      cy.get(`[data-testid^="comment-${rootComment.id}"]`)
        .contains('button', 'Reply')
        .should('be.disabled');
    });

    // Flaky
    it(`does not show another reply form when clicking "Reply",
         when user is currently submitting reply`, () => {
      const [firstComment, secondComment] = testComments.filter(
        (c) => c.postId === POST_UAT_ID,
      ) as Comment[];
      if (!firstComment || !secondComment) throw new Error('Missing fixtures');

      cy.intercept('POST', API_ENDPOINTS.COMMENTS.LIST(POST_UAT_ID), (req) => {
        req.on('response', (res) => {
          res.setDelay(3000); // 3 seconds delay
        });
      }).as('createReply');

      const content = `Comment-${generateRandomString(8)}`;

      cy.getByTestId(`comment-${firstComment.id}`)
        .contains('button', 'Reply')
        .click();
      createComment(content, 'reply');
      cy.getByTestId(`comment-${secondComment.id}`)
        .contains('button', 'Reply')
        .click();
      cy.getByTestId(`comment-${secondComment.id}`)
        .contains('textarea')
        .should('not.exist');
      cy.wait('@createReply');
    });
  });

  function getRootCommentFromReply(reply: Comment) {
    const parentComment = testComments.find(
      (c) => c.id === reply.threadParentId,
    );
    if (!parentComment) return reply;
    else return getRootCommentFromReply(parentComment);
  }
});
