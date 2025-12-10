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
  USERS: {
    get: 'User details retrieved successfully',
    update: 'Profile updated successfully',
    delete: 'Account deleted successfully',
  },
  POSTS: {
    create: 'Post created successfully',
    delete: 'Post deleted successfully',
    update: 'Post updated successfully',
    get: 'Post retrieved successfully',
    getAll: 'Posts retrieved successfully',
    getMetadata: 'Posts metadata retrieved successfully',
  },
  TAGS: {
    create: 'Tag created successfully',
    delete: 'Tag deleted successfully',
    update: 'Tag name updated successfully',
    get: 'Tag retrieved successfully',
    getAll: 'Tags retrieved successfully',
  },
  COMMENTS: {
    getPostsComments: 'Comments for post retrieved successfully',
    get: 'Comment with replies retrieved successfully',
    delete: 'Comment deleted successfully',
    update: 'Comment updated successfully',
    create: 'Comment posted successfully',
  },
  REPORTS: {
    create: 'Report submitted successfully',
    delete: 'Report deleted successfully',
    updateStatus: 'Report status changed successfully',
    get: 'Report retrieved successfully',
    getAll: 'Reports retrieved successfully',
  },
};
