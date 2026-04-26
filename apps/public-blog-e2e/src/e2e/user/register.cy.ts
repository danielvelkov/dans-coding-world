import {
  generateRandomString,
  passwordGenerator,
} from '@dans-coding-world/helpers';
import { Post, Profile, User } from '@dans-coding-world/prisma-schema';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  USER_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { UserDetail } from '@dans-coding-world/user-data-access';

describe('User - register', () => {
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

  context('Register page', () => {
    const validFormFields = {
      email: 'valid@email.com',
      username: 'john1doe3',
      password: 'passWord123@',
    };
    beforeEach(() => cy.visit('/register'));

    it('navigates to login page on clicking the "Login" link', () => {
      cy.contains('a', 'Login').click();
      cy.url().should('include', `/login`);
    });

    it(`on valid register, the user is logged in and redirected to blog page`, () => {
      cy.register(
        validFormFields.email,
        validFormFields.username,
        validFormFields.password,
        validFormFields.password
      );
      cy.url().should('include', `/blog`);
      cy.checkIfLoggedIn();
    });

    context('validation', () => {
      const checkFieldValidation = (
        errorTestId: string,
        user: {
          username?: string;
          email?: string;
          password?: string;
          confirmPassword?: string;
        } = {}
      ) => {
        const {
          email = validFormFields.email,
          username = validFormFields.username,
          password = validFormFields.password,
          confirmPassword = validFormFields.password,
        } = user;
        cy.register(email, username, password, confirmPassword, {
          waitForRequest: false,
        });
        cy.getByTestId(errorTestId).should('exist');
      };

      it('does not allow typing an username longer than specified limit', () => {
        const tooLong = generateRandomString(
          USER_CONSTRAINTS.MAX_USERNAME_LENGTH + 4
        );

        cy.get('[name="username"]').as('username');
        cy.get('@username').type(tooLong);
        cy.get('@username')
          .invoke('val')
          .should('have.length', USER_CONSTRAINTS.MAX_USERNAME_LENGTH);
      });

      it('shows error if username is too short', () => {
        checkFieldValidation('username-error', {
          username: 'abc',
        });
      });

      it('shows error if username contains symbols other than _', () => {
        checkFieldValidation('username-error', {
          username: 'invalid@name',
        });
      });

      it('does not allow typing a password that is too long', () => {
        const tooLong = generateRandomString(
          USER_CONSTRAINTS.MAX_PASSWORD_LENGTH + 4
        );

        cy.get('[name="password"]').as('password');
        cy.get('@password').type(tooLong);
        cy.get('@password')
          .invoke('val')
          .should('have.length', USER_CONSTRAINTS.MAX_PASSWORD_LENGTH);
      });

      it('shows error if password is too short', () => {
        const password = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH - 1
        );

        checkFieldValidation('password-error', {
          password,
          confirmPassword: password,
        });
      });

      it('shows error if password does not have min required numbers', () => {
        const password = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1,
          {
            includeNumbers: false,
          }
        );

        checkFieldValidation('password-error', {
          password,
          confirmPassword: password,
        });
      });

      it('shows error if password does not have min required uppercase letters', () => {
        const password = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1,
          {
            includeUppercase: false,
          }
        );

        checkFieldValidation('password-error', {
          password,
          confirmPassword: password,
        });
      });

      it('shows error if password does not have minimum required lowercase letters', () => {
        const password = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1,
          {
            includeLowercase: false,
          }
        );

        checkFieldValidation('password-error', {
          password,
          confirmPassword: password,
        });
      });

      it('shows error if password does does not have minimum required symbols', () => {
        const password = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1,
          {
            includeSymbols: false,
          }
        );

        checkFieldValidation('password-error', {
          password,
          confirmPassword: password,
        });
      });

      it('shows error if confirm password is different than password', () => {
        const password = passwordGenerator(
          USER_CONSTRAINTS.MIN_PASSWORD_LENGTH + 1
        );

        checkFieldValidation('confirm-password-error', {
          password,
          confirmPassword: `${password}x`,
        });
        cy.contains('Passwords do not match').should('be.visible');
      });

      it('shows error if email is invalid', () => {
        checkFieldValidation('email-error', {
          email: 'notAnEmail',
        });
      });

      it('shows error if user has already registered with this email or username', () => {
        const existingUser = Cypress._.sample(testUsers) as UserDetail;
        cy.register(
          existingUser.email,
          `user_${generateRandomString(8)}`,
          validFormFields.password,
          validFormFields.password
        );

        cy.contains(ERROR_MESSAGES[ERROR_CODES.VALIDATION.USER_EXISTS]).should(
          'be.visible'
        );
      });
    });
  });
});
