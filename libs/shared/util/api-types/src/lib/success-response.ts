export interface SuccessResponse<payload = object> {
  success: true;
  data: payload;
  error: null;
}
