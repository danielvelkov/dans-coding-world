import React, { useRef } from 'react';
import styled from 'styled-components';

const StyledDialog = styled.dialog<React.ComponentPropsWithRef<'dialog'>>`
  border: none;
  padding: 0;
  margin: 0;
  inset: 0;
  position: fixed;
  width: 100%;
  height: 100%;
  background: transparent;
  display: grid;
  place-items: center;

  &::backdrop {
    display: none;
  }
`;

const Backdrop = styled.div<React.ComponentPropsWithoutRef<'div'>>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
`;

const ModalWrapper = styled.div`
  position: relative;
  z-index: 10;
  display: grid;
  place-content: center;
  background-color: ${({ theme }) => theme.background.surface};
  color: ${({ theme }) => theme.text.primary};
  border-radius: 0.75rem;
`;

const ModalContent = styled.div<React.ComponentPropsWithoutRef<'div'>>`
  position: relative;
  width: 100%;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
`;

const Title = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
`;

const CloseButton = styled.button<React.ComponentPropsWithoutRef<'button'>>`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: none;
  background-color: ${({ theme }) => theme.background.elevated};
  font-size: 1rem;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    color: ${({ theme }) => theme.accent.hover};
  }
`;

type ModalProps = React.DialogHTMLAttributes<HTMLDialogElement> & {
  modalTitle?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
};

export function Modal({
  children,
  modalTitle = 'Modal Window',
  showCloseButton = true,
  onClose,
  ...rest
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const closeModal = () => {
    dialogRef.current?.close();
    onClose?.();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  return (
    <StyledDialog ref={dialogRef} {...rest}>
      <Backdrop onClick={handleBackdropClick} />

      <ModalWrapper>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <Title>{modalTitle}</Title>

          {showCloseButton && (
            <CloseButton onClick={closeModal} aria-label="Close dialog">
              <i className="fa fa-close"></i>
            </CloseButton>
          )}

          {children}
        </ModalContent>
      </ModalWrapper>
    </StyledDialog>
  );
}

export default Modal;
