import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@dans-coding-world/public-blog-ui-common';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import GenericError from './GenericError';

const StyledLink = styled(Button)`
  text-decoration: none;
`;

export function Forbidden({ reason }: { reason?: string }) {
  return (
    <GenericError
      errorTitle={StatusCodes.FORBIDDEN.toString()}
      subtitle={ReasonPhrases.FORBIDDEN}
    >
      <p style={{ padding: '1em', fontSize: 'large' }}>
        {reason ?? `You tried to do something you shouldn't.`}
      </p>
      <StyledLink forwardedAs={Link} to={'/blog'}>
        Ok, take me back
      </StyledLink>
    </GenericError>
  );
}

export default Forbidden;
