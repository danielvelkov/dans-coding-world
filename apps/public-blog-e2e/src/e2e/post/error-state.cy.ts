import { Post, Profile, User } from '@dans-coding-world/prisma-schema';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockPostResponse } from '@dans-coding-world/shared-post-testing';
import { UserDetail } from '@dans-coding-world/user-data-access';

describe('Post - error state', () => {
  let testPosts: Post[];
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

    cy.task('db:seed-posts', {
      options: { useDefaults: true, clearExisting: true },
    }).then((posts) => {
      testPosts = posts as Post[];
      if (!testPosts || !testPosts.length)
        throw new Error('Missing post fixtures');
    });
  });

  it('displays 404 not found page if post does not exist', () => {
    cy.visit('/blog/99999');
    cy.contains('h1', '404');
    cy.contains(/not found/i);
  });

  it('displays generic error page on invalid blog post id', () => {
    cy.visit('/blog/a');
    cy.contains(/something.* wrong/i);
  });

  it('displays 500 page if something went wrong with the server', () => {
    const mockPostResponse = generateMockPostResponse({});
    mockPostResponse.data = null;
    mockPostResponse.success = false;
    mockPostResponse.error = {
      status: 500,
      errorCode: 'SER01',
      message: 'Server failed to respond',
    };

    const testPostId = 1;
    cy.intercept(
      `${API_ENDPOINTS.POSTS.BY_ID(testPostId)}*`,
      mockPostResponse
    ).as('getPostResponse');

    cy.visit(`/blog/${testPostId}`);

    cy.wait('@getPostResponse').then(() => {
      cy.contains('h1', '500');
      cy.contains(/server error/i);
    });
  });

  context('Unauthenticated user', () => {
    it('displays 403 forbidden page if post is private', () => {
      const privatePost = testPosts.find((p) => p.status !== 'PUBLISHED');
      if (!privatePost) throw new Error('Missing post fixture');

      cy.visit(`/blog/${privatePost.id}`);
      cy.contains('h1', '403');
      cy.contains(/you do not have permissions/i);
    });

    it('navigates to login page if post is members-only', () => {
      const membersOnlyPost = testPosts.find(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'MEMBERS_ONLY'
      );
      if (!membersOnlyPost) throw new Error('Missing post fixture');

      cy.visit(`/blog/${membersOnlyPost.id}`);
      cy.url().should('include', `/login`);
    });
  });

  context('Authenticated user', () => {
    it('displays 403 forbidden page if post is private and user is not the author', () => {
      const privatePost = testPosts.find((p) => p.status !== 'PUBLISHED');
      if (!privatePost) throw new Error('Missing post fixture');

      const randomUser = Cypress._.sample(
        testUsers.filter(
          (u) => u.id !== privatePost.authorId && u.role === 'AUTHOR'
        )
      ) as UserDetail;
      cy.visit('/login');
      cy.login(randomUser.email, randomUser.password);
      cy.contains('h1', 'Login').should('not.exist');

      cy.visit(`/blog/${privatePost.id}`);
      cy.contains('h1', '403');
      cy.contains(/you do not have permissions/i);
    });

    // TODO: im not sure about this feature, maybe hide all private posts
    it('shows post if its private and user is the author', () => {
      const privatePost = testPosts.find((p) => p.status !== 'PUBLISHED');
      if (!privatePost) throw new Error('Missing post fixture');

      const author = testUsers.find(
        (u) => u.id === privatePost.authorId
      ) as UserDetail;
      cy.visit('/login');
      cy.login(author.email, author.password);
      cy.contains('h1', 'Login').should('not.exist');

      cy.visit(`/blog/${privatePost.id}`);
      cy.contains('h1', '403').should('not.exist');
      cy.contains('h1', privatePost.title).should('exist');
    });
  });
});
