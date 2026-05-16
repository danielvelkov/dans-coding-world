import {
  useCreateComment,
  useEditComment,
} from '@dans-coding-world/public-blog-shared-hooks';
import { createContext } from 'react';

export const CommentContext = createContext<CommentContextValue | null>(null);

export type CommentContextValue = {
  selectedCommentForEditId: number | null;
  setSelectedCommentForEditId: (id: number | null) => void;

  selectedCommentForReplyId: number | null;
  setSelectedCommentForReplyId: (id: number | null) => void;

  onReplySubmit: (val: string) => void;
  isSubmittingReply: boolean;
  replyError: ReturnType<typeof useCreateComment>['error'];

  onEditSubmit: (val: string) => void;
  isSubmittingEdit: boolean;
  editError: ReturnType<typeof useEditComment>['error'];
  isEditSuccess: boolean;
  isCreateSuccess: boolean;
};
