import { ResponseErrorDetails } from '@dans-coding-world/api-types';

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
