import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@dans-coding-world/public-blog-ui-common';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';

const StyledNotFound = styled.main`
  display: flex;
  flex-direction: column;

  align-items: center;

  h1 {
    font-size: 6em;
    margin: 0;
    padding: 0;
  }
`;

const StyledLink = styled(Button)`
  text-decoration: none;
`;

export function NotFound() {
  return (
    <StyledNotFound>
      <h1>{StatusCodes.NOT_FOUND}</h1>
      <h2>{ReasonPhrases.NOT_FOUND}</h2>
      <StyledLink forwardedAs={Link} to={'/blog'}>
        Take me home
      </StyledLink>
    </StyledNotFound>
  );
}

export default NotFound;
