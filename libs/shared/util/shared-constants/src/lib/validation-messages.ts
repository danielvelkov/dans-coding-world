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
    weak: 'Password must contain at least 1 upper case, 1 number and 1 symbol',
  },
  username: {
    invalid:
      'Username can only include letters and numbers (no spaces or special characters)',
  },
  token: {
    invalid: 'Refresh token must be a valid JWT',
  },
};
