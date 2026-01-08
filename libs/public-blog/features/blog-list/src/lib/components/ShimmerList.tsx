import styled from 'styled-components';
import { StyledUnorderedList } from './PostList';

const StyledShimmeringPost = styled.article<React.ComponentProps<'article'>>`
  position: relative;
  padding: 1em;
  background: #f3f3f3;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;

  .line {
    height: 20px;
    background: #e0e0e0;
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

  .shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.6) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
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
          <div className="shimmer"></div>
        </StyledShimmeringPost>
      ))}
    </div>
  </StyledUnorderedList>
);
