import { generateRandomString } from '@dans-coding-world/helpers';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { Profile, User } from '@dans-coding-world/prisma-schema';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  generateMockPostCommentsResponse,
  generateMockPostResponse,
} from '@dans-coding-world/shared-post-testing';
import { UserDetail } from '@dans-coding-world/user-data-access';

describe('Comments - commenting', () => {
  const testUsers: UserDetail[] = [];

  before(() => {
    cy.task('db:seed-users', {
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
  });

  function mockBlogPostPage() {
    const mockPostResponse = generateMockPostResponse({});
    if (!mockPostResponse.data) throw new Error('missing data');

    const testPostId = mockPostResponse.data.post.id;
    cy.intercept(
      `${API_ENDPOINTS.POSTS.BY_ID(testPostId)}*`,
      mockPostResponse
    ).as('getPostResponse');

    const mockCommentsResponse = generateMockPostCommentsResponse({
      postId: testPostId,
      length: 4,
      pageSize: 10,
      replyLevels: 2,
    });

    cy.intercept(
      `${API_ENDPOINTS.COMMENTS.LIST(testPostId)}*`,
      mockCommentsResponse
    ).as('getPostCommentsResponse');

    cy.visit(`/blog/${testPostId}`);
    cy.wait('@getPostResponse').then(() => {
      cy.wait('@getPostCommentsResponse');
    });
  }

  beforeEach(() => {
    mockBlogPostPage();
  });

  it('should include text area for adding comments', () => {
    cy.get('textarea').should('exist');
  });

  context('Unauthenticated users', () => {
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
    function loginAsRandomUser() {
      const randomUser = Cypress._.sample(testUsers) as UserDetail;
      cy.contains(randomUser.email).should('not.exist');
      cy.contains('a', 'Login').should('exist').click();
      cy.login(randomUser.email, randomUser.password);
      cy.url().should('match', /\/blog$/);
      return randomUser;
    }

    beforeEach(() => {
      cy.visit('/login');
      loginAsRandomUser();
      mockBlogPostPage();
    });

    it('enables text area for adding comments', () => {
      cy.get('textarea').should('not.be.disabled');
    });

    it('reflects comment length in a counter near textarea', () => {
      const randomLen = Cypress._.random(
        COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH
      );
      const content = generateRandomString(randomLen);
      cy.get('textarea').type(content, { delay: 0 });
      cy.get('textarea')
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
      cy.get('textarea').type(content, { delay: 0 });
      cy.get('textarea').type('bababui!');

      cy.get('textarea')
        .invoke('val')
        .then((val) => {
          expect(val).to.equal(content);
        });
    });

    it('enables submit button only after a character is typed', () => {
      cy.get('textarea').type(' ');
      cy.get('button[type="submit"]').should('be.disabled');
      cy.get('textarea').type('bababui!');
      cy.get('button[type="submit"]').should('not.be.disabled');
    });

    // TODO:
    it('creates comment after entering valid content and submitting');
    it('allows replying to another users comment');
    it('replying to comments 3 levels deep should not be possible');
    it('allows editing own user comments');
    it('shows if comment was edited by user');
  });
});
