import {
  Modal,
  Button,
  LoadingSpinner,
} from '@dans-coding-world/public-blog-ui-common';
import { FieldErrorText } from '@dans-coding-world/public-blog-ui-form';
import styled from 'styled-components';

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2em;
`;

interface DeleteConfirmModalProps {
  isPending: boolean;
  error?: { message: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  isPending,
  error,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <Modal open modalTitle="Confirm Delete" onClose={onCancel}>
      <StyledModalContent>
        <p>Are you sure you want to delete this comment?</p>

        {error && (
          <FieldErrorText>
            <span data-testid="error-message">{error.message}</span>
          </FieldErrorText>
        )}

        <div style={{ display: 'flex', gap: '1em' }}>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? <LoadingSpinner /> : 'Yes'}
          </Button>
          <Button onClick={onCancel}>No</Button>
        </div>
      </StyledModalContent>
    </Modal>
  );
}
