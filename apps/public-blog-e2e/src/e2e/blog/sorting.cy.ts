import type { Post } from '@dans-coding-world/prisma-schema';

const SORT_LABELS = [
  'Published date (desc)',
  'Published date (asc)',
  'Last modified date (asc)',
  'Last modified date (desc)',
] as const;

describe('Blog - sorting', () => {
  let seededPosts: Post[];

  before(() => {
    cy.task('db:seed-users');
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

  it('sorts posts by "Published date (desc)" by default', () => {
    cy.contains(SORT_LABELS[0]);

    checkIfSortedCorrectly(
      seededPosts.filter((p) => p.status === 'PUBLISHED'),
      'publishedAt',
      'desc',
    );
  });

  it('sorts posts correctly', () => {
    for (const label of SORT_LABELS) {
      let field: Parameters<typeof checkIfSortedCorrectly>[1],
        order: Parameters<typeof checkIfSortedCorrectly>[2];
      if (label.includes('Published')) field = 'publishedAt';
      else field = 'updatedAt';
      if (label.includes('desc')) order = 'desc';
      else order = 'asc';

      cy.selectPostSorting(label);
      checkIfSortedCorrectly(
        seededPosts.filter((p) => p.status === 'PUBLISHED'),
        field,
        order,
      );
    }
  });
});

function checkIfSortedCorrectly(
  posts: Post[],
  field: 'publishedAt' | 'updatedAt',
  order: 'asc' | 'desc',
) {
  const postsOrderedByPublishedDateDesc = [...posts].sort((prev, next) => {
    const prevDate = new Date(prev[field] as Date);
    const nextDate = new Date(next[field] as Date);
    if (order === 'desc') return nextDate.getTime() - prevDate.getTime();
    else return prevDate.getTime() - nextDate.getTime();
  });

  cy.get('[aria-label="blog posts"] article h2').each(($h2, index) => {
    expect($h2.text()).to.equal(postsOrderedByPublishedDateDesc[index].title);
  });
}
