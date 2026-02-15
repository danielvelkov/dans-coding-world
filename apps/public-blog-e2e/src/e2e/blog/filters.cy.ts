import { Post } from '@dans-coding-world/prisma-schema';
describe('Blog - filters', () => {
  let seededPosts: Post[];
  before(() => {
    cy.task('db:seed-users');
    cy.fixture('posts-filters-dataset.json').then((posts) =>
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

  context('Type dropdown', () => {
    it('should have all types toggled by default', () => {
      cy.contains('label', 'Type')
        .next()
        .should('contain.text', 'Public')
        .and('contain.text', 'Members-only');
    });

    it('applies filtering correctly when deselecting options', () => {
      const testCases = [
        { remove: 'Public', show: 'MEMBERS_ONLY' },
        { remove: 'Members-only', show: 'PUBLIC' },
      ];

      testCases.forEach(({ remove, show }) => {
        cy.visit('/blog');
        cy.get(`[aria-label="Remove ${remove}"]`).click();

        const expectedTitles = seededPosts
          .filter((p) => p.visibility === show)
          .map((p) => p.title);

        cy.get('[aria-label="blog posts"] article h2').each(($h2) => {
          expect($h2.text()).to.be.oneOf(expectedTitles);
        });
      });
    });

    it('does not allow deselecting all options', () => {
      cy.get(`[aria-label="Remove Members-only"]`).should('exist');
      cy.get(`[aria-label="Remove Public"]`).click();
      cy.get(`[aria-label="Remove Members-only"]`).should('not.exist');
    });
  });

  // TODO:
  // context.only('By published year selection section', () => {
  //   it('shows posts published ')
  // });
});
