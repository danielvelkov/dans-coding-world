export const PREFIX = '/api/v1';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${PREFIX}/auth/login`,
    LOGOUT: `${PREFIX}/auth/logout`,
  },
  USERS: {
    BY_ID: (userId: number) => `${PREFIX}/users/${userId}`,
  },
  POSTS: {
    LIST: `${PREFIX}/posts`,
    BY_ID: (postId: number) => `${PREFIX}/posts/${postId}`,
  },
};
