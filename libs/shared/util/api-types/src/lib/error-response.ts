import { ResponseErrorDetails } from './response-error-details.js';

export interface ErrorResponse {
  success: false;
  data: null;
  error: ResponseErrorDetails;
}
