import { ErrorResponse } from './error-response.js';
import { SuccessResponse } from './success-response.js';

export type BaseResponse<payload = object> =
  | SuccessResponse<payload>
  | ErrorResponse;
