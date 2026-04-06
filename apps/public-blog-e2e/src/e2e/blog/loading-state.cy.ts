import {
  generateMockPostsResponse,
  generateMockPostMetadataResponse,
  generateMockGetTagsResponse,
} from '@dans-coding-world/shared-post-testing';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
describe('Blog - loading state', () => {
  context('BlogPosts', () => {
    it(`displays "loading" message while fetching blog posts`, () => {
      cy.intercept(`${API_ENDPOINTS.POSTS.LIST}*`, (req) => {
        req.reply({
          delay: 1000, // Simulate delay
          body: generateMockPostsResponse({ length: 5, pageSize: 5 }),
        });
      }).as('postsResponse');

      cy.visit('/blog');

      cy.contains(/loading posts/i);

      cy.wait('@postsResponse').then(() => {
        cy.contains(/loading posts/i).should('not.exist');
      });
    });
  });

  context('Sidebar', () => {
    it(`is showing "loading" message for tags filter
        while fetching api tags response`, () => {
      cy.intercept(
        `${API_ENDPOINTS.TAGS.LIST}*`,
        generateMockGetTagsResponse({ length: 5 })
      ).as('tagsResponse');

      cy.visit('/blog');

      cy.getByTestId('sidebar').within(() => {
        cy.get('[role="status"]')
          .should('exist')
          .contains(/loading filter/i);

        cy.wait('@tagsResponse').then(() => {
          cy.get('[role="status"]').should('not.exist');
        });
      });
    });

    it(`is showing "loading" message for year selection filter
        while fetching api posts metadata response`, () => {
      cy.intercept(
        `${API_ENDPOINTS.POSTS.METADATA}*`,
        generateMockPostMetadataResponse({ length: 5 })
      ).as('postMetadataResponse');

      cy.visit('/blog');

      cy.getByTestId('sidebar').within(() => {
        cy.get('[role="status"]')
          .should('exist')
          .contains(/loading filter/i);

        cy.wait('@postMetadataResponse').then(() => {
          cy.get('[role="status"]').should('not.exist');
        });
      });
    });
  });
});
