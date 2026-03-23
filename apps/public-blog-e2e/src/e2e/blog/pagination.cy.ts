import { Post } from '@dans-coding-world/prisma-schema';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
import { randNumber } from '@ngneat/falso';

describe('Blog - pagination', () => {
  context('Element', () => {
    it(`shows up when there are more results than the default
       page size`, () => {
      cy.intercept(
        `${API_ENDPOINTS.POSTS.LIST}*`,
        generateMockPostsResponse({
          length: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE * 2,
          pageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
        })
      ).as('postsResponse');

      cy.visit('/blog');

      cy.wait('@postsResponse');

      cy.get('[aria-label="pagination"]').should('exist');
    });

    it(`is not displayed when results fit on 1 page`, () => {
      cy.intercept(
        `${API_ENDPOINTS.POSTS.LIST}*`,
        generateMockPostsResponse({
          length: 4,
          pageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
        })
      ).as('postsResponse');

      cy.visit('/blog');

      cy.wait('@postsResponse');

      cy.get('[aria-label="pagination"]').should('not.exist');
    });

    it('displays correct number of page buttons', () => {
      const expectedPages = 4;
      const pageSize = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE;
      cy.intercept(
        `${API_ENDPOINTS.POSTS.LIST}*`,
        generateMockPostsResponse({
          length: expectedPages * pageSize,
          pageSize,
        })
      ).as('postsResponse');

      cy.visit('/blog');

      cy.wait('@postsResponse');
      cy.get('[aria-label="pagination"]').within(() => {
        for (let i = 1; i <= expectedPages; i++)
          cy.contains('button', `page ${i}`);
      });
    });
  });

  context('Selection', () => {
    let seededPosts: Post[];

    before(() => {
      cy.task('db:seed-users');
      cy.fixture('blog/pagination-template.json')
        .then((postsTemplate) => {
          const numOfTestPosts = randNumber({ min: 30, max: 50 });

          const postTemplate = postsTemplate[0];
          const postsToSeed = [];

          for (let i = numOfTestPosts; i > 0; i--) {
            const dateWithOffset = new Date(postTemplate.publishedAt);
            dateWithOffset.setUTCDate(dateWithOffset.getUTCDate() + i);

            postsToSeed.push({
              ...postTemplate,
              title: postTemplate.title + i.toString(),
              content: postTemplate.content + i.toString(),
              publishedAt: dateWithOffset.toISOString(),
            });
          }

          return postsToSeed;
        })
        .then((postsToSeed) =>
          cy.task('db:seed-posts', {
            posts: postsToSeed,
            options: { useDefaults: false, clearExisting: true },
          })
        )
        .then((posts) => {
          seededPosts = posts as Post[];
          if (!seededPosts || !seededPosts.length)
            throw new Error('Missing post fixtures');

          // Sort posts by default sort order (Published date - desc)
          seededPosts.sort((prev, next) => {
            const prevDate = new Date(prev.publishedAt as Date);
            const nextDate = new Date(next.publishedAt as Date);
            return nextDate.getTime() - prevDate.getTime();
          });
        });
    });

    beforeEach(() => {
      cy.visit('/blog');
    });

    it(`navigates to next page of results on clicking "next"`, () => {
      const pagesWithPostsArray = Cypress._.chunk(
        seededPosts,
        PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
      );

      const numOfPages = pagesWithPostsArray.length;
      let i = 0;
      do {
        pagesWithPostsArray[i].forEach((post) => {
          cy.contains('h2', post.title);
        });
        if (i < numOfPages - 1) cy.clickNextPage();
      } while (i++ < numOfPages - 1);
    });

    it('disables "next" button if on last page of results', () => {
      const lastPage = Math.ceil(
        seededPosts.length / PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
      );
      cy.goToPage(lastPage);
      cy.get('[aria-label="next page"]').should('have.attr', 'disabled');
      cy.get('[aria-label="prev page"]').should('not.have.attr', 'disabled');
    });

    it(`navigates to previous page on clicking "prev"`, () => {
      const pagesWithPostsArray = Cypress._.chunk(
        seededPosts,
        PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
      );

      const numOfPages = pagesWithPostsArray.length;
      let i = numOfPages - 1;

      cy.goToPage(numOfPages);

      do {
        pagesWithPostsArray[i].forEach((post) => {
          cy.contains('h2', post.title);
        });
        if (i > 0) cy.clickPrevPage();
      } while (i-- > 0);
    });

    it('disables "prev" button if on first page of results', () => {
      cy.goToPage(1);
      cy.get('[aria-label="prev page"]').should('have.attr', 'disabled');
      cy.get('[aria-label="next page"]').should('not.have.attr', 'disabled');
    });

    it('navigating to a random page displays the right results', () => {
      const pagesWithPostsArray = Cypress._.chunk(
        seededPosts,
        PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
      );

      const numOfPages = pagesWithPostsArray.length;
      const randomPages = Cypress._.shuffle(
        [...Array.from({ length: numOfPages })].map((_, i) => i + 1)
      );

      for (const randomPage of randomPages) {
        cy.goToPage(randomPage);
        pagesWithPostsArray[randomPage - 1].forEach((post) => {
          cy.contains('h2', post.title);
        });
      }
    });

    context('with different items per page selected', () => {
      it('shows the right amount of posts', () => {
        for (const pageSize of PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS) {
          cy.selectItemsPerPage(pageSize);
          cy.get('article').should('have.length', pageSize);
        }
      });

      it('displays correct number of pagination buttons', () => {
        for (const pageSize of PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS) {
          cy.selectItemsPerPage(pageSize);
          const expectedPages = Math.ceil(seededPosts.length / pageSize);

          cy.get('[aria-label="pagination"]')
            .find('button')
            .parent()
            .next(':not(:contains(next))')
            // +1 because of prev button being included
            .should('have.length', expectedPages + 1);
        }
      });

      it('shows correct results when navigating to random pages', () => {
        for (const pageSize of PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS) {
          cy.selectItemsPerPage(pageSize);
          const pagesWithPostsArray = Cypress._.chunk(seededPosts, pageSize);

          const numOfPages = pagesWithPostsArray.length;
          const randomPages = Cypress._.shuffle(
            [...Array.from({ length: numOfPages })].map((_, i) => i + 1)
          );

          for (const randomPage of randomPages) {
            cy.goToPage(randomPage);
            pagesWithPostsArray[randomPage - 1].forEach((post) => {
              cy.contains('h2', post.title);
            });
          }
        }
      });
    });
  });
});
