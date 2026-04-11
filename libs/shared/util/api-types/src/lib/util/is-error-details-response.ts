import { BaseResponse } from '../base-response.js';
import { isErrorResponse } from './is-error-response.js';

export function isErrorDetailsResponse(
  data: unknown
): data is BaseResponse['error'] {
  if (!isErrorResponse(data)) return false;

  const details = (data as any).details;

  if (details === null || details === undefined) return false;
  return true;
}
