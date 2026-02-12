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
    login(email: string, password: string): void;
    getByTestId(id: string): Chainable<Subject>;
    goToPage(pageNumber: number): void;
    clickNextPage(): void;
    clickPrevPage(): void;
    selectItemsPerPage(value: number): void;
  }
}

// -- This is a parent command --
Cypress.Commands.add('login', (email, password) => {
  console.log('Custom command example: Login', email, password);
});
Cypress.Commands.add('getByTestId', (id) => {
  return cy.get(`[data-test=${id}]`);
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
