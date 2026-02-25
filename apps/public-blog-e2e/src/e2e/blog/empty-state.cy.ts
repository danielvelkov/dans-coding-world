import {
  generateMockPostsResponse,
  generateMockPostMetadataResponse,
  generateMockGetTagsResponse,
} from '@dans-coding-world/shared-post-testing';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
describe('Blog - empty state', () => {
  context('BlogPosts', () => {
    it(`displays "empty" message if api returns 
        0 posts in GET posts response`, () => {
      cy.intercept(
        `${API_ENDPOINTS.POSTS.LIST}*`,
        generateMockPostsResponse({ length: 0, pageSize: 5 })
      ).as('postsResponse');

      cy.visit('/blog');

      cy.wait('@postsResponse');

      cy.contains('No posts found');
    });
  });

  context('Sidebar', () => {
    it(`hides tags selection filter if api returns 
        0 items in tags response`, () => {
      cy.intercept(
        `${API_ENDPOINTS.TAGS.LIST}*`,
        generateMockGetTagsResponse({ length: 0 })
      ).as('tagsResponse');

      cy.visit('/blog');

      cy.getByTestId('sidebar').within(() => {
        cy.wait('@tagsResponse').then(() => {
          cy.root().should('not.contain', /tags/i);
        });
      });
    });

    it(`hides year selection filter if api returns
        0 items in posts metadata response`, () => {
      cy.intercept(
        `${API_ENDPOINTS.POSTS.METADATA}*`,
        generateMockPostMetadataResponse({ length: 0 })
      ).as('postMetadataResponse');

      cy.visit('/blog');

      cy.getByTestId('sidebar').within(() => {
        cy.wait('@postMetadataResponse').then(() => {
          cy.root().should('not.contain', /year/i);
        });
      });
    });
  });
});
