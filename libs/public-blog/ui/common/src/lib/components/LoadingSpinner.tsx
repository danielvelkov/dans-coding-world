import styled from 'styled-components';

const StyledSpinner = styled.div`
  position: relative;
  aspect-ratio: 1/1;
  height: 20px;

  .background,
  .spinning-object {
    box-sizing: border-box;
    height: 100%;
    position: absolute;
    aspect-ratio: 1/1;
    border-radius: 50%;
  }
  .background {
    border: solid 5px ${({ theme }) => theme.border.primary};
  }
  .spinning-object {
    border: solid 5px ${({ theme }) => theme.shimmer.base};
    border-top: solid 5px ${({ theme }) => theme.shimmer.highlight};
    animation: spinning cubic-bezier(0.54, 0.14, 0.42, 0.89) 1.5s infinite;
  }

  @keyframes spinning {
    100% {
      transform: rotate(-1turn);
    }
  }
`;

export function LoadingSpinner() {
  return (
    <StyledSpinner>
      <div className="background"></div>
      <div className="spinning-object"></div>
    </StyledSpinner>
  );
}

export default LoadingSpinner;
