export const TOKEN_CONSTRAINTS = {
  ACCESS_TOKEN_EXPIRATION: 1000 * 60 * 15, // 15 min in ms
  REFRESH_TOKEN_EXPIRATION: 1000 * 60 * 60 * 24 * 30, // 1 month in ms
} as const;
