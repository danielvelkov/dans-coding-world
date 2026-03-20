import { Comment, Post } from '@dans-coding-world/prisma-schema';

const SORT_LABELS = ['Most recent', 'Oldest first'] as const;

describe('Comments - sorting', () => {
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

  it('should have comment sorting dropdown element', () => {
    cy.contains('label', /sort comments/i)
      .invoke('attr', 'for')
      .then((id) => {
        cy.get(`#${id}`).should('exist');
      });
  });

  it('sorts comments by "Most Recent" by default', () => {
    cy.contains(SORT_LABELS[0]);
    checkIfCommentsSortedCorrectly(
      testComments.filter((c) => !c.threadParentId),
      'desc'
    );
  });

  it('should sort comments accordingly when selecting option from dropdown', () => {
    cy.selectCommentSorting(SORT_LABELS[1]);
    checkIfCommentsSortedCorrectly(
      testComments.filter((c) => !c.threadParentId),
      'asc'
    );

    cy.selectCommentSorting(SORT_LABELS[0]);
    checkIfCommentsSortedCorrectly(
      testComments.filter((c) => !c.threadParentId),
      'desc'
    );
  });

  it(`should keep the number of loaded elements after
     selecting different sort order`, () => {
    const totalRootComments = testComments.filter((c) => !c.threadParentId);
    let defaultLoadedComments = 10;
    if (totalRootComments.length < defaultLoadedComments)
      defaultLoadedComments = totalRootComments.length;

    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      cy.get('li').its('length').should('eq', defaultLoadedComments);
    });
    cy.contains('button', 'Load more').click();
    cy.selectCommentSorting(SORT_LABELS[1]);

    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      cy.get('li').its('length').should('eq', defaultLoadedComments);
    });

    cy.selectCommentSorting(SORT_LABELS[0]);

    let totalCommentsAfterLoadingMore = defaultLoadedComments * 2;

    if (totalRootComments.length < defaultLoadedComments * 2)
      totalCommentsAfterLoadingMore = totalRootComments.length;

    cy.get(`ul[aria-label="Post comments"]`).within(() => {
      cy.get('li').its('length').should('eq', totalCommentsAfterLoadingMore);
    });
  });
});

function checkIfCommentsSortedCorrectly(
  comments: Comment[],
  order: 'asc' | 'desc'
) {
  const commentsOrderedByCreatedDateDesc = [...comments].sort((prev, next) => {
    const prevDate = new Date(prev.createdAt as Date);
    const nextDate = new Date(next.createdAt as Date);
    if (order === 'desc') return nextDate.getTime() - prevDate.getTime();
    else return prevDate.getTime() - nextDate.getTime();
  });

  cy.get('[aria-label="Post comments"] > li p').each(($h2, index) => {
    expect($h2.text()).to.equal(
      commentsOrderedByCreatedDateDesc[index].content
    );
  });
}
