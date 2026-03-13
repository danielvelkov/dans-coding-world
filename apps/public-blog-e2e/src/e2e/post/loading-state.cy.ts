import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  generateMockPostCommentsResponse,
  generateMockPostResponse,
} from '@dans-coding-world/shared-post-testing';

describe('Post - loading state', () => {
  context('BlogPost', () => {
    it(`displays "loading" message while fetching blog post`, () => {
      const mockPostResponse = generateMockPostResponse({});
      if (!mockPostResponse.data) throw new Error('missing data');

      const testPostId = mockPostResponse.data.post.id;
      cy.intercept(
        `${API_ENDPOINTS.POSTS.BY_ID(testPostId)}*`,
        mockPostResponse
      ).as('getPostResponse');

      cy.visit(`/blog/${testPostId}`);

      cy.contains(/loading post/i);

      cy.wait('@getPostResponse').then(() => {
        cy.contains(/loading post/i).should('not.exist');
      });
    });
  });

  context('Comment section', () => {
    it(`displays "loading" message while fetching blog post comments`, () => {
      const mockPostResponse = generateMockPostResponse({});
      if (!mockPostResponse.data) throw new Error('missing data');

      const testPostId = mockPostResponse.data.post.id;
      cy.intercept(
        `${API_ENDPOINTS.POSTS.BY_ID(testPostId)}*`,
        mockPostResponse
      ).as('getPostResponse');

      const mockCommentsResponse = generateMockPostCommentsResponse({
        postId: testPostId,
        length: 4,
        pageSize: 10,
        replyLevels: 2,
      });

      cy.intercept(
        `${API_ENDPOINTS.COMMENTS.LIST(testPostId)}*`,
        mockCommentsResponse
      ).as('getPostCommentsResponse');

      cy.visit(`/blog/${testPostId}`);

      cy.wait('@getPostResponse');

      cy.contains(/loading comments/i);

      cy.wait('@getPostCommentsResponse').then(() => {
        cy.contains(/loading comments/i).should('not.exist');
      });
    });
  });
});
