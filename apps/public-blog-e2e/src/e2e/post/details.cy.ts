import { stringifyToQueryString } from '@dans-coding-world/helpers';
import { PostFull } from '@dans-coding-world/post-data-access';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockPostResponse } from '@dans-coding-world/shared-post-testing';
import { randNumber, randWord } from '@ngneat/falso';

describe('Post - details', () => {
  const testPostId = 1;
  let testPost: PostFull;

  beforeEach(() => {
    testPost = initBlogPost({});
  });

  it('shows post title as <h1> element', () => {
    cy.get('article h1').should('have.text', testPost.title);
  });

  it(`shows post's published date in "DD MONTH YYYY" format`, () => {
    const publishedDate = new Date(testPost.publishedAt as Date);
    const month = publishedDate.toLocaleString('default', { month: 'long' });
    const day = publishedDate.toLocaleString('default', { day: '2-digit' });
    cy.get('[aria-label^="Posted on"]').should(
      'have.text',
      `${day} ${month} ${publishedDate.getFullYear()}`
    );
  });

  it('shows modified date, if updated date is after published date', () => {
    const publishedAt = new Date('01 Mar 2025');
    const updatedAt = new Date('12 Mar 2025');
    initBlogPost({
      updatedAt,
      publishedAt,
    });

    const month = updatedAt.toLocaleString('default', { month: 'long' });
    const day = updatedAt.toLocaleString('default', { day: '2-digit' });
    cy.get('[aria-label^="Last edited on"]').should(
      'have.text',
      `${day} ${month} ${updatedAt.getFullYear()}`
    );
  });

  it('shows author fullname (or username if profile is not setup)', () => {
    const fullName =
      testPost.author.profile?.firstName +
      ' ' +
      testPost.author.profile?.lastName;
    cy.contains(`By ${fullName}`);

    const authorWithoutProfile = { ...testPost.author, profile: null };
    initBlogPost({ author: authorWithoutProfile });

    cy.contains(`By ${authorWithoutProfile.username}`);
  });

  it('shows author avatar picture', () => {
    cy.get(`img[src="${testPost.author.profile?.avatarURL}"]`);
  });

  it('navigates to author page when selecting author name', () => {
    const fullName =
      testPost.author.profile?.firstName +
      ' ' +
      testPost.author.profile?.lastName;
    cy.contains('a', fullName).click();

    cy.url().should('include', `/users/${testPost.author.id}`);
  });

  it('displays reading time estimate depending on content length', () => {
    testPost = initBlogPost({
      content: randWord({ length: randNumber({ min: 10, max: 10000 }) }).join(
        ' '
      ),
    });
    const AVERAGE_READING_WPM = 200;
    const numOfWords = testPost.content.match(/\w+/gm)?.length ?? 0;
    const readingTime = Math.ceil(numOfWords / AVERAGE_READING_WPM);
    checkReadingTimeEstimate(readingTime);
  });

  it('shows post tags', () => {
    let tags = testPost.tags;
    if (!tags) {
      tags = randWord({ length: 3 });
      testPost = initBlogPost({ tags });
    }
    for (const tagName of tags) cy.contains('button', tagName);
  });

  it(`clicking on any tag navigates to the blog list page 
    with filtering by selected tag applied`, () => {
    let tags = testPost.tags;
    if (!tags) {
      tags = randWord({ length: 3 });
      testPost = initBlogPost({ tags });
    }
    const randomTag = Cypress._.sample(tags) as string;
    cy.contains('button', randomTag).click();

    cy.url().should(
      'include',
      `/blog?${stringifyToQueryString({
        filterBy: {
          tags: [randomTag],
        },
      })}`
    );
  });

  function checkReadingTimeEstimate(readingTimeInMinutes: number) {
    if (readingTimeInMinutes <= 1)
      cy.get('[aria-label^="Reading time"]').should(
        'have.text',
        'Less than a minute read'
      );
    else
      cy.get('[aria-label^="Reading time"]').should(
        'have.text',
        `${readingTimeInMinutes} minutes read`
      );
  }

  function initBlogPost(post: Partial<PostFull>) {
    const avatarURL =
      'https://web.archive.org/web/19991008210347im_/http://sophie.net/images/sophie.jpg';
    const mockResponse = generateMockPostResponse({
      post: {
        ...post,
        authorId: 1,
        author: {
          id: 1,
          username: 'Toby',
          profile: {
            avatarURL,
            bio: '',
            id: 1,
            firstName: 'Turner',
            lastName: 'Over',
            userId: 1,
          },
          ...post.author,
        },
      },
    });
    if (!mockResponse.data) throw new Error('missing data');
    mockResponse.data.post.id = testPostId;

    cy.intercept(`${API_ENDPOINTS.POSTS.BY_ID(testPostId)}*`, mockResponse).as(
      'getPostResponse'
    );

    cy.visit(`/blog/${testPostId}`);

    cy.wait('@getPostResponse');

    return mockResponse.data.post;
  }
});
