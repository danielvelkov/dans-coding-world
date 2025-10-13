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
    INVALID_TOKEN: 'AUTH003',
    TOKEN_NOT_FOUND: 'AUTH004',
    UNAUTHORIZED: 'AUTH005',
  },
  SERVER: {
    INTERNAL_ERROR: 'SER001',
    NOT_FOUND: 'SER002',
    FORBIDDEN: 'SER003',
  },
  VALIDATION: {
    VALIDATION_ERROR: 'VAL001',
    USER_EXISTS: 'VAL002',
    USER_MISSING: 'VAL003',
  },
} as const;

export type ErrorCode = ValueOf<ValueOf<typeof ERROR_CODES>>;

/**
 * Centralized default error messages for the app.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH001: 'Provided credentials are invalid',
  AUTH002: 'Provided password is wrong',
  AUTH003: 'Invalid or expired token',
  AUTH004: 'Token no longer exists',
  AUTH005: 'You must be logged in to perform this action',

  SER001: 'Something went wrong',
  SER002: 'Resource not found',
  SER003: 'You do not have permissions to perform this action',

  VAL001: 'One or more fields failed validation',
  VAL002: 'User with this email or username already exists',
  VAL003: 'Provided user does not exist',
};

/**
 * Centralized http status codes for errors
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  AUTH001: StatusCodes.UNAUTHORIZED,
  AUTH002: StatusCodes.UNAUTHORIZED,
  AUTH003: StatusCodes.UNAUTHORIZED,
  AUTH004: StatusCodes.NOT_FOUND,
  AUTH005: StatusCodes.UNAUTHORIZED,

  SER001: StatusCodes.INTERNAL_SERVER_ERROR,
  SER002: StatusCodes.NOT_FOUND,
  SER003: StatusCodes.FORBIDDEN,

  VAL001: StatusCodes.BAD_REQUEST,
  VAL002: StatusCodes.CONFLICT,
  VAL003: StatusCodes.BAD_REQUEST,
};
