import React, { useState } from 'react';
import {
  Button,
  LoadingSpinner,
  Modal,
} from '@dans-coding-world/public-blog-ui-common';
import { FieldErrorText } from '@dans-coding-world/public-blog-ui-form';
import styled from 'styled-components';

const REPORT_REASONS = [
  'Inappropriate comment',
  'Spam',
  'Harassment or abusive behavior',
  'Misinformation or misleading content',
];

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ReasonRow = styled.label<React.ComponentPropsWithoutRef<'label'>>`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const Actions = styled.div`
  display: flex;
  gap: 1em;
  align-self: center;
  margin-top: 1em;
`;

function ReportForm({
  error,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  error?: Error;
  isSubmitting: boolean;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<string | null>(null);

  return (
    <Form>
      <h3 style={{ margin: '.5em 0' }}>Select report reason:</h3>
      {REPORT_REASONS.map((r) => (
        <ReasonRow key={r}>
          <input
            type="checkbox"
            checked={reason === r}
            onChange={(e) => setReason(e.target.checked ? r : null)}
          />
          <span>{r}</span>
        </ReasonRow>
      ))}
      {error && (
        <FieldErrorText>
          <span data-testid="error-message">{error.message}</span>
        </FieldErrorText>
      )}
      <Actions>
        <Button disabled={!reason} onClick={() => reason && onSubmit(reason)}>
          {isSubmitting ? <LoadingSpinner /> : 'Submit'}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Actions>
    </Form>
  );
}

export function ReportCommentModal({
  error,
  isSubmitting,
  onSubmit,
  onClose,
}: {
  error?: Error;
  isSubmitting: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal open modalTitle="Report Comment" onClose={onClose}>
      <ReportForm
        error={error}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
