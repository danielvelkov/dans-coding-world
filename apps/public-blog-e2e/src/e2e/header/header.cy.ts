import { Profile, User } from '@dans-coding-world/prisma-schema';
import { UserDetail } from '@dans-coding-world/user-data-access';
import { getDisplayName } from '@dans-coding-world/public-blog-shared-helpers';

describe('Global header', () => {
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

  context('Unauthenticated users', () => {
    it('contains "Login" link', () => {
      cy.visit('/blog');
      cy.get('header').within(() => {
        cy.contains('a', 'Login').should('exist');
      });
    });
  });

  context('Authenticated users', () => {
    let randomUser: UserDetail;
    beforeEach(() => {
      randomUser = Cypress._.sample(testUsers) as UserDetail;
      cy.visit('/login');
      cy.login(randomUser.email, randomUser.password);
      cy.checkIfLoggedIn();
    });

    it('has no login link', () => {
      cy.visit('/blog');
      cy.get('header').within(() => {
        cy.contains('a', 'Login').should('not.exist');
      });
    });

    context('User profile dropdown', () => {
      it('user can see his profile dropdown menu with avatar and profile details', () => {
        cy.getByTestId('user-profile-dropdown')
          .should('exist')
          .within(() => {
            cy.contains(randomUser.email).should('exist');
            cy.contains(getDisplayName(randomUser)).should('exist');
            if (randomUser.profile?.avatarURL)
              cy.get('img').should(
                'have.attr',
                'alt',
                `${randomUser.username}'s avatar`
              );
          });
      });

      it('dropdown is toggled when clicking on avatar or username/email', () => {
        cy.getByTestId('user-profile-dropdown').within(() => {
          cy.get('#expandable-menu').should('not.exist');
          cy.contains(randomUser.email).click();
          cy.get('#expandable-menu').should('exist');
          cy.contains(randomUser.email).click();
          cy.get('#expandable-menu').should('not.exist');

          cy.get('img').click();
          cy.get('#expandable-menu').should('exist');
          cy.get('img').click();
          cy.get('#expandable-menu').should('not.exist');
        });
      });

      it('menu contains option that logouts user', () => {
        cy.getByTestId('user-profile-dropdown').within(() => {
          cy.contains(randomUser.email).click();
          cy.get('#expandable-menu').within(() => {
            cy.contains('button', 'Logout').click();
          });
        });
        cy.getByTestId('user-profile-dropdown').should('not.exist');
      });

      // TODO
      it('menu contains option to see profile');
      it('menu contains option to edit profile');
      it('menu contains option to change user settings');
    });
  });

  it(`shows website name as h1 link that navigates to /blog`, () => {
    cy.visit('/');
    cy.get('header').within(() => {
      cy.get('h1').should('have.text', `Dan's coding world`).click();
      cy.url().should('match', /blog$/);
    });
  });
});
