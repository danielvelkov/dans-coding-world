export const PROD_PREFIX = '/api/v1';
export const TEST_DATA_PREFIX = '/test';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${PROD_PREFIX}/auth/login`,
    LOGOUT: `${PROD_PREFIX}/auth/logout`,
    REGISTER: `${PROD_PREFIX}/auth/register`,
    REFRESH: `${PROD_PREFIX}/auth/refresh`,
    REVOKE: `${PROD_PREFIX}/auth/revoke-token`,
    REVOKE_ALL: `${PROD_PREFIX}/auth/revoke-all`,
  },
  USERS: {
    BY_ID: (userId: number) => `${PROD_PREFIX}/users/${userId}`,
    REVOKE_TOKENS: (userId: number) =>
      `${PROD_PREFIX}/users/${userId}/revoke-tokens`,
    UPDATE: `${PROD_PREFIX}/users`,
    PASSWORD: `${PROD_PREFIX}/users/password`,
    ROLE_CHANGE: (userId: number) => `${PROD_PREFIX}/users/${userId}/role`,
    BAN: (userId: number) => `${PROD_PREFIX}/users/${userId}/ban`,
  },
  POSTS: {
    LIST: `${PROD_PREFIX}/posts`,
    BY_ID: (postId: number) => `${PROD_PREFIX}/posts/${postId}`,
    METADATA: `${PROD_PREFIX}/posts/metadata`,
  },
  COMMENTS: {
    LIST: (postId: number) => `${PROD_PREFIX}/posts/${postId}/comments`,
    BY_ID: (postId: number, commentId: number) =>
      `${PROD_PREFIX}/posts/${postId}/comments/${commentId}`,
  },
  TAGS: {
    LIST: `${PROD_PREFIX}/tags`,
    BY_ID: (tagId: number) => `${PROD_PREFIX}/tags/${tagId}`,
  },
  REPORTS: {
    COMMENTS: {
      LIST: `${PROD_PREFIX}/reports/comments`,
      BY_ID: (reportId: number) =>
        `${PROD_PREFIX}/reports/comments/${reportId}`,
    },
  },
  TEST_DATA: {
    USERS: `${TEST_DATA_PREFIX}/users`,
    POSTS: `${TEST_DATA_PREFIX}/posts`,
    COMMENTS: `${TEST_DATA_PREFIX}/comments`,
    TAGS: `${TEST_DATA_PREFIX}/tags`,
    REPORTS: `${TEST_DATA_PREFIX}/reports`,
  },
};
