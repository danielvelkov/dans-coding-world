import { ValidationError } from 'class-validator';
import { ValidationErrorDetails } from '../types/validation-error-details.type.js';

export const createValidationErrorDetailsList = (
  errors: ValidationError[]
): ValidationErrorDetails[] => {
  return errors.map((error) => {
    const childrenDetails =
      error.children && error.children.length > 0
        ? createValidationErrorDetailsList(error.children)
        : undefined;

    const constraints = error.constraints;

    const errorDetail: ValidationErrorDetails = {
      field: error.property,
    } as any;

    if (childrenDetails && childrenDetails.length > 0) {
      errorDetail.children = childrenDetails;
    }

    if (constraints && Object.keys(constraints).length > 0) {
      errorDetail.constraints = constraints;
    }

    return errorDetail;
  });
};
