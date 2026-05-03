import styled, { keyframes, css } from 'styled-components';
import { createPortal } from 'react-dom';
import { LoadingSpinner } from '@dans-coding-world/public-blog-ui-common';
import React from 'react';

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const Overlay = styled.div<
  React.ComponentPropsWithoutRef<'div'> & { $visible: boolean }
>`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: ${({ theme }) => theme.background.base};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? 'all' : 'none')};
  transition: opacity 0.3s ease;
  animation: ${({ $visible }) =>
    $visible
      ? css`
          ${fadeIn} 0.2s ease forwards
        `
      : 'none'};
`;

const SpinnerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`;

const LargeSpinner = styled(LoadingSpinner)`
  height: 48px;

  .background,
  .spinning-object {
    border-width: 6px;
  }
`;

const LoadingText = styled.p`
  color: ${({ theme }) => theme.text.secondary};
  margin: 0;
`;

export function GlobalLoadingOverlay({
  visible,
  message = 'Loading...',
}: {
  visible: boolean;
  message?: string;
}) {
  return createPortal(
    <Overlay
      $visible={visible}
      aria-hidden={!visible}
      role="status"
      aria-live="polite"
    >
      <SpinnerWrapper>
        <LargeSpinner />
        {message && <LoadingText>{message}</LoadingText>}
      </SpinnerWrapper>
    </Overlay>,
    document.body
  );
}

export default GlobalLoadingOverlay;
