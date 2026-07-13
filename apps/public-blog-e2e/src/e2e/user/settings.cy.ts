import {
  generateRandomString,
  passwordGenerator,
} from '@dans-coding-world/helpers';
import type { User } from '@dans-coding-world/prisma-schema';
import { USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { ChangePasswordDto } from '@dans-coding-world/shared-user-dto';

describe('User - settings page', () => {
  const testUsers: User[] = [];
  let currentTestUser: User;
  let previouslySetPassword = '';
  let validFormFields: Pick<
    ChangePasswordDto,
    'oldPassword' | 'newPassword'
  > & { confirmPassword: string };

  before(() => {
    cy.task('db:seed-users', {
      options: { useDefaults: true, clearExisting: true },
    }).then((seededUsers) => {
      const users = seededUsers as User[];
      if (!users || !users.length) throw new Error('Missing user fixtures');

      for (let i = 0; i < users.length; i++) testUsers.push(users[i]);
      currentTestUser = Cypress._.sample(
        testUsers.filter((u) => u.role === 'USER' || u.role === 'AUTHOR'),
      ) as User;
    });
  });

  beforeEach(() => {
    const validPassword = passwordGenerator(
      USER_CONSTRAINTS.MIN_PASSWORD_LENGTH,
    );
    if (!previouslySetPassword.length)
      previouslySetPassword = currentTestUser.password;
    validFormFields = {
      oldPassword: previouslySetPassword,
      newPassword: validPassword,
      confirmPassword: validPassword,
    };
    cy.visit('/login');
    cy.login(currentTestUser.email, previouslySetPassword);
    cy.checkIfLoggedIn();
    cy.navigateToSettings();
  });

  it(`should redirect to login page if not logged in`, () => {
    cy.logout();
    cy.checkIfLoggedOut();
    cy.visit(`/settings`);
    cy.url().should('match', /\/login/);
  });

  context('Change password', () => {
    it('shows confirmation message after successfully changing password', () => {
      cy.changePassword(
        validFormFields.oldPassword,
        validFormFields.newPassword,
        validFormFields.confirmPassword,
      );
      cy.contains('Password changed successfully');
      previouslySetPassword = validFormFields.newPassword;
    });

    context('validation', () => {
      const checkFieldValidation = (
        errorTestId: string,
        changePassword: {
          oldPassword?: string;
          newPassword?: string;
          confirmPassword?: string;
        } = {},
      ) => {
        const {
          oldPassword = validFormFields.oldPassword,
          newPassword = validFormFields.newPassword,
          confirmPassword = validFormFields.confirmPassword,
        } = changePassword;
        cy.changePassword(oldPassword, newPassword, confirmPassword, {
          waitForRequest: false,
        });
        cy.getByTestId(errorTestId).should('exist');
      };

      it('changes user password after correcting and retrying due to validation error', () => {
        checkFieldValidation('new-password-error', {
          newPassword: 'abc',
        });

        cy.changePassword(
          validFormFields.oldPassword,
          validFormFields.newPassword,
          validFormFields.confirmPassword,
        );
        cy.contains('Password changed successfully');
        previouslySetPassword = validFormFields.newPassword;
      });

      it('does not allow typing a password that is too long', () => {
        const tooLong = generateRandomString(
          USER_CONSTRAINTS.MAX_PASSWORD_LENGTH + 4,
        );

        cy.get('[name="newPassword"]').as('password');
        cy.get('@password').type(tooLong);
        cy.get('@password')
          .invoke('val')
          .should('have.length', USER_CONSTRAINTS.MAX_PASSWORD_LENGTH);
      });

      it('shows error if password is too short', () => {
        const newPassword = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH - 1,
        );

        checkFieldValidation('new-password-error', {
          newPassword,
          confirmPassword: newPassword,
        });
      });

      it('shows error if password does not have min required numbers', () => {
        const newPassword = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1,
          {
            includeNumbers: false,
          },
        );

        checkFieldValidation('new-password-error', {
          newPassword,
          confirmPassword: newPassword,
        });
      });

      it('shows error if password does not have min required uppercase letters', () => {
        const newPassword = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1,
          {
            includeUppercase: false,
          },
        );

        checkFieldValidation('new-password-error', {
          newPassword,
          confirmPassword: newPassword,
        });
      });

      it('shows error if password does not have minimum required lowercase letters', () => {
        const newPassword = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1,
          {
            includeLowercase: false,
          },
        );

        checkFieldValidation('new-password-error', {
          newPassword,
          confirmPassword: newPassword,
        });
      });

      it('shows error if password does does not have minimum required symbols', () => {
        const newPassword = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1,
          {
            includeSymbols: false,
          },
        );

        checkFieldValidation('new-password-error', {
          newPassword,
          confirmPassword: newPassword,
        });
      });

      it('shows error if confirm password is different than new password', () => {
        const newPassword = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1,
        );

        checkFieldValidation('confirm-password-error', {
          newPassword,
          confirmPassword: `${newPassword}x`,
        });
        cy.contains('Passwords do not match').should('be.visible');
      });

      it('shows error if old password does not match with current user password', () => {
        cy.changePassword(
          previouslySetPassword + 'x',
          validFormFields.newPassword,
          validFormFields.confirmPassword,
          {
            waitForRequest: true,
          },
        );
        cy.contains('Old password verification failed').should('be.visible');
      });
    });
  });

  context('Delete account', () => {
    it('should open a confirmation dialog on selecting "Delete account"', () => {
      cy.contains('button', 'Delete Account').click();
      cy.get('dialog')
        .should('exist')
        .within(() => {
          cy.contains('Account deletion');
        });
    });

    it(`should not display "Delete Account" option if user's role is Admin`, () => {
      cy.logout();
      const admin = testUsers.find((u) => u.role === 'ADMIN') as User;
      cy.visit('/login');
      cy.login(admin.email, admin.password);
      cy.checkIfLoggedIn();
      cy.navigateToSettings();
      cy.contains('button', 'Delete Account').should('not.exist');
    });

    it(`should delete account, logout, clearCookies and 
        navigate to /blog after confirming profile deletion`, () => {
      cy.intercept(
        'DELETE',
        `${API_ENDPOINTS.USERS.BY_ID(currentTestUser.id)}`,
      ).as('deleteAccount');
      cy.contains('button', 'Delete Account').click();
      cy.get('dialog')
        .should('exist')
        .within(() => {
          cy.contains('button', 'Yes').click();
        });
      cy.wait('@deleteAccount')
        .its('response.headers.set-cookie')
        .should('not.exist');
      cy.checkIfLoggedOut();
      cy.url().should('match', /\/blog/);
    });
  });
});
