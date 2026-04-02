import { Profile, User } from '@dans-coding-world/prisma-schema';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { UserDetail } from '@dans-coding-world/user-data-access';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@dans-coding-world/shared-constants';

describe('User - login', () => {
  const testUsers: UserDetail[] = [];
  beforeEach(() => cy.visit('/login'));

  context('Login page', () => {
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

    it.only(`on valid login, the server returns access and refresh tokens
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

    it('navigates to previous page in history stack on login');
    it(
      'navigates to previous page if already logged in and visiting /login page'
    );
    it('if no history stack, navigates to /blog on login');
    it('changes login button to loading spinner on login button click');

    context('validation', () => {
      it('shows validation message if username or password field empty');
      it('shows error message on invalid credentials');
      it('shows error message on wrong password');
    });
  });
});
