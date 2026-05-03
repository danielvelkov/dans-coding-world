import { generateRandomString } from '@dans-coding-world/helpers';
import { Profile, User } from '@dans-coding-world/prisma-schema';
import { USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockUserResponse } from '@dans-coding-world/shared-user-testing';
import { UserDetail } from '@dans-coding-world/user-data-access';

describe('User - profile page', () => {
  const testUsers: UserDetail[] = [];
  let currentTestUser: UserDetail;

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

  context('User info', () => {
    context('details', () => {
      beforeEach(() => {
        currentTestUser = Cypress._.sample(testUsers) as UserDetail;
        cy.visit(`/users/${currentTestUser.id}`);
      });

      it('shows username as h2', () => {
        cy.contains('h2', currentTestUser.username);
      });

      it('contains user role as badge', () => {
        cy.contains('span', currentTestUser.role);
      });

      it('displays profile details - first name, last name and bio (if present)', () => {
        if (currentTestUser.profile?.firstName)
          cy.contains(currentTestUser.profile.firstName);
        if (currentTestUser.profile?.lastName)
          cy.contains(currentTestUser.profile.lastName);
        if (currentTestUser.profile?.bio)
          cy.contains(currentTestUser.profile.bio);
      });

      it('contains user avatar as img (if present)', () => {
        cy.get(`img[src="${currentTestUser.profile?.avatarURL}"]`);
      });
    });

    context('empty state', () => {
      beforeEach(() => {
        currentTestUser = Cypress._.sample(testUsers) as UserDetail;
        cy.intercept(
          `${API_ENDPOINTS.USERS.BY_ID(currentTestUser.id)}`,
          generateMockUserResponse({
            user: {
              ...currentTestUser,
              profile: {
                firstName: '',
                lastName: '',
                avatarURL: '',
                bio: '',
                userId: currentTestUser.id,
                id: 1,
              },
            },
          })
        ).as('userResponse');

        cy.visit(`/users/${currentTestUser.id}`);
        cy.wait('@userResponse');
      });

      it('shows empty dash "-" if the profile detail is not configured', () => {
        for (const label of ['First Name', 'Last Name', 'Bio'])
          cy.contains('dt', label).next('dd').should('have.text', '-');
      });

      it('shows basic avatar icon if no avatarUrl specified in profile details', () => {
        cy.get(`[aria-label="Default user avatar"]`);
      });
    });
  });

  it('should show 404 NOT FOUND error if navigating to unknown user', () => {
    cy.visit(`/users/${testUsers.length + 10}`);
    cy.contains('h1', '404', { timeout: 10000 });
  });

  context('Unauthenticated user visiting a profile', () => {
    beforeEach(() => {
      currentTestUser = Cypress._.sample(testUsers) as UserDetail;
      cy.visit(`/users/${currentTestUser.id}`);
    });
    it('does not display user email if not logged in as selected user or admin', () => {
      cy.contains(currentTestUser.email).should('not.exist');
    });

    it('does not display logged in user actions', () => {
      cy.contains('button', 'Logout').should('not.exist');
      cy.contains('button', 'Edit').should('not.exist');
      cy.contains('button', 'Settings').should('not.exist');
    });
  });

  context('Authenticated user visiting his own profile', () => {
    beforeEach(() => {
      currentTestUser = Cypress._.sample(testUsers) as UserDetail;
      cy.visit('/login');
      cy.login(currentTestUser.email, currentTestUser.password);
      cy.checkIfLoggedIn();
      cy.navigateToProfile();
    });

    it(`displays user's email`, () => {
      cy.contains(currentTestUser.email, { timeout: 10000 }).should('exist');
    });

    it('contains "Logout" action', () => {
      cy.contains('button', 'Logout').click();
      cy.checkIfLoggedOut();
    });

    it('contains "Edit" action, which navigates to profile edit page', () => {
      cy.contains('a', 'Edit').click();
      cy.url().should('include', `/users/${currentTestUser.id}/edit`);
    });

    it('contains "Settings" action, which navigates to user settings page', () => {
      cy.contains('a', 'Settings').click();
      cy.url().should('include', `/settings`);
    });
  });

  context('Edit profile page', () => {
    const validProfileDetails = {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'The elusive man',
    };

    beforeEach(() => {
      currentTestUser = Cypress._.sample(testUsers) as UserDetail;
      cy.visit(`/users/${currentTestUser.id}/edit`);
    });

    it('if not logged in - should navigate to login page ', () => {
      cy.url().should('include', `/login`);
    });

    context('Authenticated user', () => {
      beforeEach(() => {
        cy.visit('/login');
        cy.login(currentTestUser.email, currentTestUser.password);
        cy.checkIfLoggedIn();
        cy.navigateToEditProfile();
      });

      it(`should show 403 FORBIDDEN error if navigating to other user's profile`, () => {
        const randomUser = Cypress._.sample(
          testUsers.filter((u) => u.id !== currentTestUser.id)
        ) as UserDetail;
        cy.visit(`/users/${randomUser.id}/edit`);
        cy.contains('h1', '403');
      });

      it('should present option to add profile img and preview it', () => {
        cy.contains('button', 'Upload');
        cy.task('generateFile', {
          path: 'src/fixtures/user/avatar.webp',
          sizeInMB: 5,
        });
        cy.get('form').within(() => {
          cy.get('img.avatar')
            .invoke('attr', 'src')
            .then((oldSrc) => {
              cy.getByTestId('file-input').selectFile(
                'src/fixtures/user/avatar.webp',
                { force: true }
              );
              cy.get('img.avatar')
                .invoke('attr', 'src')
                .should((newSrc) => {
                  expect(newSrc).not.to.eq(oldSrc);
                });
            });
        });
        cy.task('deleteFile', 'src/fixtures/user/avatar.webp');
      });

      it('should have option to remove profile img', () => {
        cy.get('form').within(() => {
          cy.get('img.avatar')
            .invoke('attr', 'src')
            .then(() => {
              cy.contains('button', 'Remove').click();
              cy.get('img.avatar').should('not.exist');
              cy.get(`[aria-label="Default user avatar"]`).should('exist');
            });
        });
      });

      context('after edit in profile details form', () => {
        it('should revert to previously set profile details on clicking "Revert"', () => {
          cy.get('[name="firstName"]').clear();
          cy.get('[name="firstName"]').type(validProfileDetails.firstName);
          cy.get('[name="lastName"]').clear();
          cy.get('[name="lastName"]').type(validProfileDetails.lastName);
          cy.get('[name="bio"]').clear();
          cy.get('[name="bio"]').type(validProfileDetails.bio);

          cy.contains('button', 'Revert changes').click();

          cy.contains(validProfileDetails.firstName).should('not.exist');
          cy.contains(currentTestUser.profile?.firstName as string).should(
            'exist'
          );
          cy.contains(validProfileDetails.lastName).should('not.exist');
          cy.contains(currentTestUser.profile?.lastName as string).should(
            'exist'
          );
          cy.contains(validProfileDetails.bio).should('not.exist');
          cy.contains(currentTestUser.profile?.bio as string).should('exist');
        });

        it('should revert to previous profile pic on clicking "Revert"', () => {
          cy.task('generateFile', {
            path: 'src/fixtures/user/avatar.png',
            sizeInMB: 8,
          });
          // Removing previously set profile pic and reverting back
          cy.get('form').within(() => {
            cy.get('img.avatar')
              .invoke('attr', 'src')
              .then((oldSrc) => {
                cy.contains('button', 'Remove').click();
                cy.get('img.avatar').should('not.exist');
                cy.get(`[aria-label="Default user avatar"]`).should('exist');
                cy.contains('button', 'Revert changes').click();
                cy.get('img.avatar')
                  .invoke('attr', 'src')
                  .should((newSrc) => {
                    expect(newSrc).to.eq(oldSrc);
                  });
              });
          });

          // Setting new profile pic and reverting back
          cy.get('form').within(() => {
            cy.get('img.avatar')
              .invoke('attr', 'src')
              .then((oldSrc) => {
                cy.getByTestId('file-input').selectFile(
                  'src/fixtures/user/avatar.png',
                  { force: true }
                );
                cy.get('img.avatar')
                  .invoke('attr', 'src')
                  .should((newSrc) => {
                    expect(newSrc).not.to.eq(oldSrc);
                  });
                cy.contains('button', 'Revert changes').click();
                cy.get('img.avatar')
                  .invoke('attr', 'src')
                  .should((newSrc) => {
                    expect(newSrc).to.eq(oldSrc);
                  });
              });
          });
          cy.task('deleteFile', 'src/fixtures/user/avatar.png');
        });

        it(`should display warning after clearing field that was previously set`, () => {
          for (const [name, warningId] of [
            ['firstName', 'first-name-warning'],
            ['lastName', 'last-name-warning'],
            ['bio', 'bio-warning'],
          ]) {
            cy.getByTestId(warningId).should('not.exist');
            cy.get(`[name="${name}"]`).clear();
            cy.getByTestId(warningId).should('exist');
          }
          cy.contains('Field will be cleared');
        });
      });

      it(`should navigate to profile page on successful 
        edit with profile details updated`, () => {
        cy.editProfile(
          validProfileDetails.firstName,
          validProfileDetails.lastName,
          validProfileDetails.bio
        );
        cy.url().should('include', `/users/${currentTestUser.id}`);
        cy.contains(validProfileDetails.firstName);
        cy.contains(validProfileDetails.lastName);
        cy.contains(validProfileDetails.bio);

        // Change back
        cy.navigateToEditProfile();
        cy.editProfile(
          currentTestUser.profile?.firstName as string,
          currentTestUser.profile?.lastName as string,
          currentTestUser.profile?.bio as string
        );
      });

      context('validation', () => {
        const checkFieldValidation = (
          errorTestId: string,
          profile: {
            firstName?: string;
            lastName?: string;
            bio?: string;
          } = {},
          waitForRequest = false
        ) => {
          const {
            firstName = validProfileDetails.firstName,
            lastName = validProfileDetails.lastName,
            bio = validProfileDetails.bio,
          } = profile;
          cy.editProfile(firstName, lastName, bio, {
            waitForRequest,
          });
          cy.getByTestId(errorTestId).should('exist');
        };

        it('should display an error if first name is too short', () => {
          const tooShort = generateRandomString(
            USER_CONSTRAINTS.MIN_FIRST_NAME_LENGTH - 1
          );
          checkFieldValidation('first-name-error', {
            firstName: tooShort,
          });
        });
        it('should not allow typing past limit if first name is too long', () => {
          const tooLong = generateRandomString(
            USER_CONSTRAINTS.MAX_FIRST_NAME_LENGTH + 4
          );

          cy.get('[name="firstName"]').as('firstName');
          cy.get('@firstName').type(tooLong);
          cy.get('@firstName')
            .invoke('val')
            .should('have.length', USER_CONSTRAINTS.MAX_FIRST_NAME_LENGTH);
        });

        it('should display an error if last name is too short', () => {
          const tooShort = generateRandomString(
            USER_CONSTRAINTS.MIN_LAST_NAME_LENGTH - 1
          );
          checkFieldValidation('last-name-error', {
            lastName: tooShort,
          });
        });

        it('should not allow uncommon symbols or letters in last or first name', () => {
          cy.fixture('user/invalid-names.json').then((invalidNames) => {
            invalidNames.forEach((invalidName: string) => {
              checkFieldValidation(
                'first-name-error',
                {
                  firstName: invalidName,
                },
                true
              );
              checkFieldValidation(
                'last-name-error',
                {
                  lastName: invalidName,
                },
                true
              );
            });
          });
        });

        it('should not allow typing past limit if last name is too long', () => {
          const tooLong = generateRandomString(
            USER_CONSTRAINTS.MAX_LAST_NAME_LENGTH + 4
          );

          cy.get('[name="lastName"]').as('lastName');
          cy.get('@lastName').type(tooLong);
          cy.get('@lastName')
            .invoke('val')
            .should('have.length', USER_CONSTRAINTS.MAX_LAST_NAME_LENGTH);
        });

        it('should not allow typing past specified limit if user bio is too long', () => {
          const tooLong = generateRandomString(
            USER_CONSTRAINTS.MAX_BIO_LENGTH + 4
          );

          cy.get('[name="bio"]').as('bio');
          cy.get('@bio').type(tooLong);
          cy.get('@bio')
            .invoke('val')
            .should('have.length', USER_CONSTRAINTS.MAX_BIO_LENGTH);
        });

        it('should allow only certain avatar image extensions', () => {
          cy.task('generateFile', {
            path: 'src/fixtures/user/avatar.txt',
            sizeInMB: 5,
          });
          cy.task('generateFile', {
            path: 'src/fixtures/user/avatar.png',
            sizeInMB: 5,
          });
          cy.getByTestId('file-input').selectFile(
            'src/fixtures/user/avatar.txt',
            { force: true }
          );
          cy.getByTestId('avatar-error').should('exist');
          cy.getByTestId('file-input').selectFile(
            'src/fixtures/user/avatar.png',
            { force: true }
          );
          cy.getByTestId('avatar-error').should('not.exist');
          cy.task('deleteFile', 'src/fixtures/user/avatar.txt');
        });

        it(`should not allow setting avatar image that is 
        bigger than specified size limit`, () => {
          cy.task('generateFile', {
            path: 'src/fixtures/user/large-avatar.png',
            sizeInMB: 11,
          });
          cy.getByTestId('file-input').selectFile(
            'src/fixtures/user/large-avatar.png',
            { force: true }
          );
          cy.getByTestId('avatar-error').should('exist');
          cy.task('deleteFile', 'src/fixtures/user/large-avatar.png');
        });
      });
    });
  });
});
