import { BaseResponse } from '../base-response.js';

export function isErrorResponse(data: unknown): data is BaseResponse['error'] {
  if (typeof data !== 'object' || data === null) return false;

  const d = data as Record<string, unknown>;

  return (
    typeof d.status === 'number' &&
    (d.errorCode === undefined || typeof d.errorCode === 'string') &&
    (d.message === undefined || typeof d.message === 'string') &&
    (d.developerMessage === undefined || typeof d.developerMessage === 'string')
  );
}
