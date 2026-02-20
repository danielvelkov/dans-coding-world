import React from 'react';
import styled from 'styled-components';

const StyledFilters = styled.div<React.ComponentPropsWithoutRef<'div'>>`
  .section {
    margin-top: 2rem;
  }

  .title,
  .pill,
  .line {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.background.surface} 0%,
      ${({ theme }) => theme.background.inverse} 50%,
      ${({ theme }) => theme.background.surface} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2.5s infinite;
    border-radius: 4px;
  }

  .title {
    width: 60%;
    height: 20px;
    margin-bottom: 0.75rem;
  }

  .pill {
    width: 50px;
    height: 18px;
    border-radius: 12px;
    margin-bottom: 0.5rem;
  }

  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
  }

  .line {
    width: 100%;
    height: 12px;
    margin-bottom: 0.5rem;
  }

  .divider {
    height: 1px;
    background: ${({ theme }) => theme.background.elevated};
    margin: 1rem 0;
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
export function ShimmerFilters() {
  return (
    <StyledFilters role="status" aria-live="polite">
      <span style={{ position: 'absolute', left: '-9999px' }}>
        Loading filters…
      </span>
      <div aria-hidden="true">
        <div className="section">
          <div className="title" />
          <div className="pills">
            <div className="pill" />
            <div className="pill" />
            <div className="pill" />
            <div className="pill" />
          </div>
        </div>
        <div className="divider" />
        <div className="section">
          <div className="title" />
          <div className="line" />
          <div className="line" />
        </div>
      </div>
    </StyledFilters>
  );
}
