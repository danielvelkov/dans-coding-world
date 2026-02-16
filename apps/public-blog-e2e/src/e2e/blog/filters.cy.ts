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

  context('by publication year', () => {
    it('clicking on a year button marks it as the only one selected', () => {
      const postsYears = [
        ...new Set(
          seededPosts.map((p) => new Date(p.publishedAt as Date).getFullYear())
        ),
      ];
      for (const selectedYear of postsYears) {
        cy.selectPostPublicationYearFilter(selectedYear);
        cy.contains('button', selectedYear).should(
          'have.attr',
          'aria-pressed',
          'true'
        );
        Cypress._.without(postsYears, selectedYear).forEach(
          (notSelectedYear) => {
            cy.contains('button', notSelectedYear).should(
              'not.have.attr',
              'aria-pressed'
            );
          }
        );
      }
    });

    it('selecting an active year filter deselects it', () => {
      const postsYears = [
        ...new Set(
          seededPosts.map((p) => new Date(p.publishedAt as Date).getFullYear())
        ),
      ];
      const selectedYear = postsYears[Cypress._.random(postsYears.length - 1)];
      cy.selectPostPublicationYearFilter(selectedYear);
      cy.contains('button', selectedYear).should(
        'have.attr',
        'aria-pressed',
        'true'
      );
      cy.selectPostPublicationYearFilter(selectedYear);
      cy.contains('button', selectedYear).should(
        'not.have.attr',
        'aria-pressed'
      );
    });

    it('applies filtering correctly when selecting post publication year', () => {
      const uniquePublicationYears = new Set(
        seededPosts.map((p) => new Date(p.publishedAt as Date).getFullYear())
      );
      uniquePublicationYears.forEach((year) => {
        cy.selectPostPublicationYearFilter(year);
        cy.get('[aria-label="blog posts"] article time').each(($timeElm) => {
          expect($timeElm.attr('datetime')).to.satisfy((timeString: string) =>
            timeString.startsWith(year.toString())
          );
        });
      });
    });

    it('filtering by publication year does not show unpublished posts', () => {
      const postsWithYear = seededPosts.map((p) => ({
        ...p,
        year: new Date(p.publishedAt as Date).getFullYear(),
      }));
      const groupedByYear = Cypress._.groupBy(postsWithYear, 'year');
      const postsOfSameYearThatAreDraftAndPublic = Cypress._.find(
        groupedByYear,
        (posts) => {
          const statuses = Cypress._.map(posts, 'status');
          return statuses.includes('PUBLISHED') && statuses.includes('DRAFT');
        }
      );

      if (!postsOfSameYearThatAreDraftAndPublic)
        throw new Error('Missing test fixture');

      cy.selectPostPublicationYearFilter(
        postsOfSameYearThatAreDraftAndPublic[0].year
      );

      const expectedTitles = postsOfSameYearThatAreDraftAndPublic
        .filter((p) => p.status === 'PUBLISHED')
        .map((p) => p.title);

      const unexpectedTitles = postsOfSameYearThatAreDraftAndPublic
        .filter((p) => p.status !== 'PUBLISHED')
        .map((p) => p.title);

      cy.get('[aria-label="blog posts"] article h2').each(($h2) => {
        expect($h2.text()).to.be.oneOf(expectedTitles);
        expect($h2.text()).not.to.be.oneOf(unexpectedTitles);
      });
    });
  });
});
