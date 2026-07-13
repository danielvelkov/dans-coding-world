import type { Post, User } from '@dans-coding-world/prisma-schema';

describe('Blog - general', () => {
  let seededPosts: Post[];
  let seededUsers: User[];

  before(() => {
    cy.task('db:seed-users', {
      options: { useDefaults: true, clearExisting: true },
    }).then((users) => {
      seededUsers = users as User[];
      if (!seededUsers || !seededUsers.length)
        throw new Error('Missing user fixtures');
    });
    cy.fixture('blog/sorting-dataset.json').then((posts) =>
      cy
        .task('db:seed-posts', {
          posts,
          options: { useDefaults: false, clearExisting: true },
        })
        .then((posts) => {
          seededPosts = posts as Post[];
          if (!seededPosts || !seededPosts.length)
            throw new Error('Missing post fixtures');
        }),
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
        (p) => p.visibility === 'MEMBERS_ONLY' && p.status === 'PUBLISHED',
      );
      if (!membersOnlyPost) throw new Error('Missing members only post');

      cy.contains('article h2', membersOnlyPost.title)
        .closest('article')
        .within(() => {
          cy.contains(membersOnlyPost.content.substring(0, 10)).should(
            'not.exist',
          );
          cy.contains('a', /continue reading/i).should('not.exist');

          cy.contains(membersOnlyPost.title).click();
          cy.url().should('not.include', `/blog/${membersOnlyPost.id}`);

          cy.contains('a', /members only/i)
            .should('exist')
            .click();
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

    it('posts that are members-only are shown to logged in users', () => {
      const randomUser = Cypress._.sample(seededUsers) as User;
      cy.visit('/login');
      cy.login(randomUser.email, randomUser.password);

      const membersOnlyPost = seededPosts.find(
        (p) => p.visibility === 'MEMBERS_ONLY' && p.status === 'PUBLISHED',
      );
      if (!membersOnlyPost) throw new Error('Missing members only post');

      cy.contains('article h2', membersOnlyPost.title)
        .closest('article')
        .within(() => {
          cy.contains(membersOnlyPost.content.substring(0, 10)).should('exist');
        });
    });
  });
});
