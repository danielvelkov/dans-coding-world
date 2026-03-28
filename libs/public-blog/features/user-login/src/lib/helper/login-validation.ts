import { isErrorDetailsResponse } from '@dans-coding-world/api-types';
import { getValidationErrorDetails } from '@dans-coding-world/validation';

export const getLoginValidationErrors = (
  error: unknown
): [emailValidationError?: string, passwordValidationError?: string] => {
  let emailError, passwordError;

  if (!isErrorDetailsResponse(error)) {
    return [emailError, passwordError];
  }

  const validationDetails = getValidationErrorDetails(error);

  const emailValidationErrorDetail = validationDetails.find(
    (e) => e.field === 'email'
  );
  const passwordValidationErrorDetail = validationDetails.find(
    (e) => e.field === 'password'
  );

  if (emailValidationErrorDetail)
    emailError = Object.values(emailValidationErrorDetail.constraints).join(
      '\n'
    );

  if (passwordValidationErrorDetail)
    passwordError = Object.values(
      passwordValidationErrorDetail.constraints
    ).join('\n');

  return [emailError, passwordError];
};
