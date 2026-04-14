import { isErrorDetailsResponse } from '@dans-coding-world/api-types';
import { getValidationErrorDetails } from '@dans-coding-world/validation';

export const getValidationErrors = <T extends string>(
  error: unknown,
  fields: T[]
): Partial<Record<T, string>> => {
  if (!isErrorDetailsResponse(error)) return {};

  const validationDetails = getValidationErrorDetails(error);

  return fields.reduce((acc, field) => {
    const detail = validationDetails.find((e) => e.field === field);
    if (detail) {
      acc[field] = Object.values(detail.constraints).join('\n');
    }
    return acc;
  }, {} as Partial<Record<T, string>>);
};
