import { generateRandomString } from '@dans-coding-world/helpers';
import { Post } from '@dans-coding-world/prisma-schema';
import { POST_CONSTRAINTS } from '@dans-coding-world/shared-constants';
describe('Blog - search', () => {
  let seededPosts: Post[];
  before(() => {
    cy.task('db:seed-users');
    cy.fixture('posts-search-dataset.json').then((posts) =>
      cy
        .task('db:seed-posts', {
          posts,
          options: { useDefaults: false, clearExisting: true },
        })
        .then((posts) => {
          seededPosts = posts as Post[];
          if (!seededPosts || !seededPosts.length)
            throw new Error('Missing post fixtures');
        })
    );
  });

  beforeEach(() => {
    cy.visit('/blog');
  });

  it('does not allow typing past a certain limit', () => {
    const longSearchString = generateRandomString(
      POST_CONSTRAINTS.MAX_TITLE_LENGTH + 20
    );
    cy.get('search').within(() => {
      cy.get('input[aria-label="search"]').type(longSearchString);

      cy.get('input[aria-label="search"]').should(
        'not.have.value',
        longSearchString
      );
      cy.get('input[aria-label="search"]').should(
        'have.value',
        longSearchString.substring(0, POST_CONSTRAINTS.MAX_TITLE_LENGTH)
      );
    });
  });

  it('correctly finds posts by title or post content (case insensitive)', () => {
    for (const post of seededPosts.slice(0, 2)) {
      const titleSearchTerm = post.title.substring(0, 5);
      const titleSearchTermUpperCase = titleSearchTerm.toUpperCase();

      const contentSearchTerm = post.content.substring(0, 5);
      const contentSearchTermUpperCase = contentSearchTerm.toUpperCase();

      for (const searchText of [
        titleSearchTerm,
        titleSearchTermUpperCase,
        contentSearchTerm,
        contentSearchTermUpperCase,
      ]) {
        cy.get('search').type('{selectall}{del}' + searchText);

        cy.get('[aria-label="blog posts"]').within(() => {
          cy.get('h2').should('contain', post.title);
        });
      }
    }
  });

  it('finds all posts that contain search term in title or content (case insensitive)', () => {
    const commonTerm = 'javascript';
    const expectedNumOfPosts = seededPosts.filter(
      (p) =>
        p.status === 'PUBLISHED' &&
        (p.content.toLowerCase().includes(commonTerm) ||
          p.title.toLowerCase().includes(commonTerm))
    ).length;
    if (expectedNumOfPosts != 2) throw new Error('Wrong fixtures');
    const commonTermUpperCase = commonTerm.toUpperCase();

    for (const searchTerm of [commonTerm, commonTermUpperCase]) {
      cy.get('search').type('{selectall}{del}' + searchTerm);
      cy.get('[aria-label="blog posts"]').within(() => {
        cy.get('article').its('length').should('eq', expectedNumOfPosts);
      });
    }
  });

  it('does not find posts that are not with status PUBLISHED', () => {
    const unpublishedPosts = seededPosts.filter(
      (p) => p.status !== 'PUBLISHED'
    );
    if (!unpublishedPosts.length) throw new Error('Missing fixtures');

    for (const post of unpublishedPosts.slice(0, 2)) {
      cy.get('search').type('{selectall}{del}' + post.title);
      cy.get('[aria-label="blog posts"]').should('not.exist');
      cy.contains('No posts found');
    }
  });
});
