import {
  BaseResponse,
  ResponseErrorDetails,
} from '@dans-coding-world/api-types';

/**
 * This error is thrown on the frontend
 * when the API returns an BaseResponse with error field
 *
 * @see {@link BaseResponse}
 */
export class ApiError extends Error implements ResponseErrorDetails {
  constructor(
    public status: number,
    public override message: string,
    public errorCode?: string,
    public details?: object
  ) {
    super(message);
  }
}
