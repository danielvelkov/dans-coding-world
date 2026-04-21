import styled from 'styled-components';

const StyledShimmeringProfile = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1em;
  align-items: center;
  padding: 1em;

  .avatar {
    height: 5em;
    width: 5em;
    border-radius: 50%;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.shimmer.base} 0%,
      ${({ theme }) => theme.shimmer.highlight} 50%,
      ${({ theme }) => theme.shimmer.base} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2.5s infinite;
  }

  .line {
    width: 90%;
    height: 15px;
    border-radius: 5px;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.shimmer.base} 0%,
      ${({ theme }) => theme.shimmer.highlight} 50%,
      ${({ theme }) => theme.shimmer.base} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2.5s infinite;
  }

  .line:nth-child(1) {
    height: 25px;
    width: 70%;
  }

  .line:nth-child(2) {
    height: 15px;
    width: 50%;
    margin: 1.5em 0;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
`;

export function ShimmerProfile() {
  return (
    <div role="status" aria-live="polite">
      <span style={{ position: 'absolute', left: '-9999px' }}>
        Loading profile…
      </span>
      <div aria-hidden="true">
        <StyledShimmeringProfile>
          <div className="avatar"></div>
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
        </StyledShimmeringProfile>
      </div>
    </div>
  );
}
