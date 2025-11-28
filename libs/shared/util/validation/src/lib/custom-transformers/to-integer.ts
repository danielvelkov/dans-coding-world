import { Transform } from 'class-transformer';

/**
 * Custom transformer for safe integer transformation
 */
export const ToInteger = () => {
  return Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    // Reject everything other than string or number
    if (typeof value !== 'string' && typeof value !== 'number') {
      return NaN;
    }

    // Reject strings that aren't numeric
    if (typeof value === 'string' && !/^-?\d+$/.test(value.trim())) {
      return NaN;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : NaN;
  });
};
