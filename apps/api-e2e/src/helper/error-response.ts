export const createErrorResponse = (statusCode: number, message?: string) => ({
  response: {
    status: statusCode,
    data: {
      error: {
        message,
      },
    },
  },
});
