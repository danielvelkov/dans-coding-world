import { isErrorResponse } from '@dans-coding-world/api-types';
import { Button } from '@dans-coding-world/public-blog-ui-common';
import {
  Forbidden,
  GenericError,
  NotFound,
  ServerError,
} from '@dans-coding-world/public-blog-ui-errors';
import { StatusCodes } from 'http-status-codes';
import { getErrorMessage, type FallbackProps } from 'react-error-boundary';
import { Navigate } from 'react-router-dom';

export function Fallback({ error, resetErrorBoundary }: FallbackProps) {
  if (error && isErrorResponse(error)) {
    const message = getErrorMessage(error);

    switch (error.status) {
      case StatusCodes.NOT_FOUND:
        return <NotFound />;
      case StatusCodes.FORBIDDEN:
        return <Forbidden reason={message} />;
      case StatusCodes.UNAUTHORIZED:
        return <Navigate to="/login" replace />;
      case StatusCodes.INTERNAL_SERVER_ERROR:
        return <ServerError />;
    }
  }

  return (
    <GenericError errorTitle={'Oops'} subtitle={'Something went wrong'}>
      <Button onClick={resetErrorBoundary}>Retry</Button>
    </GenericError>
  );
}
