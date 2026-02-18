import { Post } from '@dans-coding-world/prisma-schema';

describe('Blog - general', () => {
  let seededPosts: Post[];
  before(() => {
    cy.task('db:seed-users');
    cy.fixture('posts-sorting-dataset.json').then((posts) =>
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

  context('blog posts', () => {
    it(`navigates to post's page when clicking on title
       or "Continue reading" button`, () => {
      cy.contains(seededPosts[0].title).click();
      cy.url().should('include', `/blog/${seededPosts[0].id}`);

      cy.visit('/blog');

      cy.contains('a', /continue reading/i).click();
      cy.url().should('include', `/blog/${seededPosts[0].id}`);
    });

    it(`does not show content or provide navigation 
      for members-only posts when logged out`, () => {
      const membersOnlyPost = seededPosts.find(
        (p) => p.visibility === 'MEMBERS_ONLY'
      );
      if (!membersOnlyPost) throw new Error('Missing members only post');

      cy.contains('article h2', membersOnlyPost.title)
        .closest('article')
        .within(() => {
          cy.contains(membersOnlyPost.content.substring(0, 20)).should(
            'not.exist'
          );
          cy.contains('a', /continue reading/i).should('not.exist');

          cy.contains(membersOnlyPost.title).click();
          cy.url().should('not.include', `/blog/${membersOnlyPost.id}`);

          cy.contains('Members Only').should('exist').click();
          cy.url().should('include', `/login`);
        });
    });

    it(`navigates to the author's user page 
      when selecting blog author`, () => {
      cy.get('article')
        .its(0)
        .within(() => {
          cy.get('[aria-label^="View profile of "]').click();
          cy.url().should('match', /\/users\/\d/);
        });
    });

    // TODO:
    it.skip('posts that are members-only are shown to logged in users');
  });
});
