import { Comment, Post } from '@dans-coding-world/prisma-schema';
import { PAGINATION } from '@dans-coding-world/shared-constants';

describe('Comments - pagination', () => {
  let testPost: Post;
  let testComments: Comment[];

  before(() => {
    cy.task('db:seed-users', {
      options: { useDefaults: true, clearExisting: true },
    }).then(() => {
      cy.task('db:seed-profiles', {
        options: { useDefaults: true, clearExisting: true },
      });
    });

    cy.fixture('post/example-post.json').then((fixturePosts) => {
      cy.task('db:seed-posts', {
        posts: fixturePosts,
        options: { useDefaults: false, clearExisting: true },
      }).then((posts) => {
        [testPost] = posts as Post[];
        cy.log(JSON.stringify(testPost));
        if (!testPost) throw new Error('Missing post fixtures');
      });
    });

    cy.fixture('post/comments/sorting-dataset.json').then((fixtureComments) => {
      cy.task('db:seed-comments', {
        comments: fixtureComments,
        options: { useDefaults: false, clearExisting: true },
      }).then((comments) => {
        testComments = comments as Comment[];
        if (!testComments || !testComments.length)
          throw new Error('Missing comment fixtures');
      });
    });
  });

  beforeEach(() => {
    cy.visit(`/blog/${testPost.id}`);
  });

  it(`should show "Load more" button if post's total comments are more
    than default limit`, () => {
    const totalRootComments = testComments.filter((c) => !c.threadParentId);
    let defaultLoadedComments = PAGINATION.COMMENTS
      .DEFAULT_ITEMS_PER_PAGE as number;
    if (totalRootComments.length < defaultLoadedComments)
      defaultLoadedComments = totalRootComments.length;

    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      cy.get('li').its('length').should('eq', defaultLoadedComments);
    });
    cy.contains('button', 'Load more').should('exist');
  });

  it('should load next batch of comments on selecting "Load more"', () => {
    const totalRootComments = testComments.filter((c) => !c.threadParentId);
    let defaultLoadedComments = PAGINATION.COMMENTS
      .DEFAULT_ITEMS_PER_PAGE as number;

    if (totalRootComments.length < defaultLoadedComments)
      defaultLoadedComments = totalRootComments.length;

    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      cy.get('li').its('length').should('eq', defaultLoadedComments);
    });

    cy.contains('button', 'Load more').click();
    let totalCommentsAfterLoadingMore = defaultLoadedComments * 2;

    if (totalRootComments.length < defaultLoadedComments * 2)
      totalCommentsAfterLoadingMore = totalRootComments.length;

    const commentsOrderedByCreatedDateDesc = [...totalRootComments].sort(
      (prev, next) => {
        const prevDate = new Date(prev.createdAt as Date);
        const nextDate = new Date(next.createdAt as Date);
        return nextDate.getTime() - prevDate.getTime();
      }
    );

    cy.get('[aria-label="Post comments"] > li')
      .its('length')
      .should('eq', totalCommentsAfterLoadingMore);

    cy.get('[aria-label="Post comments"] > li p').each(($p, index) => {
      expect($p.text()).to.equal(
        commentsOrderedByCreatedDateDesc[index].content
      );
    });
  });

  it('should show the button until all comments are loaded by user', () => {
    const totalRootComments = testComments.filter((c) => !c.threadParentId);
    const defaultLoadedComments = PAGINATION.COMMENTS
      .DEFAULT_ITEMS_PER_PAGE as number;

    const totalPages = Math.ceil(
      totalRootComments.length / defaultLoadedComments
    );
    for (let i = 1; i < totalPages; i++) {
      cy.contains('button', 'Load more').click();

      const onLastPage = i + 1 === totalPages;
      const totalComments = onLastPage
        ? totalRootComments.length
        : defaultLoadedComments * (i + 1);

      cy.get(`ul[aria-label="Post comments"]`).within(() => {
        cy.get('li').its('length').should('eq', totalComments);
      });
    }

    cy.contains('button', 'Load more').should('not.exist');
  });
});
