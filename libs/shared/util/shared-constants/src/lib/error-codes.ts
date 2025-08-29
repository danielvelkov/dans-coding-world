type ValueOf<T> = T[keyof T];

/**
 * Centralized error codes for the app.
 * Format: [MODULE][ERROR]-[CODE]
 */
export const ERROR_CODES = {
  AUTH: {
    INVALID_CREDENTIALS: 'AUTH001',
  },
} as const;

export type ErrorCode = ValueOf<ValueOf<typeof ERROR_CODES>>;

/**
 * Centralized default error messages for the app.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH001: 'Provided credentials are invalid',
};

/**
 * Centralized http status codes for errors
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  AUTH001: 401,
};
