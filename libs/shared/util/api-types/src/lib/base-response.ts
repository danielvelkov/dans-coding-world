import { ResponseErrorDetails } from './response-error-details.js';

export interface BaseResponse {
  success: boolean;
  data: object | null;
  error: ResponseErrorDetails | null;
}
