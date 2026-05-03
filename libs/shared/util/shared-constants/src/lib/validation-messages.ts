/**
 * Centralized default messages for field validation errors
 */
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  minLength: (min: number) =>
    `This field must be at least ${min} characters long`,
  maxLength: (max: number) =>
    `This field must be no more than ${max} characters long`,
  email: {
    invalidEmail: 'Please enter a valid email address',
  },
  password: {
    weak: 'Password must contain at least 1 upper case, 1 lower case, 1 number and 1 symbol',
  },
  username: {
    invalid:
      'Username can only include letters and numbers (no spaces or special characters)',
  },
  pagination: {
    pageOffsetNotDivisibleByPageLimit:
      'Page offset must be divisible by page size',
  },
  posts: {
    membersOnly: 'Please login to read the blog',
  },
  tags: {
    invalid: 'A tag must only include lower case letters, numbers and hyphens',
  },
  reports: {
    sameStatus: 'Cannot update report to its current status',
  },
  token: {
    invalid: 'Refresh token must be a valid JWT',
  },
  users: {
    sameRole: 'Cannot promote/demote user to the same role',
  },
  name: 'For name only use letters (including accented), spaces, apostrophes, or hyphens.',
  allowedValues: (values: string[] | number[]) =>
    `Only the following values are allowed: ${values.join(', ')}`,
  allowedExtensions: (values: string[]) =>
    `Only the following file types are allowed: ${values.join(', ')}`,
};
