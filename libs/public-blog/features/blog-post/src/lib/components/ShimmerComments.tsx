import styled from 'styled-components';

const StyledShimmeringComment = styled.article<React.ComponentProps<'article'>>`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 1rem;
  margin-bottom: 2rem;
  display: flex;
  gap: 1em;

  .avatar {
    height: 2em;
    width: 2em;
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
    width: 50px;
    height: 15px;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.shimmer.base} 0%,
      ${({ theme }) => theme.shimmer.highlight} 50%,
      ${({ theme }) => theme.shimmer.base} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2.5s infinite;
    border-radius: 4px;
  }

  .comment-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1em;
  }

  .line:first-of-type {
    width: 40%;
  }

  .line:nth-of-type(2) {
    width: 90%;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

export const ShimmerComments = ({ count }: { count: number }) => (
  <div role="status" aria-live="polite">
    <span style={{ position: 'absolute', left: '-9999px' }}>
      Loading comments…
    </span>
    <div aria-hidden="true" style={{ marginTop: '2em;' }}>
      {Array.from({ length: count }).map((_, i) => (
        <StyledShimmeringComment key={i}>
          <span className="avatar"></span>
          <div className="comment-details">
            <div className="line"></div>
            <div className="line"></div>
          </div>
        </StyledShimmeringComment>
      ))}
    </div>
  </div>
);
