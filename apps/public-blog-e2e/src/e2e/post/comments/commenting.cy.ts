import { generateRandomString } from '@dans-coding-world/helpers';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import {
  Comment,
  CommentWithReplies,
  Post,
  Profile,
  User,
} from '@dans-coding-world/prisma-schema';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  generateMockPostCommentsResponse,
  generateMockPostResponse,
  generateMockCommentResponse,
} from '@dans-coding-world/shared-post-testing';
import { UserDetail } from '@dans-coding-world/user-data-access';
import { generateRandomUser } from '@dans-coding-world/shared-user-testing';

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

  function mockBlogPostPage({
    commentsLength = 4,
    replyLevels = 2,
  }: { commentsLength?: number; replyLevels?: number } = {}) {
    const mockPostResponse = generateMockPostResponse({});
    if (!mockPostResponse.data) throw new Error('missing data');

    const testPostId = mockPostResponse.data.post.id;
    cy.intercept(
      `${API_ENDPOINTS.POSTS.BY_ID(testPostId)}*`,
      mockPostResponse
    ).as('getPostResponse');

    const mockCommentsResponse = generateMockPostCommentsResponse({
      postId: testPostId,
      length: commentsLength,
      pageSize: 10,
      replyLevels,
    });

    cy.intercept(
      `${API_ENDPOINTS.COMMENTS.LIST(testPostId)}*`,
      mockCommentsResponse
    ).as('getPostCommentsResponse');

    cy.visit(`/blog/${testPostId}`);
    cy.wait('@getPostResponse').then(() => {
      cy.wait('@getPostCommentsResponse');
    });
    return { testPostId, mockCommentsResponse };
  }

  it('should include text area for adding comments', () => {
    mockBlogPostPage();
    cy.get('textarea').should('exist');
  });

  context('Unauthenticated users', () => {
    beforeEach(() => {
      mockBlogPostPage();
    });

    it('disables add comment text area for logged out users', () => {
      cy.get('textarea').should('be.disabled');
    });

    it('does not show reply button to comments', () => {
      cy.contains('button', 'Reply').should('not.exist');
    });

    it('does not show delete button to comments', () => {
      cy.contains('button', 'Delete').should('not.exist');
    });

    it('does not show edit button to comments', () => {
      cy.contains('button', 'Edit').should('not.exist');
    });

    it('prompts users to login when selecting text area', () => {
      cy.get('textarea').parent().click();

      cy.get('dialog')
        .should('exist')
        .and('be.visible')
        .within(() => {
          cy.contains('a', 'Sign in now');
        });
    });

    it('navigates to login page from "call to action" login dialog', () => {
      cy.get('textarea').parent().click();

      cy.get('dialog')
        .should('exist')
        .and('be.visible')
        .within(() => {
          cy.contains('a', 'Sign in now').click();
          cy.url().should('match', /login$/);
        });
    });
  });

  context('Authenticated users', () => {
    const getEnabledCommentTextarea = () =>
      cy.getByTestId('comment-add-textarea').should('not.be.disabled');

    beforeEach(() => {
      const randomUser = Cypress._.sample(
        testUsers.filter((u) => u.isBanned === false)
      ) as UserDetail;

      cy.visit('/login');
      cy.login(randomUser.email, randomUser.password);
      cy.url().should('match', /\/blog$/);
      cy.checkIfLoggedIn();
      cy.contains(randomUser.email).should('exist');
      cy.contains('Continue reading').click();
    });

    it('enables text area for adding comments', () => {
      getEnabledCommentTextarea();
    });

    it('reflects comment length in a counter near textarea', () => {
      const randomLen = Cypress._.random(
        COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH
      );
      const content = generateRandomString(randomLen);
      getEnabledCommentTextarea().type(content, { delay: 0 });
      getEnabledCommentTextarea()
        .parent()
        .within(() => {
          cy.contains(
            `${randomLen} / ${COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH}`
          );
        });
    });

    it('does not allow typing past certain limit', () => {
      const content = generateRandomString(
        COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH
      );
      getEnabledCommentTextarea().type(content, { delay: 0 });
      getEnabledCommentTextarea().type('bababui!');

      getEnabledCommentTextarea()
        .invoke('val')
        .then((val) => {
          expect(val).to.equal(content);
        });
    });

    it('enables submit button only after a character is typed', () => {
      getEnabledCommentTextarea().type(' ');
      cy.get('button[type="submit"]').should('be.disabled');
      getEnabledCommentTextarea().type('bababui!');
      cy.get('button[type="submit"]').should('not.be.disabled');
    });

    context('On the post', () => {
      it(`creates comment and adds it to comment section
         after entering valid content and submitting`, () => {
        const content = `Comment-${generateRandomString(8)}`;
        createComment(content, 'add');

        getEnabledCommentTextarea().should('have.value', '');
        cy.get('[data-testid^="comment-"]') // ^ means “starts with”
          .contains('p', content)
          .should('exist');
      });

      it('shows notification if trying to comment on a non-existent post', () => {
        const { testPostId } = mockBlogPostPage();

        cy.intercept('POST', API_ENDPOINTS.COMMENTS.LIST(testPostId), {
          success: false,
          error: {
            status: 404,
            message: 'Post not found',
            errorCode: 'NOT_FOUND',
          },
        }).as('createCommentOnMissingPost');

        const content = `Comment-${generateRandomString(8)}`;
        createComment(content, 'add');

        cy.wait('@createCommentOnMissingPost');
        cy.getByTestId('error-message').should(
          'contain.text',
          'Post not found'
        );
      });

      it('hides comment form and displays "banned" message if user banned', () => {
        const bannedUser = testUsers.find(
          (u) => u.isBanned === true
        ) as UserDetail;
        cy.logout();
        cy.visit('/login');
        cy.login(bannedUser.email, bannedUser.password);
        cy.checkIfLoggedIn();
        cy.contains('Continue reading').click();

        cy.getByTestId('comment-add-textarea').should('not.exist');
        cy.contains(/You are banned/i);
      });
    });

    context('On another comment', () => {
      let POST_UAT_ID = 0;

      beforeEach(() => {
        const publicPost = testPosts.find(
          (p) =>
            p.status === 'PUBLISHED' &&
            testComments.map((c) => c.postId).includes(p.id)
        );
        if (!publicPost) throw new Error('Missing fixtures');
        POST_UAT_ID = publicPost.id;
        cy.visit('/blog/' + POST_UAT_ID);
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
            publicPosts.map((p) => p.id).includes(c.postId)
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
          (c) => c.postId === POST_UAT_ID && c.depth === 0
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
          (c) => c.postId === POST_UAT_ID && c.depth === 0
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
          'Resource not found'
        );
      });

      it('disables "Reply" button if logged in user is banned', () => {
        const bannedUser = testUsers.find(
          (u) => u.isBanned === true
        ) as UserDetail;
        cy.logout();
        cy.visit('/login');
        cy.login(bannedUser.email, bannedUser.password);
        cy.checkIfLoggedIn();

        const publicPosts = testPosts.filter((p) => p.status === 'PUBLISHED');
        const deeplyNestedComment = testComments.find(
          (c) =>
            c.depth === COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH - 1 &&
            publicPosts.map((p) => p.id).includes(c.postId)
        );

        if (!deeplyNestedComment) throw new Error('Missing test comment');

        const rootComment = getRootCommentFromReply(deeplyNestedComment);
        cy.visit(`/blog/${rootComment.postId}`);

        cy.get(`[data-testid^="comment-${rootComment.id}"]`)
          .contains('button', 'Reply')
          .should('be.disabled');
      });

      it(`does not show another reply form when clicking "Reply",
         when user is currently submitting reply`, () => {
        const commentsGroupedByPostId = Object.groupBy(
          testComments.filter(
            (c) =>
              c.depth === 0 &&
              testPosts
                .filter((p) => p.status === 'PUBLISHED')
                .map((p) => p.id)
                .includes(c.postId)
          ),
          ({ postId }) => postId
        );
        const [firstComment, secondComment] = Object.values(
          commentsGroupedByPostId
        ).find((group) => group && group.length >= 2) as Comment[];
        if (!firstComment || !secondComment)
          throw new Error('Missing fixtures');
        cy.visit(`/blog/${firstComment.postId}`);

        cy.intercept(
          'POST',
          API_ENDPOINTS.COMMENTS.LIST(firstComment.postId),
          (req) => {
            req.on('response', (res) => {
              res.setDelay(3000); // 3 seconds delay
            });
          }
        ).as('createReply');

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

    context('Editing comments', () => {
      let editPostId = 0;
      let ownEditableComments: Comment[] = [];
      let anotherUserComment: Comment;

      beforeEach(() => {
        const publishedPostIds = new Set(
          testPosts.filter((p) => p.status === 'PUBLISHED').map((p) => p.id)
        );
        const commentsGroupedByPostId = Object.entries(
          Object.groupBy(
            testComments.filter(
              (c) => c.depth === 0 && publishedPostIds.has(c.postId)
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
        editPostId = Number(matchingEntry[0]);
        const postComments = matchingEntry[1] as Comment[];
        ownEditableComments = Object.values(
          Object.groupBy(postComments, ({ userId }) => userId)
        ).find((group) => group && group.length >= 2) as Comment[];
        if (!ownEditableComments || ownEditableComments.length < 2)
          throw new Error('Missing fixtures');

        anotherUserComment = postComments.find(
          (c) => c.userId !== ownEditableComments[0].userId
        ) as Comment;
        if (!anotherUserComment) throw new Error('Missing fixtures');

        const commentAuthor = testUsers.find(
          (u) => u.id === ownEditableComments[0].userId
        ) as UserDetail;
        if (!commentAuthor) throw new Error('Missing fixtures');

        cy.logout();
        cy.visit('/login');
        cy.login(commentAuthor.email, commentAuthor.password);
        cy.checkIfLoggedIn();
        cy.visit(`/blog/${editPostId}`);
        getEnabledCommentTextarea();
        cy.get('body').then(($body) => {
          const selector = '[aria-label="Load more comments"]';
          if ($body.find(selector).length) {
            cy.get(selector).click();
          }
        });
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
          cy.get('textarea').should(
            'have.value',
            ownEditableComments[0].content
          );
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
          API_ENDPOINTS.COMMENTS.BY_ID(editPostId, commentToEdit.id)
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
          }
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
          'Resource not found'
        );
      });

      it('disables "Edit" button if logged in user is banned', () => {
        const bannedUser = testUsers.find(
          (u) => u.isBanned === true
        ) as UserDetail;
        const bannedUserComment = testComments.find(
          (c) =>
            c.depth === 0 &&
            c.userId === bannedUser.id &&
            testPosts
              .filter(
                (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC'
              )
              .map((p) => p.id)
              .includes(c.postId)
        );
        if (!bannedUserComment) throw new Error('Missing fixtures');

        cy.logout();
        cy.visit('/login');
        cy.login(bannedUser.email, bannedUser.password);
        cy.checkIfLoggedIn();
        cy.visit(`/blog/${bannedUserComment.postId}`);

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
          }
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

    context('Deleting comments', () => {
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
                testUsers
                  .filter((u) => u.role === 'USER')
                  .map((u) => u.id)
                  .includes(c.userId)
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
        ).find((group) => group && group.length >= 2) as Comment[];
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

        cy.logout();
        cy.visit('/login');
        cy.login(commentAuthor.email, commentAuthor.password);
        cy.checkIfLoggedIn();
        cy.visit(`/blog/${deletePostId}`);
        getEnabledCommentTextarea();
        cy.get('body').then(($body) => {
          const selector = '[aria-label="Load more comments"]';
          if ($body.find(selector).length) {
            cy.get(selector).click();
          }
        });
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

      it(`shows "Delete" action on every user comment when logged in as admin`, () => {
        const adminUser = testUsers.find(
          (u) => u.role === 'ADMIN'
        ) as UserDetail;
        if (!adminUser) throw new Error('Missing admin fixture');

        cy.logout();
        cy.visit('/login');
        cy.login(adminUser.email, adminUser.password);
        cy.checkIfLoggedIn();
        cy.visit(`/blog/${deletePostId}`);
        getEnabledCommentTextarea();
        cy.get('body').then(($body) => {
          const selector = '[aria-label="Load more comments"]';
          if ($body.find(selector).length) {
            cy.get(selector).click();
          }
        });

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

  function getRootCommentFromReply(reply: Comment) {
    const parentComment = testComments.find(
      (c) => c.id === reply.threadParentId
    );
    if (!parentComment) return reply;
    else return getRootCommentFromReply(parentComment);
  }
});

function createComment(content: string, type: 'add' | 'reply' | 'edit') {
  cy.getByTestId(`comment-${type}-textarea`).clear();
  cy.getByTestId(`comment-${type}-textarea`).type(content);
  cy.getByTestId(`comment-${type}-textarea`)
    .siblings('.comment-actions')
    .find('button[type="submit"]')
    .click();
}
