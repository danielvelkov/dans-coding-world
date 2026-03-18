import { stringifyToQueryString } from '@dans-coding-world/helpers';
import { PostFull } from '@dans-coding-world/post-data-access';
import { Post, Profile, User } from '@dans-coding-world/prisma-schema';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockPostResponse } from '@dans-coding-world/shared-post-testing';
import { randNumber, randWord } from '@ngneat/falso';

describe('BlogPost', () => {
  const testPostId = 1;
  let testPost: PostFull;
  let testPosts: Post[];
  const testUsers: PostFull['author'][] = [];

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

    cy.task('db:seed-posts', {
      options: { useDefaults: true, clearExisting: true },
    }).then((posts) => {
      testPosts = (posts as Post[]).filter(
        (p) => p.status === 'PUBLISHED' && p.visibility === 'PUBLIC'
      );
      if (!testPosts || !testPosts.length)
        throw new Error('Missing post fixtures');
    });
  });

  it('shows post title as <h1> element', () => {
    const randomPost = Cypress._.sample(testPosts) as Post;
    cy.visit(`/blog/${randomPost.id}`);
    cy.get('article h1').should('have.text', randomPost.title);
  });

  it(`shows post's published date in "DD MONTH YYYY" format`, () => {
    const testPost = Cypress._.sample(testPosts) as Post;

    const publishedDate = new Date(testPost.publishedAt as Date);
    const month = publishedDate.toLocaleString('default', { month: 'long' });
    const day = publishedDate.toLocaleString('default', { day: '2-digit' });

    cy.visit(`/blog/${testPost.id}`);

    cy.get('[aria-label^="Posted on"]').should(
      'have.text',
      `${day} ${month} ${publishedDate.getFullYear()}`
    );
  });

  it('shows modified date, if updated date is after published date', () => {
    const testPost = testPosts.find(
      (p) => new Date(p.publishedAt as Date) < new Date(p.updatedAt)
    ) as Post;

    const updatedAt = new Date(testPost.updatedAt);

    const month = updatedAt.toLocaleString('default', { month: 'long' });
    const day = updatedAt.toLocaleString('default', { day: '2-digit' });

    cy.visit(`/blog/${testPost.id}`);

    cy.get('[aria-label^="Last edited on"]').should(
      'have.text',
      `${day} ${month} ${updatedAt.getFullYear()}`
    );
  });

  it('shows author fullname (or username if profile is not setup)', () => {
    const testPost = Cypress._.sample(testPosts) as Post;

    const testUser = testUsers.find((u) => u.id === testPost.authorId);
    if (!testUser) throw new Error('Missing test user');

    const fullName =
      testUser.profile?.firstName + ' ' + testUser.profile?.lastName;

    cy.visit(`/blog/${testPost.id}`);

    cy.contains(`By ${fullName}`);

    const authorWithoutProfile = {
      ...testUser,
      username: 'Blank',
      profile: null,
    };
    initMockBlogPost({ author: authorWithoutProfile });

    cy.contains(`By ${authorWithoutProfile.username}`);
  });

  it('shows author avatar picture', () => {
    const testPost = Cypress._.sample(testPosts) as Post;

    const testUser = testUsers.find((u) => u.id === testPost.authorId);
    if (!testUser) throw new Error('Missing test user');

    cy.visit(`/blog/${testPost.id}`);

    cy.get(`img[src="${testUser.profile?.avatarURL}"]`);
  });

  it('navigates to author page when selecting author name', () => {
    const testPost = Cypress._.sample(testPosts) as Post;

    const testUser = testUsers.find((u) => u.id === testPost.authorId);
    if (!testUser) throw new Error('Missing test user');

    cy.visit(`/blog/${testPost.id}`);

    const fullName =
      testUser.profile?.firstName + ' ' + testUser.profile?.lastName;
    cy.contains('a', fullName).click();

    cy.url().should('include', `/users/${testUser.id}`);
  });

  it('displays reading time estimate depending on content length', () => {
    testPost = initMockBlogPost({
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
    testPost = initMockBlogPost({
      tags: ['javascript', 'c#'],
    });
    if (!testPost.tags) throw new Error('Missing tags');

    for (const tagName of testPost.tags) cy.contains('button', tagName);
  });

  it(`clicking on any tag navigates to the blog list page 
    with filtering by selected tag applied`, () => {
    testPost = initMockBlogPost({
      tags: ['javascript', 'c#'],
    });

    if (!testPost.tags) throw new Error('Missing tags');

    const randomTag = Cypress._.sample(testPost.tags) as string;
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

  function initMockBlogPost(post: Partial<PostFull>) {
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
