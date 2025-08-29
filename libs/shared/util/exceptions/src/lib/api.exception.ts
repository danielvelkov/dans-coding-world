import {
  ERROR_MESSAGES,
  ErrorCode,
  ERROR_HTTP_STATUS,
} from '@dans-coding-world/shared-constants';

class ApiException<D> {
  public readonly details: D | null;
  public readonly errorCode: ErrorCode;
  public readonly message: string;
  public readonly statusCode: number;

  constructor(errorCode: ErrorCode, customMessage?: string, details?: D) {
    this.errorCode = errorCode;
    this.details = details ?? null;
    this.message =
      customMessage ??
      ERROR_MESSAGES[errorCode] ??
      'Unhandled server exception.';
    this.statusCode = ERROR_HTTP_STATUS[errorCode] || 500;
  }
}

export default ApiException;
