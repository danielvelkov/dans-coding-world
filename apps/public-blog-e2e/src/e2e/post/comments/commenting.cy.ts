import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  generateMockPostCommentsResponse,
  generateMockPostResponse,
} from '@dans-coding-world/shared-post-testing';

describe('Comments - commenting', () => {
  beforeEach(() => {
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
    cy.wait('@getPostResponse').then(() => {
      cy.wait('@getPostCommentsResponse');
    });
  });

  it('should include text area for adding comments', () => {
    cy.get('textarea').should('exist');
  });

  // TODO:
  context('unauthenticated users', () => {
    it('disables add comment text area for logged out users');
    it('prompts users to login when selecting text area');
    it('navigates to login page from "call to action" login dialog');
  });

  // TODO:
  context('authenticated users', () => {
    it('does not allow typing past limit');
    it('reflects comment length in a counter');
    it('does not allow typing past certain limit');
    it('enables submit button only after a character is typed');
    it('creates comment after entering valid content and submitting');
    it('allows replying to another users comment');
    it('replying to comments 3 levels deep should not be possible');
    it('allows editing own user comments');
    it('shows if comment was edited by user');
  });
});
