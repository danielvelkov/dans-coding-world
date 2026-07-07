import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockPostResponse } from '@dans-coding-world/shared-post-testing';

describe('Post - content sanitation', () => {
  it('displays post content as valid sanitized HTML', () => {
    const HTMLcontent = `
        <h2>Hello world</h2>
        <p>And goodbye</p>
    `;
    renderBlogContent(HTMLcontent);
    cy.get('article h2').should('have.text', 'Hello world');
    cy.get('article p').should('have.text', 'And goodbye');
  });

  it('does not allow for XSS attacks to happen through post content', () => {
    cy.fixture('post/unsafe-content-dataset.json').then(
      (unsafeContentList: string[]) => {
        const stub = cy.stub();
        cy.on('window:confirm', stub);

        const first = generateMockPostResponse({
          post: { content: unsafeContentList[0] },
        });
        if (!first.data) throw new Error('missing data');
        const postId = first.data.post.id;

        cy.intercept(`${API_ENDPOINTS.POSTS.BY_ID(postId)}*`, () => first).as(
          'getPost',
        );
        cy.visit(`/blog/${postId}`);
        cy.wait('@getPost');

        unsafeContentList.forEach((unsafeString) => {
          cy.intercept(
            `${API_ENDPOINTS.POSTS.BY_ID(postId)}*`,
            generateMockPostResponse({
              post: { content: unsafeString, id: postId },
            }),
          ).as('getPost');

          cy.reload();
          cy.wait('@getPost');

          cy.getByTestId('post-content').should('exist');

          expect(stub).not.to.have.been.calledWith('hacked');
          stub.reset();
        });
      },
    );
  });

  function renderBlogContent(content: string) {
    const mockResponse = generateMockPostResponse({
      post: {
        content,
      },
    });
    if (!mockResponse.data) throw new Error('missing data');
    const testPostId = mockResponse.data.post.id;

    cy.intercept(`${API_ENDPOINTS.POSTS.BY_ID(testPostId)}*`, mockResponse).as(
      'getPostResponse',
    );

    cy.visit(`/blog/${testPostId}`);

    cy.wait('@getPostResponse');

    return mockResponse.data.post;
  }
});
