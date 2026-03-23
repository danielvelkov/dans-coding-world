import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import GenericError from './GenericError';

export function ServerError() {
  return (
    <GenericError
      errorTitle={StatusCodes.INTERNAL_SERVER_ERROR.toString()}
      subtitle={ReasonPhrases.INTERNAL_SERVER_ERROR}
    ></GenericError>
  );
}

export default ServerError;
