import { generateRandomString } from '@dans-coding-world/helpers';
import {
  COMMENT_CONSTRAINTS,
  PAGINATION,
} from '@dans-coding-world/shared-constants';
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
import { mockBlogPostPage } from './helpers/comments.helper';

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
        testUsers.filter((u) => u.isBanned === false),
      ) as UserDetail;

      cy.visit('/login');
      cy.login(randomUser.email, randomUser.password);
      cy.url().should('match', /\/blog$/);
      cy.checkIfLoggedIn();
      cy.contains(randomUser.email).should('exist');
      cy.contains('Continue reading').click();
      loadMoreCommentsIfPresent();
    });

    it('enables text area for adding comments', () => {
      getEnabledCommentTextarea();
    });

    it('reflects comment length in a counter near textarea', () => {
      const randomLen = Cypress._.random(
        COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH,
      );
      const content = generateRandomString(randomLen);
      getEnabledCommentTextarea().type(content, { delay: 0 });
      getEnabledCommentTextarea()
        .parent()
        .within(() => {
          cy.contains(
            `${randomLen} / ${COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH}`,
          );
        });
    });

    it('does not allow typing past certain limit', () => {
      const content = generateRandomString(
        COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH,
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
      cy.getByTestId('error-message').should('contain.text', 'Post not found');
    });

    it('hides comment form and displays "banned" message if user banned', () => {
      const bannedUser = testUsers.find(
        (u) => u.isBanned === true,
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
});

function createComment(content: string, type: 'add' | 'reply' | 'edit') {
  cy.getByTestId(`comment-${type}-textarea`).clear();
  cy.getByTestId(`comment-${type}-textarea`).type(content);
  cy.getByTestId(`comment-${type}-textarea`)
    .siblings('.comment-actions')
    .find('button[type="submit"]')
    .click();
}

function loadMoreCommentsIfPresent() {
  cy.contains('h3', /comments/i).then(($heading) => {
    const text = $heading.text();
    const match = text.match(/\((\d+)\)/); // extract number inside parentheses

    if (!match) return;

    const count = Number(match[1]);

    if (count > PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE) {
      cy.get('[aria-label="Load more comments"]').click();
    }
  });
}
