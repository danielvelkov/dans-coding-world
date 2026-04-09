import { Post, Profile, User } from '@dans-coding-world/prisma-schema';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { UserDetail } from '@dans-coding-world/user-data-access';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@dans-coding-world/shared-constants';

describe('User - login', () => {
  const testUsers: UserDetail[] = [];
  const testPosts: Post[] = [];

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
      testPosts.push(...(posts as Post[]));
      if (!testPosts || !testPosts.length)
        throw new Error('Missing post fixtures');
    });
  });

  context('Login page', () => {
    beforeEach(() => cy.visit('/login'));

    it(`on valid login, the server returns access and refresh tokens
       as HTTP-only cookies in "Set-Cookie" header`, () => {
      const randomUser = Cypress._.sample(testUsers) as UserDetail;
      cy.intercept(`${API_ENDPOINTS.AUTH.LOGIN}*`).as('login');
      cy.login(randomUser.email, randomUser.password);
      cy.wait('@login')
        .its('response.headers.set-cookie')
        .then((cookies: string[]) => {
          expect(cookies).to.satisfy(
            (list: string[]) =>
              list.some(
                (c) =>
                  c.startsWith(ACCESS_TOKEN_COOKIE) ||
                  c.startsWith(REFRESH_TOKEN_COOKIE)
              ) && list.every((c) => c.includes('HttpOnly'))
          );
        });
    });

    it('navigates to /blog on login', () => {
      const randomUser = Cypress._.sample(testUsers) as UserDetail;
      cy.login(randomUser.email, randomUser.password);
      cy.url().should('match', /\/blog$/);
    });

    it('navigates to /blog if already logged in and visiting /login page', () => {
      const randomUser = Cypress._.sample(testUsers) as UserDetail;
      cy.login(randomUser.email, randomUser.password);
      cy.url().should('match', /\/blog$/);
    });

    it('changes login button to loading spinner on login button click', () => {
      const randomUser = Cypress._.sample(testUsers) as UserDetail;
      cy.intercept('POST', API_ENDPOINTS.AUTH.LOGIN).as('login');
      cy.contains('button', 'Login');
      cy.login(randomUser.email, randomUser.password);
      cy.contains('button', 'Login').should('not.exist');
      cy.contains('button', 'Logging in…').should('exist');
      cy.wait('@login');
    });

    context('validation', () => {
      it('shows validation message if invalid email', () => {
        cy.login('notAnEmail', 'password', { waitForRequest: false });
        cy.contains('Please enter a valid email address');
      });

      it('shows error message on invalid credentials', () => {
        const randomUser = Cypress._.sample(testUsers) as UserDetail;
        cy.login(randomUser.email + 'dingus', randomUser.password + '123');
        cy.getByTestId('login-error')
          .should('exist')
          .should('contain.text', 'Provided credentials are invalid');
      });

      it('shows error message on wrong password', () => {
        const randomUser = Cypress._.sample(testUsers) as UserDetail;
        cy.login(randomUser.email, randomUser.password + '123');
        cy.getByTestId('login-error')
          .should('exist')
          .should('contain.text', 'Provided password is wrong');
      });
    });
  });

  context('Redirect back after login', () => {
    it(`if selecting locked members-only posts, 
       AFTER redirecting to login page,
       it navigates back to post on login`, () => {
      const membersOnlyPost = Cypress._.sample(
        testPosts.filter(
          (p) => p.visibility === 'MEMBERS_ONLY' && p.status === 'PUBLISHED'
        )
      ) as Post;

      if (!membersOnlyPost) throw new Error('Missing members only post');

      cy.visit('/blog');
      cy.contains('article h2', membersOnlyPost.title)
        .closest('article')
        .within(() => {
          cy.contains('a', /continue reading/i).should('not.exist');

          cy.contains('a', /members only/i)
            .should('exist')
            .click();
          cy.url().should('include', `/login`);
        });

      const randomUser = Cypress._.sample(testUsers) as UserDetail;
      cy.login(randomUser.email, randomUser.password);
      cy.url().should('match', new RegExp(`/blog/${membersOnlyPost.id}`));
    });

    it(`if directly navigating to members-only post, 
       AFTER redirecting to login page,
       it navigates back to post on login`, () => {
      const membersOnlyPost = Cypress._.sample(
        testPosts.filter(
          (p) => p.visibility === 'MEMBERS_ONLY' && p.status === 'PUBLISHED'
        )
      ) as Post;

      if (!membersOnlyPost) throw new Error('Missing members only post');

      cy.visit(`/blog/${membersOnlyPost.id}`);
      cy.url().should('include', `/login`);
      const randomUser = Cypress._.sample(testUsers) as UserDetail;
      cy.login(randomUser.email, randomUser.password);
      cy.url().should('match', new RegExp(`/blog/${membersOnlyPost.id}`));
      cy.contains('h1', membersOnlyPost.title);
    });
  });
});
