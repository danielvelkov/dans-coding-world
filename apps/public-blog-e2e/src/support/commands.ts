/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Chainable<Subject> {
    login(
      email: string,
      password: string,
      options?: { waitForRequest?: boolean }
    ): void;
    register(
      email: string,
      username: string,
      password: string,
      confirmPassword: string,
      options?: { waitForRequest?: boolean }
    ): void;
    logout(): void;
    checkIfLoggedIn(): void;
    checkIfLoggedOut(): void;
    getByTestId(id: string): Chainable<Subject>;
    goToPage(pageNumber: number): void;
    clickNextPage(): void;
    clickPrevPage(): void;
    selectItemsPerPage(value: number): void;
    selectPostPublicationYearFilter(year: number): void;
    selectPostTagFilter(tagName: string): void;
    selectPostSorting(option: string): void;
    selectCommentSorting(option: string): void;
  }
}

Cypress.Commands.add('login', (email, password, options = {}) => {
  const { waitForRequest = true } = options;
  if (waitForRequest)
    cy.intercept('POST', `/api/v1/auth/login*`).as('loginRequest');
  cy.get('[name="email"]').type(email);
  cy.get('[name="password"]').type(password);
  cy.contains('button', /login/i).click();
  if (waitForRequest) {
    cy.wait('@loginRequest')
      .its('response.statusCode')
      .should('be.oneOf', [200, 400, 401]);
  }
});

Cypress.Commands.add(
  'register',
  (email, username, password, confirmPassword, options = {}) => {
    const { waitForRequest = true } = options;
    if (waitForRequest)
      cy.intercept('POST', `/api/v1/auth/register`).as('registerRequest');
    cy.get('[name="email"]').type(email);
    cy.get('[name="username"]').type(username);
    cy.get('[name="password"]').type(password);
    cy.get('[name="confirmPassword"]').type(confirmPassword);
    cy.contains('button', /create account/i).click();
    if (waitForRequest) {
      cy.wait('@registerRequest')
        .its('response.statusCode')
        .should('be.oneOf', [201, 400, 401, 409]);
    }
  }
);

Cypress.Commands.add('logout', () => {
  cy.getByTestId('user-profile-dropdown').click();
  cy.contains('button', 'Logout').click();
});

Cypress.Commands.add('checkIfLoggedIn', () => {
  cy.getByTestId('user-profile-dropdown').should('exist');
});

Cypress.Commands.add('checkIfLoggedOut', () => {
  cy.getByTestId('user-profile-dropdown').should('not.exist');
});

Cypress.Commands.add('getByTestId', (id) => {
  return cy.get(`[data-testid=${id}]`);
});

Cypress.Commands.add('goToPage', (pageNumber: number) => {
  cy.get('[aria-label="pagination"]').within(() => {
    cy.contains('button', `page ${pageNumber}`).click();
  });
});

Cypress.Commands.add('clickNextPage', () => {
  cy.get('[aria-label="next page"]').click();
});

Cypress.Commands.add('clickPrevPage', () => {
  cy.get('[aria-label="prev page"]').click();
});

Cypress.Commands.add('selectItemsPerPage', (value) => {
  cy.contains('label', /items per page/i)
    .invoke('attr', 'for')
    .then((id) => {
      cy.get(`#${id}`).click();
    });
  cy.contains('[class*="option"]', value).click();
});

Cypress.Commands.add('selectCommentSorting', (value) => {
  cy.contains('label', /sort comments/i)
    .invoke('attr', 'for')
    .then((id) => {
      cy.get(`#${id}`).click();
    });
  cy.contains('[class*="option"]', value).click();
});

Cypress.Commands.add('selectPostPublicationYearFilter', (year) => {
  cy.contains('h3', 'Select Posts by year')
    .invoke('attr', 'id')
    .then((id) => {
      cy.get(`section[aria-labelledby="${id}"]`).within(() => {
        cy.contains('button', year.toString()).click();
      });
    });
});

Cypress.Commands.add('selectPostTagFilter', (tagName) => {
  cy.contains('h3', 'Tags')
    .invoke('attr', 'id')
    .then((id) => {
      cy.get(`section[aria-labelledby="${id}"]`).within(() => {
        cy.contains('button', tagName.toString()).click();
      });
    });
});

Cypress.Commands.add('selectPostSorting', (value) => {
  cy.contains('label', /sort by/i)
    .invoke('attr', 'for')
    .then((id) => {
      cy.get(`#${id}`).click();
    });
  cy.contains('[class*="option"]', value).click();
});
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
