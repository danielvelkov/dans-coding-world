export const PREFIX = '/api/v1';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${PREFIX}/auth/login`,
    LOGOUT: `${PREFIX}/auth/logout`,
    REGISTER: `${PREFIX}/auth/register`,
    REFRESH: `${PREFIX}/auth/refresh`,
    REVOKE: `${PREFIX}/auth/revoke-token`,
    REVOKE_ALL: `${PREFIX}/auth/revoke-all`,
  },
  USERS: {
    BY_ID: (userId: number) => `${PREFIX}/users/${userId}`,
    REVOKE_TOKENS: (userId: number) =>
      `${PREFIX}/users/${userId}/revoke-tokens`,
    UPDATE: `${PREFIX}/users`,
    PASSWORD: `${PREFIX}/users/password`,
    ROLE_CHANGE: (userId: number) => `${PREFIX}/users/${userId}/role`,
    BAN: (userId: number) => `${PREFIX}/users/${userId}/ban`,
  },
  POSTS: {
    LIST: `${PREFIX}/posts`,
    BY_ID: (postId: number) => `${PREFIX}/posts/${postId}`,
    METADATA: `${PREFIX}/posts/metadata`,
  },
  COMMENTS: {
    LIST: (postId: number) => `${PREFIX}/posts/${postId}/comments`,
    BY_ID: (postId: number, commentId: number) =>
      `${PREFIX}/posts/${postId}/comments/${commentId}`,
  },
  TAGS: {
    LIST: `${PREFIX}/tags`,
    BY_ID: (tagId: number) => `${PREFIX}/tags/${tagId}`,
  },
  REPORTS: {
    COMMENTS: {
      LIST: `${PREFIX}/reports/comments`,
      BY_ID: (reportId: number) => `${PREFIX}/reports/comments/${reportId}`,
    },
  },
};
