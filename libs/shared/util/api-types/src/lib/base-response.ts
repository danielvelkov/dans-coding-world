import { ResponseErrorDetails } from './response-error-details.js';

export interface BaseResponse<payload = object> {
  success: boolean;
  data: payload | null;
  error: ResponseErrorDetails | null;
}
