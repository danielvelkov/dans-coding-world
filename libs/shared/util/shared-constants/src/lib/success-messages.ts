/**
 * Centralized default messages for successful actions
 */
export const SUCCESS_MESSAGES = {
  AUTH: {
    login: 'Login successful',
    logout: 'Logout successful',
    register: 'User registered successfully',
    token: 'New access and refresh token issued',
    revoke: 'User token/tokens revoked',
  },
  POSTS: {
    create: 'Post created successfully',
    delete: 'Post deleted successfully',
    update: 'Post updated successfully',
    get: 'Post retrieved successfully',
    getAll: 'Posts retrieved successfully',
  },
  COMMENTS: {
    getPostsComments: 'Comments for post retrieved successfully',
    getCommentReplies: 'Comment replies retrieved successfully',
    delete: 'Comment deleted successfully',
    update: 'Comment updated successfully',
  },
};
