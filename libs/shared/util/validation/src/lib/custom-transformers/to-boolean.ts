import { Transform } from 'class-transformer';
/**
 * Custom transformer for boolean strings
 */
export const ToBoolean = () => {
  return Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  });
};
