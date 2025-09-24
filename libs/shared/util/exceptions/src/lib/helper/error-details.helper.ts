import { ValidationError } from 'class-validator';

export const createValidationErrorDetails = (errors: ValidationError[]) => {
  return errors.map((error) => ({
    property: error.property,
    constraints: error.constraints ?? {},
  }));
};
