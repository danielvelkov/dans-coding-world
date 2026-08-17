import { BaseResponse } from '@dans-coding-world/api-types';
import { ValidationErrorDetails } from '@dans-coding-world/api-exceptions';

export function getValidationErrorDetails(
  error: BaseResponse['error'],
): ValidationErrorDetails[] {
  const details = error?.details;

  if (Array.isArray(details))
    return details.map((ed) => ({
      ...ed,
    }));
  else return [{ ...details }];
}
