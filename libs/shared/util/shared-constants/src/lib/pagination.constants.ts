export const PAGINATION = {
  POSTS: {
    ITEMS_PER_PAGE_OPTIONS: [5, 10, 25],
    DEFAULT_ITEMS_PER_PAGE: 5,
  },
  COMMENTS: {
    ITEMS_PER_PAGE_OPTIONS: [10, 25, 50],
    DEFAULT_ITEMS_PER_PAGE: 10,
  },
  REPORTS: {
    ITEMS_PER_PAGE_OPTIONS: [10, 25, 50],
    DEFAULT_ITEMS_PER_PAGE: 10,
  },
} as const;

export const calculatePageOffset = (
  page: number,
  pageLimit: number = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
) => (page - 1) * pageLimit;
