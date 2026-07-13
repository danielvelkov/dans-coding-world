import type { Profile, User } from '@dans-coding-world/prisma-schema';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import type { UserDetail } from '@dans-coding-world/user-data-access';
import {
  ERROR_CODES,
  TOKEN_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { generateErrorResponseByErrorCode } from '@dans-coding-world/exceptions';
import { generateMockLoginResponse } from '@dans-coding-world/shared-user-testing';

describe('User session', () => {
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

  function loginAsRandomUser() {
    const randomUser = Cypress._.sample(testUsers) as UserDetail;
    cy.contains(randomUser.email).should('not.exist');
    cy.contains('a', 'Login').should('exist').click();
    cy.login(randomUser.email, randomUser.password);
    cy.url().should('match', /\/blog$/);
    return randomUser;
  }

  it(`login starts an user's session`, () => {
    cy.visit('/');
    loginAsRandomUser();
    cy.checkIfLoggedIn();
  });

  it(`logout ends an user's session`, () => {
    cy.visit('/');
    const user = loginAsRandomUser();
    cy.logout();
    cy.contains(user.email).should('not.exist');
    cy.contains('a', 'Login').should('exist');
  });

  context(
    `an attempt to refresh user session occurs on navigating to app`,
    () => {
      it('shows page wide loading spinner while refreshing', () => {
        const randomUser = Cypress._.sample(testUsers) as UserDetail;
        const loginResponse = generateMockLoginResponse({ user: randomUser });

        cy.intercept('POST', API_ENDPOINTS.AUTH.REFRESH, {
          delay: 500,
          statusCode: 200,
          body: loginResponse,
        }).as('refreshRequest');

        cy.visit('/blog');
        cy.wait('@refreshRequest');
        cy.checkIfLoggedIn();
        cy.contains('Loading...').should('not.exist');
        cy.contains('a', 'Login').should('not.exist');
      });

      it('logs user in if refresh is successful', () => {
        const randomUser = Cypress._.sample(testUsers) as UserDetail;
        const loginResponse = generateMockLoginResponse({ user: randomUser });

        cy.intercept('POST', API_ENDPOINTS.AUTH.REFRESH, {
          statusCode: 200,
          body: loginResponse,
        });

        cy.visit('/blog');
        cy.checkIfLoggedIn();
        cy.contains(randomUser.email).should('exist');
        cy.contains('a', 'Login').should('not.exist');
      });

      it('does not do anything if refresh fails and no user is logged in prior', () => {
        cy.intercept('POST', API_ENDPOINTS.AUTH.REFRESH, {
          statusCode: 401,
          body: generateErrorResponseByErrorCode(ERROR_CODES.AUTH.UNAUTHORIZED),
        });

        cy.visit('/blog');
        cy.contains('a', 'Login').should('exist');
        cy.checkIfLoggedOut();
      });
    },
  );

  context(`user session refreshes at a certain interval once logged in`, () => {
    it('keeps user logged in on successful refresh', () => {
      cy.visit('/');

      cy.clock(new Date());

      cy.intercept(API_ENDPOINTS.AUTH.REFRESH).as('refresh');

      cy.wait('@refresh').its('response.statusCode').should('eq', 400);

      loginAsRandomUser();
      cy.checkIfLoggedIn();

      let count = Cypress._.random(10) + 1;
      while (count--) {
        cy.tick(TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION + 1000);
        cy.wait('@refresh').its('response.statusCode').should('eq', 200);
        cy.checkIfLoggedIn();
      }
    });

    it(`logs user out on unsuccessful refresh`, () => {
      cy.visit('/');

      cy.clock(new Date());

      // counts down: first call, then intercept the real one
      let callsRemaining = 1;
      cy.intercept(API_ENDPOINTS.AUTH.REFRESH, (req) => {
        if (callsRemaining === 0) {
          req.reply({
            statusCode: 400,
            body: generateErrorResponseByErrorCode(
              ERROR_CODES.AUTH.INVALID_TOKEN,
            ),
          });
        } else {
          callsRemaining--;
          req.continue();
        }
      }).as('refresh');

      cy.wait('@refresh').its('response.statusCode').should('eq', 400);

      // Login normally
      loginAsRandomUser();
      cy.checkIfLoggedIn();

      // Check if logged out after token expires and refresh sesh occurs
      cy.tick(TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION + 1000);
      cy.wait('@refresh').its('response.statusCode').should('eq', 400);
      cy.checkIfLoggedOut();
      cy.contains('a', 'Login').should('exist');
    });

    it('clears session refresh interval after logout', () => {
      cy.visit('/');

      cy.clock(new Date());

      let sessionRefreshCount = 0;

      cy.intercept(API_ENDPOINTS.AUTH.REFRESH, () => {
        sessionRefreshCount++;
      }).as('refresh');

      cy.wait('@refresh').its('response.statusCode').should('eq', 400);

      loginAsRandomUser();
      cy.checkIfLoggedIn();

      cy.logout();

      const arbitraryAmountOfTime =
        TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION * 5 + 1000;
      cy.tick(arbitraryAmountOfTime).then(() => {
        expect(sessionRefreshCount).to.eq(1);
      });
    });
  });

  it(`user session is kept after reloading page`, () => {
    cy.visit('/');
    loginAsRandomUser();
    cy.checkIfLoggedIn();

    cy.reload();

    cy.checkIfLoggedIn();
  });

  it(`user session is kept when navigating to a different path`, () => {
    cy.visit('/');
    loginAsRandomUser();
    cy.checkIfLoggedIn();

    cy.visit('/blog/1');

    cy.checkIfLoggedIn();
  });
});
