import type { Post, Tag } from '@dans-coding-world/prisma-schema';
describe('Blog - filters', () => {
  type PostWithTags = Post & { tags: string[] };

  let seededPosts: PostWithTags[];

  before(() => {
    cy.task('db:seed-users');

    cy.fixture('blog/filters-dataset.json').then((fixturePosts) => {
      const postsWithoutTags = fixturePosts.map(
        ({ tags, ...rest }: { tags: string[] }) => rest,
      );

      cy.task('db:seed-posts', {
        posts: postsWithoutTags,
        options: { useDefaults: false, clearExisting: true },
      })
        .then((seeded) => {
          const posts = seeded as Post[];
          if (!posts?.length) throw new Error('Missing post fixtures');

          seededPosts = posts.map((p) => ({ ...p, tags: [] }));

          // seed tags
          const uniqueTags = [
            ...new Set(fixturePosts.flatMap((p: any) => p.tags)),
          ].map((name) => ({ name }));

          return cy.task('db:seed-tags', {
            tags: uniqueTags,
            options: { useDefaults: false, clearExisting: true },
          });
        })
        .then((seeded) => {
          const seededTags = seeded as Tag[];
          // build a mapping: postId → tagIds[]
          const postTagPairs: { postId: number; tagIds: number[] }[] = [];

          for (const fixturePost of fixturePosts) {
            const seededPost = seededPosts.find((p) =>
              Cypress._.isEqual(
                Cypress._.pick(p, ['title', 'status', 'content', 'visibility']),
                Cypress._.pick(fixturePost, [
                  'title',
                  'status',
                  'content',
                  'visibility',
                ]),
              ),
            );

            if (!seededPost) throw new Error('Post must exist');

            const tagIds = seededTags
              .filter((t) => fixturePost.tags.includes(t.name))
              .map((t) => t.id);

            postTagPairs.push({ postId: seededPost.id, tagIds });

            // update seededPosts so tests can use "tags" prop
            seededPost.tags = fixturePost.tags;
          }

          return cy.task('db:attach-tags', { data: postTagPairs });
        });
    });
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
          .filter((p) => p.visibility === show && p.status === 'PUBLISHED')
          .map((p) => p.title);
        cy.get('[aria-label="blog posts"] article h2')
          .should('have.length', expectedTitles.length)
          .each(($h2) => {
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
          seededPosts.map((p) => new Date(p.publishedAt as Date).getFullYear()),
        ),
      ];
      for (const selectedYear of postsYears) {
        cy.selectPostPublicationYearFilter(selectedYear);
        cy.contains('button', selectedYear).should(
          'have.attr',
          'aria-pressed',
          'true',
        );
        Cypress._.without(postsYears, selectedYear).forEach(
          (notSelectedYear) => {
            cy.contains('button', notSelectedYear).should(
              'not.have.attr',
              'aria-pressed',
            );
          },
        );
      }
    });

    it('selecting an active year filter deselects it', () => {
      const postsYears = [
        ...new Set(
          seededPosts.map((p) => new Date(p.publishedAt as Date).getFullYear()),
        ),
      ];
      const selectedYear = postsYears[Cypress._.random(postsYears.length - 1)];
      cy.selectPostPublicationYearFilter(selectedYear);
      cy.contains('button', selectedYear).should(
        'have.attr',
        'aria-pressed',
        'true',
      );
      cy.selectPostPublicationYearFilter(selectedYear);
      cy.contains('button', selectedYear).should(
        'not.have.attr',
        'aria-pressed',
      );
    });

    it('applies filtering correctly when selecting post publication year', () => {
      const uniquePublicationYears = new Set(
        seededPosts.map((p) => new Date(p.publishedAt as Date).getFullYear()),
      );
      uniquePublicationYears.forEach((year) => {
        cy.selectPostPublicationYearFilter(year);
        cy.get('[aria-label="blog posts"] article time').each(($timeElm) => {
          expect($timeElm.attr('datetime')).to.satisfy((timeString: string) =>
            timeString.startsWith(year.toString()),
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
        },
      );

      if (!postsOfSameYearThatAreDraftAndPublic)
        throw new Error('Missing test fixture');

      cy.selectPostPublicationYearFilter(
        postsOfSameYearThatAreDraftAndPublic[0].year,
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

    context('by tags', () => {
      it('filters posts by selected tag', () => {
        const randomTag = Cypress._.sample(
          seededPosts
            .filter((p) => p.status === 'PUBLISHED')
            .map((p) => p.tags)
            .flat(),
        );
        if (!randomTag) throw new Error('Tag must exist');

        cy.selectPostTagFilter(randomTag);
        assertCorrectPostsShown(
          (p) => p.tags.includes(randomTag),
          (p) => !p.tags.includes(randomTag),
        );
      });

      it('selecting two or more tags shows posts containing any of the active tags', () => {
        const publicTags = Cypress._.uniq(
          seededPosts
            .filter((p) => p.status === 'PUBLISHED')
            .map((p) => p.tags)
            .flat(),
        );

        const randomlySelectedTags = Cypress._.sampleSize(publicTags, 2);
        if (!randomlySelectedTags) throw new Error('Tags must exist');

        for (const tag of randomlySelectedTags) cy.selectPostTagFilter(tag);

        assertCorrectPostsShown(
          (p) =>
            Cypress._.some(p.tags, (element) =>
              Cypress._.includes(randomlySelectedTags, element),
            ),
          (p) =>
            Cypress._.every(
              p.tags,
              (element) => !Cypress._.includes(randomlySelectedTags, element),
            ),
        );
      });

      it('clicking on a tag toggles it as active or inactive', () => {
        const randomTag = Cypress._.sample(
          seededPosts
            .filter((p) => p.status === 'PUBLISHED')
            .map((p) => p.tags)
            .flat(),
        );
        if (!randomTag) throw new Error('Tag must exist');

        cy.selectPostTagFilter(randomTag);

        cy.contains('h3', 'Tags')
          .invoke('attr', 'id')
          .then((id) => {
            cy.get(`section[aria-labelledby="${id}"]`).within(() => {
              cy.contains('button', randomTag).should(
                'have.attr',
                'aria-pressed',
                'true',
              );
            });
          });

        cy.selectPostTagFilter(randomTag);

        cy.contains('h3', 'Tags')
          .invoke('attr', 'id')
          .then((id) => {
            cy.get(`section[aria-labelledby="${id}"]`).within(() => {
              cy.contains('button', randomTag).should(
                'have.attr',
                'aria-pressed',
                'false',
              );
            });
          });
      });

      it('does not show tags used in unpublished posts', () => {
        const tagsOnlyUsedInPrivatePosts = seededPosts
          .map((p) => p.tags)
          .flat()
          .filter(
            (tagName) =>
              seededPosts.find(
                (p) => p.status === 'PUBLISHED' && !p.tags.includes(tagName),
              ) &&
              seededPosts.find(
                (p) => p.status !== 'PUBLISHED' && p.tags.includes(tagName),
              ),
          );
        if (!tagsOnlyUsedInPrivatePosts)
          throw new Error('Missing private post tag');
        cy.contains('h3', 'Tags')
          .invoke('attr', 'id')
          .then((id) => {
            cy.get(`section[aria-labelledby="${id}"]`).within(() => {
              for (const tagOnlyUsedInPrivatePosts of tagsOnlyUsedInPrivatePosts)
                cy.contains('button', tagOnlyUsedInPrivatePosts).should(
                  'not.exist',
                );
              for (const publicTag of Cypress._.without(
                seededPosts
                  .filter((p) => p.status === 'PUBLISHED')
                  .map((p) => p.tags)
                  .flat(),
                ...tagsOnlyUsedInPrivatePosts,
              ))
                cy.contains('button', publicTag).should('exist');
            });
          });
      });

      it(`does not show unpublished posts even if specific tags
        not present in page are used in URL`, () => {
        const tagOnlyUsedInPrivatePosts = seededPosts
          .map((p) => p.tags)
          .flat()
          .find(
            (tagName) =>
              seededPosts.find(
                (p) => p.status === 'PUBLISHED' && !p.tags.includes(tagName),
              ) &&
              seededPosts.find(
                (p) => p.status !== 'PUBLISHED' && p.tags.includes(tagName),
              ),
          );
        if (!tagOnlyUsedInPrivatePosts)
          throw new Error('Missing private post tag');
        cy.visit(`/blog?filterBy[tags][0]=${tagOnlyUsedInPrivatePosts}`);
        cy.contains('No posts found');
      });

      function assertCorrectPostsShown(
        expectedPostsPredicate: (post: PostWithTags) => boolean,
        unexpectedPostsPredicate: (post: PostWithTags) => boolean,
      ) {
        const expectedTitles = seededPosts
          .filter(expectedPostsPredicate)
          .map((p) => p.title);

        const unexpectedTitles = seededPosts
          .filter(unexpectedPostsPredicate)
          .map((p) => p.title);

        cy.get('[aria-label="blog posts"] article h2').each(($h2) => {
          expect($h2.text()).to.be.oneOf(expectedTitles);
          expect($h2.text()).not.to.be.oneOf(unexpectedTitles);
        });
      }
    });
  });
});
