import { PAGINATION } from '@dans-coding-world/shared-constants';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  generateMockPostCommentsResponse,
  generateMockPostResponse,
} from '@dans-coding-world/shared-post-testing';

export function loadMoreCommentsIfPresent() {
  cy.contains('h3', /comments/i).then(($heading) => {
    const text = $heading.text();
    const match = text.match(/\((\d+)\)/); // extract number inside parentheses

    if (!match) return;

    const count = Number(match[1]);

    if (count > PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE) {
      cy.get('[aria-label="Load more comments"]').click();
    }
  });
}

export function createComment(content: string, type: 'add' | 'reply' | 'edit') {
  cy.getByTestId(`comment-${type}-textarea`).clear();
  cy.getByTestId(`comment-${type}-textarea`).type(content);
  cy.getByTestId(`comment-${type}-textarea`)
    .siblings('.comment-actions')
    .find('button[type="submit"]')
    .click();
}

export function mockBlogPostPage({
  commentsLength = 4,
  replyLevels = 2,
}: { commentsLength?: number; replyLevels?: number } = {}) {
  const mockPostResponse = generateMockPostResponse({});
  if (!mockPostResponse.data) throw new Error('missing data');

  const testPostId = mockPostResponse.data.post.id;
  cy.intercept(
    `${API_ENDPOINTS.POSTS.BY_ID(testPostId)}*`,
    mockPostResponse
  ).as('getPostResponse');

  const mockCommentsResponse = generateMockPostCommentsResponse({
    postId: testPostId,
    length: commentsLength,
    pageSize: 10,
    replyLevels,
  });

  cy.intercept(
    `${API_ENDPOINTS.COMMENTS.LIST(testPostId)}*`,
    mockCommentsResponse
  ).as('getPostCommentsResponse');

  cy.visit(`/blog/${testPostId}`);
  cy.wait('@getPostResponse').then(() => {
    cy.wait('@getPostCommentsResponse');
  });
  return { testPostId, mockCommentsResponse };
}
