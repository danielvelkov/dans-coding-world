import { ValidationError } from 'class-validator';
import { ValidationErrorDetails } from '../types/validation-error-details.type.js';

export const createValidationErrorDetailsList = (
  errors: ValidationError[]
): ValidationErrorDetails[] => {
  return errors.map((error) => ({
    property: error.property,
    constraints: error.constraints ?? {},
  }));
};
