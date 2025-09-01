import { StatusCodes } from 'http-status-codes';
// T extends object: This is a conditional type. It checks if T is an object type (i.e., not a primitive like string, number, etc.).
// keyof T: Gets all the keys of T as a union of string/number/symbol literals.
// T[keyof T]: Indexes into T using all its keys, resulting in a union of all the values.
type ValueOf<T> = T extends object ? T[keyof T] : never;

/**
 * Centralized error codes for the app.
 * Format: [MODULE][ERROR]-[CODE]
 */
export const ERROR_CODES = {
  AUTH: {
    INVALID_CREDENTIALS: 'AUTH001',
    INVALID_PASSWORD: 'AUTH002',
  },
  SERVER: {
    INTERNAL_ERROR: 'SER001',
    NOT_FOUND: 'SER002',
  },
} as const;

export type ErrorCode = ValueOf<ValueOf<typeof ERROR_CODES>>;

/**
 * Centralized default error messages for the app.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH001: 'Provided credentials are invalid',
  AUTH002: 'Provided password is wrong',

  SER001: 'Internal Server Error',
  SER002: 'Resource not found',
};

/**
 * Centralized http status codes for errors
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  AUTH001: StatusCodes.OK,
  AUTH002: StatusCodes.UNAUTHORIZED,

  SER001: StatusCodes.INTERNAL_SERVER_ERROR,
  SER002: StatusCodes.NOT_FOUND,
};
