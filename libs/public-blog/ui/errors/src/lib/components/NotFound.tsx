import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@dans-coding-world/public-blog-ui-common';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import GenericError from './GenericError';

const StyledLink = styled(Button)`
  text-decoration: none;
`;

export function NotFound() {
  return (
    <GenericError
      errorTitle={StatusCodes.NOT_FOUND.toString()}
      subtitle={ReasonPhrases.NOT_FOUND}
    >
      <StyledLink forwardedAs={Link} to={'/blog'}>
        Take me home
      </StyledLink>
    </GenericError>
  );
}

export default NotFound;
