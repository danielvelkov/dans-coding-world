import styled from 'styled-components';
import { StyledUnorderedList } from './PostList';

const StyledShimmeringPost = styled.article<React.ComponentProps<'article'>>`
  position: relative;
  padding: 1em;
  background: ${({ theme }) => theme.background.surface};
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;

  .line {
    height: 20px;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.background.surface} 0%,
      ${({ theme }) => theme.background.inverse} 50%,
      ${({ theme }) => theme.background.surface} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2.5s infinite;
    margin: 15px 0;
    border-radius: 4px;
  }

  .line:first-of-type {
    width: 40%;
  }

  .line:nth-of-type(2) {
    width: 70%;
  }

  .line:nth-of-type(3) {
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

export const ShimmerList = ({ count }: { count: number }) => (
  <StyledUnorderedList role="status" aria-live="polite">
    <span style={{ position: 'absolute', left: '-9999px' }}>
      Loading posts…
    </span>
    <div aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <StyledShimmeringPost key={i}>
          <div className="line"></div>
          <div className="line"></div>
          <div className="line"></div>
        </StyledShimmeringPost>
      ))}
    </div>
  </StyledUnorderedList>
);
